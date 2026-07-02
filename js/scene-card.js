/**
 * Scene: 3D Holographic Specular Card (WebGL with Three.js)
 * Pixelated retro downscaling (0.25 scale) with disabled antialiasing.
 * Specular lights dynamically shift normal positions based on phone tilt.
 */
import * as THREE from 'three';
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let cardGroup = null;
let orangeLight = null;
let cyanLight = null;

let curX = 0;
let curY = 0;
const lerpFactor = 0.10;
const renderScale = 0.25; // 4x pixelation

export function initCard() {
    canvas = document.getElementById('canvas-card');
    if (!canvas) return;

    if (renderer) {
        resizeCard();
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
    camera.position.z = 5.2;

    // 3. Create WebGL Renderer (No antialiasing, transparent alpha)
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false,
        alpha: true
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width * renderScale, height * renderScale, false);

    // 4. Create Holographic Card Group
    cardGroup = new THREE.Group();

    // 4a. Flat Card Plate Mesh (Highly metallic, low roughness for gloss specular)
    const cardGeo = new THREE.PlaneGeometry(2.1, 3.2);
    const cardMat = new THREE.MeshStandardMaterial({
        color: 0x090c14,
        roughness: 0.08,
        metalness: 0.95,
        side: THREE.DoubleSide
    });
    const cardPlate = new THREE.Mesh(cardGeo, cardMat);
    cardGroup.add(cardPlate);

    // 4b. Card Blocky Edges (Orange border outline)
    const edgeGeo = new THREE.BoxGeometry(2.14, 3.24, 0.04);
    const edgeEdges = new THREE.EdgesGeometry(edgeGeo);
    const edgeLine = new THREE.LineSegments(
        edgeEdges,
        new THREE.LineBasicMaterial({ color: 0xff6b00, linewidth: 2 })
    );
    cardGroup.add(edgeLine);

    // 4c. Geometric laser grid inside card
    const gridLinesGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1c2538 });
    
    // Vertical grid lines on card face
    for (let x = -0.9; x <= 0.9; x += 0.3) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, -1.4, 0.01),
            new THREE.Vector3(x, 1.4, 0.01)
        ]);
        gridLinesGroup.add(new THREE.Line(lineGeo, lineMat));
    }
    // Horizontal grid lines on card face
    for (let y = -1.2; y <= 1.2; y += 0.3) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-0.9, y, 0.01),
            new THREE.Vector3(0.9, y, 0.01)
        ]);
        gridLinesGroup.add(new THREE.Line(lineGeo, lineMat));
    }
    cardGroup.add(gridLinesGroup);

    // 4d. Central Shiny Hologram Icon (small orange diamond)
    const iconGeo = new THREE.ConeGeometry(0.35, 0.5, 4);
    const iconMat = new THREE.MeshStandardMaterial({
        color: 0xff6b00,
        roughness: 0.1,
        metalness: 0.8,
        flatShading: true
    });
    const iconMesh = new THREE.Mesh(iconGeo, iconMat);
    iconMesh.position.set(0, 0, 0.08);
    iconMesh.rotation.x = Math.PI / 2;
    cardGroup.add(iconMesh);

    scene.add(cardGroup);

    // 5. Add dynamic Specular Lights that move with tilting
    // Ambient light to keep dark details visible
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);

    // Orange Specular light
    orangeLight = new THREE.PointLight(0xff6b00, 3.5, 8.0);
    orangeLight.position.set(0, 3, 2.5);
    scene.add(orangeLight);

    // Cyan Specular light
    cyanLight = new THREE.PointLight(0x00e5ff, 3.5, 8.0);
    cyanLight.position.set(0, -3, 2.5);
    scene.add(cyanLight);

    // White core light to highlight center
    const whiteLight = new THREE.DirectionalLight(0xffffff, 0.7);
    whiteLight.position.set(0, 0, 4);
    scene.add(whiteLight);

    window.addEventListener('resize', resizeCard);
}

export function resizeCard() {
    if (!renderer || !container || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width * renderScale, height * renderScale, false);
}

export function tickCard(timestamp) {
    if (!renderer || !scene || !camera || !cardGroup) return;

    // Convert tilt angles to target rotations (subtle card tilt angles)
    const targetX = (-sensorState.beta) * 0.45 * Math.PI / 180;
    const targetY = (sensorState.gamma) * 0.45 * Math.PI / 180;

    curX += (targetX - curX) * lerpFactor;
    curY += (targetY - curY) * lerpFactor;

    // Apply rotation to card mesh
    cardGroup.rotation.x = curX;
    cardGroup.rotation.y = curY;

    // Dynamic light movement based on phone tilt to sweep specular highlights
    const radGamma = (sensorState.gamma * Math.PI) / 180;
    const radBeta = (sensorState.beta * Math.PI) / 180;

    // Move lights across X/Y axis in opposite directions to create shearing sheen
    const lightShiftX = Math.sin(radGamma) * 3.5;
    const lightShiftY = Math.sin(radBeta) * 3.5;

    if (orangeLight && cyanLight) {
        orangeLight.position.x = lightShiftX;
        orangeLight.position.y = 2.0 + lightShiftY;
        
        cyanLight.position.x = -lightShiftX;
        cyanLight.position.y = -2.0 - lightShiftY;
    }

    renderer.render(scene, camera);
}
