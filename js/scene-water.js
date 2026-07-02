/**
 * Scene: 3D Fluid Particles (WebGL with Three.js)
 * Pixelated retro rendering (0.25 scale buffer, antialias: false).
 * Fixes mobile Y gravity inversion.
 */
import * as THREE from 'three';
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let particles = [];
let boundaryBox = null;

const particleCount = 100;
const particleRadius = 0.12;
const gravityConstant = 0.015;
const damping = 0.97;
const bounce = 0.45;
const separationStrength = 0.35;
const renderScale = 0.25; // 4x pixelation

const boxW = 3.6;
const boxH = 5.2;
const boxD = 1.4;

class Water3DParticle {
    constructor(mesh) {
        this.mesh = mesh;
        this.x = (Math.random() * 2 - 1) * (boxW/2 - 0.2);
        this.y = (Math.random() * 2 - 1) * (boxH/2 - 0.2);
        this.z = (Math.random() * 2 - 1) * (boxD/2 - 0.2);
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.radius = particleRadius;
    }

    update(gx, gy, gz) {
        this.vx += gx;
        this.vy += gy;
        this.vz += gz;

        this.vx *= damping;
        this.vy *= damping;
        this.vz *= damping;

        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        const halfW = boxW / 2 - this.radius;
        const halfH = boxH / 2 - this.radius;
        const halfD = boxD / 2 - this.radius;

        if (this.x < -halfW) { this.x = -halfW; this.vx = -this.vx * bounce; }
        if (this.x > halfW) { this.x = halfW; this.vx = -this.vx * bounce; }
        
        if (this.y < -halfH) { this.y = -halfH; this.vy = -this.vy * bounce; }
        if (this.y > halfH) { this.y = halfH; this.vy = -this.vy * bounce; }
        
        if (this.z < -halfD) { this.z = -halfD; this.vz = -this.vz * bounce; }
        if (this.z > halfD) { this.z = halfD; this.vz = -this.vz * bounce; }

        this.mesh.position.set(this.x, this.y, this.z);
    }
}

export function initWater() {
    canvas = document.getElementById('canvas-water');
    if (!canvas) return;

    if (renderer) {
        resizeWater();
        return;
    }

    container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090c13);

    // 2. Create Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 7;

    // 3. Create WebGL Renderer (No antialiasing for blocky edges)
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false
    });
    renderer.setPixelRatio(1); // Set to 1 to enforce retro pixel layout
    renderer.setSize(width * renderScale, height * renderScale, false);

    // 4. Create Boundary Box Wireframe
    const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLineMat = new THREE.LineBasicMaterial({ color: 0x202838, linewidth: 2 });
    boundaryBox = new THREE.LineSegments(boxEdges, boxLineMat);
    scene.add(boundaryBox);

    const backGeo = new THREE.PlaneGeometry(boxW, boxH);
    const backMat = new THREE.MeshBasicMaterial({ color: 0x07090e, side: THREE.DoubleSide });
    const backPanel = new THREE.Mesh(backGeo, backMat);
    backPanel.position.z = -boxD / 2 - 0.01;
    scene.add(backPanel);

    // 5. Instantiate Particles
    const sphereGeo = new THREE.SphereGeometry(particleRadius, 6, 6); // low-res sphere meshes
    const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        roughness: 0.5,
        metalness: 0.1,
        flatShading: true // flat shading for extra retro look
    });

    particles = [];
    for (let i = 0; i < particleCount; i++) {
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        scene.add(mesh);
        
        const p = new Water3DParticle(mesh);
        particles.push(p);
    }

    // 6. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(2, 4, 5);
    scene.add(dirLight1);

    const btnReset = document.getElementById('btn-reset-water');
    if (btnReset) {
        btnReset.addEventListener('click', resetWaterParticles);
    }

    window.addEventListener('resize', resizeWater);
}

function resetWaterParticles() {
    particles.forEach(p => {
        p.x = (Math.random() * 2 - 1) * (boxW/2 - 0.2);
        p.y = (Math.random() * 0.5 + 0.5) * (boxH/2 - 0.4);
        p.z = (Math.random() * 2 - 1) * (boxD/2 - 0.2);
        p.vx = 0;
        p.vy = 0;
        p.vz = 0;
    });
}

export function resizeWater() {
    if (!renderer || !container || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Set buffer size to low-res, do not update style
    renderer.setSize(width * renderScale, height * renderScale, false);
}

export function tickWater(timestamp) {
    if (!renderer || !scene || !camera) return;

    const radGamma = (sensorState.gamma * Math.PI) / 180;
    const radBeta = (sensorState.beta * Math.PI) / 180;

    const gx = Math.sin(radGamma) * gravityConstant;
    
    // INVERTED Y gravity for WebGL coord system (+Y is up)
    const gy = -Math.sin(radBeta) * gravityConstant;
    
    const gz = -Math.cos(radBeta) * Math.cos(radGamma) * gravityConstant;

    resolve3DCollisions();

    particles.forEach(p => {
        p.update(gx, gy, gz);
    });

    renderer.render(scene, camera);
}

function resolve3DCollisions() {
    const len = particles.length;
    for (let i = 0; i < len; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < len; j++) {
            const p2 = particles[j];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const minDist = p1.radius + p2.radius;
            const distSq = dx*dx + dy*dy + dz*dz;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 0.01;
                const overlap = minDist - dist;

                const pushX = (dx / dist) * overlap * separationStrength;
                const pushY = (dy / dist) * overlap * separationStrength;
                const pushZ = (dz / dist) * overlap * separationStrength;

                p1.x -= pushX;
                p1.y -= pushY;
                p1.z -= pushZ;
                p2.x += pushX;
                p2.y += pushY;
                p2.z += pushZ;

                const tempVx = p1.vx;
                const tempVy = p1.vy;
                const tempVz = p1.vz;

                p1.vx = p1.vx * 0.9 + p2.vx * 0.1;
                p1.vy = p1.vy * 0.9 + p2.vy * 0.1;
                p1.vz = p1.vz * 0.9 + p2.vz * 0.1;

                p2.vx = p2.vx * 0.9 + tempVx * 0.1;
                p2.vy = p2.vy * 0.9 + tempVy * 0.1;
                p2.vz = p2.vz * 0.9 + tempVz * 0.1;
            }
        }
    }
}
