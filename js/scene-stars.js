/**
 * Scene: 3D Celestial Star Map & Compass Dome (WebGL with Three.js)
 * Pixelated retro downscaling (0.25 scale).
 * Camera orientation bound to absolute alpha/beta/gamma sensor angles.
 */
import * as THREE from 'three';
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let compassDial = null;

const renderScale = 0.25;

export function initStars() {
    canvas = document.getElementById('canvas-stars');
    if (!canvas) return;

    if (renderer) {
        resizeStars();
        return;
    }

    container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a0f);

    // 2. Create Camera
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    // Camera is positioned at center of star dome
    camera.position.set(0, 0, 0);

    // 3. WebGL Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setPixelRatio(1);
    renderer.setSize(width * renderScale, height * renderScale, false);

    // 4. Construct 400 Star Particles (Distributed on sphere radius 8)
    const starCount = 450;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 9.0; // sphere radius

        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xd8e2f0,
        size: 0.08,
        sizeAttenuation: true
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 5. Create Compass Overlay Dial
    compassDial = new THREE.Group();

    // Concentric horizontal target rings (lying on Y = -1.5 plane)
    const ringGeo = new THREE.RingGeometry(1.6, 1.62, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x202838, side: THREE.DoubleSide });
    
    const outerRing = new THREE.Mesh(ringGeo, ringMat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = -1.2;
    compassDial.add(outerRing);

    const innerRingGeo = new THREE.RingGeometry(0.8, 0.81, 24);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xff6b00, side: THREE.DoubleSide });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = -1.2;
    compassDial.add(innerRing);

    // Crosshairs lines on compass floor
    const lineMat = new THREE.LineBasicMaterial({ color: 0x202838 });
    const pointsX = [new THREE.Vector3(-1.6, -1.2, 0), new THREE.Vector3(1.6, -1.2, 0)];
    const lineX = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsX), lineMat);
    compassDial.add(lineX);

    const pointsZ = [new THREE.Vector3(0, -1.2, -1.6), new THREE.Vector3(0, -1.2, 1.6)];
    const lineZ = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsZ), lineMat);
    compassDial.add(lineZ);

    // North Needle Indicator (Signal Orange cone)
    const coneGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xff6b00 });
    const needle = new THREE.Mesh(coneGeo, coneMat);
    needle.position.set(0, -1.2, -1.4); // Points North (-Z direction)
    needle.rotation.x = Math.PI / 2;
    compassDial.add(needle);

    // West/East letters represented as pixel boxes
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    
    // East (+X)
    const markerE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), markerMat);
    markerE.position.set(1.4, -1.2, 0);
    compassDial.add(markerE);

    // West (-X)
    const markerW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), markerMat);
    markerW.position.set(-1.4, -1.2, 0);
    compassDial.add(markerW);

    scene.add(compassDial);

    window.addEventListener('resize', resizeStars);
}

export function resizeStars() {
    if (!renderer || !container || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width * renderScale, height * renderScale, false);
}

export function tickStars(timestamp) {
    if (!renderer || !scene || !camera) return;

    // Convert angles to radians
    const radAlpha = (sensorState.alpha * Math.PI) / 180;
    const radBeta = (sensorState.beta * Math.PI) / 180;
    const radGamma = (sensorState.gamma * Math.PI) / 180;

    // W3C Standard Euler sequence order is Z, then X, then Y (Z-X'-Y'')
    // In Three.js, this maps to 'YXZ' rotation order
    // Note: Invert alpha to rotate matching standard compass direction
    const euler = new THREE.Euler(radBeta, radGamma, -radAlpha, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    renderer.render(scene, camera);
}
