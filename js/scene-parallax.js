/**
 * Scene: 3D Camera Parallax (WebGL with Three.js)
 * Spaces out flat texture planes along the Z-axis in a 3D scene.
 * Translates the PerspectiveCamera in X/Y based on tilt to create natural stereoscopic depth.
 */
import * as THREE from 'three';
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;

let refBeta = 0;
let refGamma = 0;
let hasCalibrated = false;

let curDeltaX = 0;
let curDeltaY = 0;
const lerpFactor = 0.08;

// SVG assets inlined as XML strings
const skySvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#0f172a" />
    <line x1="0" y1="150" x2="800" y2="150" stroke="#1e293b" stroke-width="1.5" />
    <line x1="0" y1="300" x2="800" y2="300" stroke="#1e293b" stroke-width="1.5" />
    <line x1="0" y1="450" x2="800" y2="450" stroke="#1e293b" stroke-width="1.5" />
    <line x1="200" y1="0" x2="200" y2="600" stroke="#1e293b" stroke-width="1.5" />
    <line x1="400" y1="0" x2="400" y2="600" stroke="#1e293b" stroke-width="1.5" />
    <line x1="600" y1="0" x2="600" y2="600" stroke="#1e293b" stroke-width="1.5" />
</svg>`;

const dialSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <circle cx="80" cy="80" r="70" fill="none" stroke="#202838" stroke-width="2" stroke-dasharray="6,6" />
    <circle cx="80" cy="80" r="30" fill="none" stroke="#ff6b00" stroke-width="3" />
    <line x1="80" y1="10" x2="80" y2="150" stroke="rgba(96, 116, 139, 0.15)" stroke-width="1" />
    <line x1="10" y1="80" x2="150" y2="80" stroke="rgba(96, 116, 139, 0.15)" stroke-width="1" />
</svg>`;

const mountainBackSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
    <path d="M -50 480 L 180 340 L 320 490 L 460 310 L 680 520 L 850 440 L 850 600 L -50 600 Z" fill="#1e293b"/>
    <path d="M -50 480 L 180 340 L 320 490 L 460 310 L 680 520 L 850 440" fill="none" stroke="#475569" stroke-width="2"/>
</svg>`;

const mountainMidSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
    <path d="M -50 520 L 240 410 L 430 530 L 580 400 L 850 540 L 850 600 L -50 600 Z" fill="#0f172a"/>
    <path d="M -50 520 L 240 410 L 430 530 L 580 400 L 850 540" fill="none" stroke="#64748b" stroke-width="2"/>
</svg>`;

const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
    <path d="M -50 540 C 150 540, 250 510, 450 550 C 650 590, 750 530, 850 555 L 850 600 L -50 600 Z" fill="#020617" stroke="#ff6b00" stroke-width="3.5"/>
    <line x1="50" y1="542" x2="50" y2="560" stroke="#475569" stroke-width="2" />
    <line x1="150" y1="540" x2="150" y2="560" stroke="#475569" stroke-width="2" />
    <line x1="250" y1="535" x2="250" y2="560" stroke="#475569" stroke-width="2" />
    <line x1="350" y1="540" x2="350" y2="560" stroke="#475569" stroke-width="2" />
    <line x1="450" y1="550" x2="450" y2="570" stroke="#ff6b00" stroke-width="2.5" />
    <line x1="550" y1="560" x2="550" y2="580" stroke="#475569" stroke-width="2" />
    <line x1="650" y1="560" x2="650" y2="580" stroke="#475569" stroke-width="2" />
    <line x1="750" y1="555" x2="750" y2="580" stroke="#475569" stroke-width="2" />
</svg>`;

// Convert inline SVG string to HTML Image then to WebGL texture
function createSvgTexture(svgString) {
    const img = new Image();
    const texture = new THREE.Texture(img);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    img.onload = () => {
        texture.needsUpdate = true;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString.trim());
    return texture;
}

export function initParallax() {
    canvas = document.getElementById('canvas-parallax');
    if (!canvas) return;

    // Reset calibration state
    hasCalibrated = false;
    refBeta = 0;
    refGamma = 0;
    curDeltaX = 0;
    curDeltaY = 0;

    if (renderer) {
        resizeParallax();
        return;
    }

    container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090c13);

    // 2. Create Perspective Camera
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    // Position camera at center
    camera.position.set(0, 0, 4.2);

    // 3. Create WebGL Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);

    // 4. Create Planes at spaced out Z-depths
    // To prevent edge gaps when camera pans, we size further layers slightly larger
    
    // Layer 0: Sky (Z = -4.0)
    const skyTex = createSvgTexture(skySvg);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false });
    const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), skyMat);
    skyMesh.position.set(0, 0, -4.0);
    scene.add(skyMesh);

    // Layer 1: Dial / Moon (Z = -2.5)
    const dialTex = createSvgTexture(dialSvg);
    const dialMat = new THREE.MeshBasicMaterial({ map: dialTex, transparent: true, depthWrite: false });
    const dialMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), dialMat);
    dialMesh.position.set(0, 0.8, -2.5); // shift up slightly
    scene.add(dialMesh);

    // Layer 2: Mountain Back (Z = -1.5)
    const mountBackTex = createSvgTexture(mountainBackSvg);
    const mountBackMat = new THREE.MeshBasicMaterial({ map: mountBackTex, transparent: true, depthWrite: false });
    const mountBackMesh = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 6.75), mountBackMat);
    mountBackMesh.position.set(0, -0.3, -1.5);
    scene.add(mountBackMesh);

    // Layer 3: Mountain Mid (Z = -0.5)
    const mountMidTex = createSvgTexture(mountainMidSvg);
    const mountMidMat = new THREE.MeshBasicMaterial({ map: mountMidTex, transparent: true, depthWrite: false });
    const mountMidMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 5.85), mountMidMat);
    mountMidMesh.position.set(0, -0.4, -0.5);
    scene.add(mountMidMesh);

    // Layer 4: Foreground (Z = 0.5)
    const foreTex = createSvgTexture(foregroundSvg);
    const foreMat = new THREE.MeshBasicMaterial({ map: foreTex, transparent: true, depthWrite: false });
    const foreMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 4.95), foreMat);
    foreMesh.position.set(0, -0.5, 0.5);
    scene.add(foreMesh);

    window.addEventListener('resize', resizeParallax);
}

export function resizeParallax() {
    if (!renderer || !container || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

export function tickParallax(timestamp) {
    if (!renderer || !scene || !camera) return;

    // Run calibration on first active frames
    if (!hasCalibrated) {
        if (sensorState.beta !== 0 || sensorState.gamma !== 0) {
            refBeta = sensorState.beta;
            refGamma = sensorState.gamma;
            hasCalibrated = true;
        } else {
            refBeta = 0;
            refGamma = 0;
            hasCalibrated = true;
        }
    }

    // Deltas
    let deltaX = sensorState.gamma - refGamma;
    let deltaY = sensorState.beta - refBeta;

    // Clamp
    deltaX = Math.max(-30, Math.min(30, deltaX));
    deltaY = Math.max(-30, Math.min(30, deltaY));

    // Smooth Lerp
    curDeltaX += (deltaX - curDeltaX) * lerpFactor;
    curDeltaY += (deltaY - curDeltaY) * lerpFactor;

    // Convert tilt to camera position adjustments
    // Moving the camera physically left/right and up/down
    camera.position.x = curDeltaX * 0.024;
    camera.position.y = curDeltaY * 0.024;

    // Ensure camera locks looking at the center of the far planes
    camera.lookAt(0, 0, -2.0);

    // Render WebGL frame
    renderer.render(scene, camera);
}
