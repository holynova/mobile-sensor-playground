/**
 * Scene: 3D Pose Cube (WebGL with Three.js)
 * Rendered at low resolution 0.25 scale for pixel-art visual.
 */
import * as THREE from 'three';
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let cubeGroup = null;

let curX = -0.3;
let curY = 0.4;
let curZ = 0;
const lerpFactor = 0.12;
const renderScale = 0.25; // 4x pixelation

export function initCube() {
    canvas = document.getElementById('canvas-cube');
    if (!canvas) return;
    
    if (renderer) {
        resizeCube();
        return;
    }

    container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Create Scene
    scene = new THREE.Scene();
    scene.background = null;

    // 2. Create Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6;

    // 3. Create WebGL Renderer (No antialiasing)
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,
        alpha: true
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width * renderScale, height * renderScale, false);

    // 4. Create Geometries (Pixelated wireframe body)
    cubeGroup = new THREE.Group();

    const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const material = new THREE.MeshStandardMaterial({
        color: 0x101420,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.65,
        flatShading: true
    });
    const bodyMesh = new THREE.Mesh(geometry, material);
    cubeGroup.add(bodyMesh);

    // Highlight Orange Edges (thicker looking due to low resolution)
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({
        color: 0xff6b00,
        linewidth: 2
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    cubeGroup.add(wireframe);

    // Axis grid inside
    const innerGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const innerEdges = new THREE.EdgesGeometry(innerGeo);
    const innerLineMat = new THREE.LineBasicMaterial({
        color: 0x263045,
        linewidth: 1
    });
    const innerWireframe = new THREE.LineSegments(innerEdges, innerLineMat);
    cubeGroup.add(innerWireframe);

    scene.add(cubeGroup);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    window.addEventListener('resize', resizeCube);
}

function resizeCube() {
    if (!renderer || !container || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width * renderScale, height * renderScale, false);
}

export function tickCube(timestamp) {
    if (!renderer || !scene || !camera || !cubeGroup) return;

    if (sensorState.isSimulated) {
        sensorState.alpha = (sensorState.alpha + 0.3) % 360;
    }

    const targetX = (-sensorState.beta - 20) * Math.PI / 180;
    const targetY = (sensorState.gamma + 25) * Math.PI / 180;
    const targetZ = (sensorState.alpha) * Math.PI / 180;

    curX += (targetX - curX) * lerpFactor;
    curY += (targetY - curY) * lerpFactor;

    let diffZ = targetZ - curZ;
    if (diffZ > Math.PI) diffZ -= Math.PI * 2;
    if (diffZ < -Math.PI) diffZ += Math.PI * 2;
    curZ = (curZ + diffZ * lerpFactor + Math.PI * 2) % (Math.PI * 2);

    cubeGroup.rotation.x = curX;
    cubeGroup.rotation.y = curY;
    cubeGroup.rotation.z = curZ;

    renderer.render(scene, camera);
}
