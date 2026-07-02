/**
 * Scene: 3D Fluid Particles (WebGL with Three.js)
 * Implements 100 spherical meshes colliding inside a 3D box responsive to 3D gravity.
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
const gravityConstant = 0.015; // Scaled for WebGL coordinate space
const damping = 0.97;
const bounce = 0.45;
const separationStrength = 0.35;

// 3D Bounding box dimensions
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
        // Accelerate
        this.vx += gx;
        this.vy += gy;
        this.vz += gz;

        // Dampen
        this.vx *= damping;
        this.vy *= damping;
        this.vz *= damping;

        // Move
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        // Bound checks
        const halfW = boxW / 2 - this.radius;
        const halfH = boxH / 2 - this.radius;
        const halfD = boxD / 2 - this.radius;

        if (this.x < -halfW) { this.x = -halfW; this.vx = -this.vx * bounce; }
        if (this.x > halfW) { this.x = halfW; this.vx = -this.vx * bounce; }
        
        if (this.y < -halfH) { this.y = -halfH; this.vy = -this.vy * bounce; }
        if (this.y > halfH) { this.y = halfH; this.vy = -this.vy * bounce; }
        
        if (this.z < -halfD) { this.z = -halfD; this.vz = -this.vz * bounce; }
        if (this.z > halfD) { this.z = halfD; this.vz = -this.vz * bounce; }

        // Sync position to Three.js Mesh
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

    // 3. Create WebGL Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);

    // 4. Create Boundary Box Wireframe
    const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLineMat = new THREE.LineBasicMaterial({ color: 0x202838, linewidth: 1.5 });
    boundaryBox = new THREE.LineSegments(boxEdges, boxLineMat);
    scene.add(boundaryBox);

    // Add back panel plate for depth reference
    const backGeo = new THREE.PlaneGeometry(boxW, boxH);
    const backMat = new THREE.MeshBasicMaterial({ color: 0x07090e, side: THREE.DoubleSide });
    const backPanel = new THREE.Mesh(backGeo, backMat);
    backPanel.position.z = -boxD / 2 - 0.01;
    scene.add(backPanel);

    // 5. Instantiate Particles
    const sphereGeo = new THREE.SphereGeometry(particleRadius, 8, 8);
    const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff, // Oscilloscope Cyan
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85
    });

    particles = [];
    for (let i = 0; i < particleCount; i++) {
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        scene.add(mesh);
        
        const p = new Water3DParticle(mesh);
        particles.push(p);
    }

    // 6. Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(2, 4, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00e5ff, 0.3);
    dirLight2.position.set(-2, -4, -1);
    scene.add(dirLight2);

    // Handle Reset Button
    const btnReset = document.getElementById('btn-reset-water');
    if (btnReset) {
        btnReset.addEventListener('click', resetWaterParticles);
    }

    window.addEventListener('resize', resizeWater);
}

function resetWaterParticles() {
    particles.forEach(p => {
        p.x = (Math.random() * 2 - 1) * (boxW/2 - 0.2);
        p.y = (Math.random() * 0.5 + 0.5) * (boxH/2 - 0.4); // spawn top half
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

    renderer.setSize(width, height);
}

export function tickWater(timestamp) {
    if (!renderer || !scene || !camera) return;

    // Convert sensor inputs to 3D gravity vectors in radians
    const radGamma = (sensorState.gamma * Math.PI) / 180;
    const radBeta = (sensorState.beta * Math.PI) / 180;

    // Gravity vectors mapping:
    // gx: tilt left-right (roll)
    const gx = Math.sin(radGamma) * gravityConstant;
    // gy: tilt front-back (pitch)
    const gy = Math.sin(radBeta) * gravityConstant;
    // gz: gravity vector pointing straight down relative to device face.
    // If device lies flat (beta=0, gamma=0), gz points inside screen (-Z).
    // If vertical (beta=90), gz is 0.
    const gz = -Math.cos(radBeta) * Math.cos(radGamma) * gravityConstant;

    // Resolve 3D collisions
    resolve3DCollisions();

    // Update particles
    particles.forEach(p => {
        p.update(gx, gy, gz);
    });

    // Render WebGL Frame
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

                // Normalize direction and push
                const pushX = (dx / dist) * overlap * separationStrength;
                const pushY = (dy / dist) * overlap * separationStrength;
                const pushZ = (dz / dist) * overlap * separationStrength;

                p1.x -= pushX;
                p1.y -= pushY;
                p1.z -= pushZ;
                p2.x += pushX;
                p2.y += pushY;
                p2.z += pushZ;

                // Share momentum in 3D
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
