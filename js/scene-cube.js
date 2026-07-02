/**
 * Scene: 3D Pose Cube (WebGL with Three.js)
 * Displays a rotating wireframe box inside a WebGL rendering context.
 */
import * as THREE from 'three';
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let cubeGroup = null;

let curX = -0.3; // Initial rotation offsets in radians
let curY = 0.4;
let curZ = 0;
const lerpFactor = 0.12;

export function initCube() {
    canvas = document.getElementById('canvas-cube');
    if (!canvas) return;
    
    // Only initialize Three.js components once
    if (renderer) {
        resizeCube();
        return;
    }

    container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Create Scene
    scene = new THREE.Scene();
    scene.background = null; // transparent background

    // 2. Create Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6;

    // 3. Create WebGL Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);

    // 4. Create Geometries and Materials (Instrument Wireframe Box)
    cubeGroup = new THREE.Group();

    // Semi-translucent body
    const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const material = new THREE.MeshStandardMaterial({
        color: 0x101420,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
    });
    const bodyMesh = new THREE.Mesh(geometry, material);
    cubeGroup.add(bodyMesh);

    // Highlight Orange Edges
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({
        color: 0xff6b00,
        linewidth: 2 // Note: linewidth is usually 1 on Windows browsers due to WebGL limitations, but edges look clean
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    cubeGroup.add(wireframe);

    // Minor decorative inner axis wireframe
    const innerGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const innerEdges = new THREE.EdgesGeometry(innerGeo);
    const innerLineMat = new THREE.LineBasicMaterial({
        color: 0x3d4960,
        linewidth: 1
    });
    const innerWireframe = new THREE.LineSegments(innerEdges, innerLineMat);
    cubeGroup.add(innerWireframe);

    scene.add(cubeGroup);

    // 5. Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff6b00, 0.4);
    dirLight2.position.set(-5, -5, -2);
    scene.add(dirLight2);

    // Handle resizing
    window.addEventListener('resize', resizeCube);
}

function resizeCube() {
    if (!renderer || !container || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

export function tickCube(timestamp) {
    if (!renderer || !scene || !camera || !cubeGroup) return;

    // Auto-spin simulated Alpha yaw when in simulation mode
    if (sensorState.isSimulated) {
        sensorState.alpha = (sensorState.alpha + 0.3) % 360;
    }

    // Map degree orientations to target radians
    const targetX = (-sensorState.beta - 20) * Math.PI / 180;
    const targetY = (sensorState.gamma + 25) * Math.PI / 180;
    const targetZ = (sensorState.alpha) * Math.PI / 180;

    // Smooth rotations with Lerp
    curX += (targetX - curX) * lerpFactor;
    curY += (targetY - curY) * lerpFactor;

    // Alpha angle wrapping protection
    let diffZ = targetZ - curZ;
    if (diffZ > Math.PI) diffZ -= Math.PI * 2;
    if (diffZ < -Math.PI) diffZ += Math.PI * 2;
    curZ = (curZ + diffZ * lerpFactor + Math.PI * 2) % (Math.PI * 2);

    // Apply rotation matrices
    cubeGroup.rotation.x = curX;
    cubeGroup.rotation.y = curY;
    cubeGroup.rotation.z = curZ;

    // Render frame
    renderer.render(scene, camera);
}
