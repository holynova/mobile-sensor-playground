/**
 * Scene: 3D Gravity Hourglass (WebGL with Three.js)
 * Rendered at low resolution 0.25 scale for pixel-art visual.
 * Inverts Y gravity, increases sand grain count to 350.
 */
import * as THREE from 'three';
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let sandGrains = [];
let hourglassMesh = null;
let hourglassLines = null;

const sandCount = 350; // Increased sand count for fullness
const grainRadius = 0.042;
const gravityConstant = 0.012;
const sandDamping = 0.72;
const sandBounce = 0.08;
const sandSeparation = 0.42;
const renderScale = 0.25; // 4x pixelation

// Hourglass Dimensions
const glassHeight = 4.2;
const maxRadius = 0.95;
const neckRadius = 0.13;
const neckHeight = 0.15;

class Sand3D {
    constructor(mesh) {
        this.mesh = mesh;
        this.resetPosition();
    }

    resetPosition() {
        // Spawn inside top funnel bulb
        const ry = (Math.random() * 0.8 + 0.3) * (glassHeight / 2 - 0.2); // y from 0.3 to 1.9
        const rMax = getGlassRadiusAtY(ry) - grainRadius - 0.04;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * rMax;

        this.x = Math.cos(angle) * dist;
        this.y = ry;
        this.z = Math.sin(angle) * dist;

        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
    }

    update(gx, gy, gz) {
        this.vx += gx;
        this.vy += gy;
        this.vz += gz;

        this.vx *= sandDamping;
        this.vy *= sandDamping;
        this.vz *= sandDamping;

        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        this.constrainToGlass();

        this.mesh.position.set(this.x, this.y, this.z);
    }

    constrainToGlass() {
        const r = grainRadius;
        
        // 1. Vertical base lids
        const maxY = glassHeight / 2 - r;
        if (this.y > maxY) {
            this.y = maxY;
            this.vy = -this.vy * sandBounce;
        } else if (this.y < -maxY) {
            this.y = -maxY;
            this.vy = -this.vy * sandBounce;
        }

        // 2. Circular boundary at current Y height
        const currentRadius = Math.sqrt(this.x * this.x + this.z * this.z);
        const maxAllowedRadius = getGlassRadiusAtY(this.y) - r;

        if (currentRadius > maxAllowedRadius) {
            const angle = Math.atan2(this.z, this.x);
            this.x = Math.cos(angle) * maxAllowedRadius;
            this.z = Math.sin(angle) * maxAllowedRadius;

            this.vx = -this.vx * sandBounce;
            this.vz = -this.vz * sandBounce;

            const slopeNudge = 0.006;
            if (this.y < 0) {
                this.vy += slopeNudge;
            } else {
                if (sensorState.beta < 0) {
                    this.vy -= slopeNudge;
                } else {
                    this.vy += slopeNudge;
                }
            }
        }
    }
}

function getGlassRadiusAtY(y) {
    const absY = Math.abs(y);
    const halfH = glassHeight / 2;
    
    if (absY < neckHeight) {
        return neckRadius;
    }
    
    const t = (absY - neckHeight) / (halfH - neckHeight);
    return neckRadius + (maxRadius - neckRadius) * Math.sin(t * Math.PI / 2);
}

export function initHourglass() {
    canvas = document.getElementById('canvas-hourglass');
    if (!canvas) return;

    if (renderer) {
        resizeHourglass();
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
    camera.position.z = 6;

    // 3. Create WebGL Renderer (No antialiasing)
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width * renderScale, height * renderScale, false);

    // 4. Create 3D Lathe Hourglass Geometry
    const points = [];
    const segments = 36;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = (t - 0.5) * glassHeight;
        const r = getGlassRadiusAtY(y);
        points.push(new THREE.Vector2(r, y));
    }

    const latheGeo = new THREE.LatheGeometry(points, 20);
    
    // Semitransparent body
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x161f30,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    hourglassMesh = new THREE.Mesh(latheGeo, glassMat);
    scene.add(hourglassMesh);

    // Solid outline edges
    const outlineMat = new THREE.LineBasicMaterial({
        color: 0x2d3748,
        transparent: true,
        opacity: 0.5
    });
    hourglassLines = new THREE.LineSegments(new THREE.EdgesGeometry(latheGeo), outlineMat);
    scene.add(hourglassLines);

    // Support caps on top and bottom
    const capGeo = new THREE.CylinderGeometry(maxRadius + 0.05, maxRadius + 0.05, 0.08, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 0.5 });
    
    const topCap = new THREE.Mesh(capGeo, capMat);
    topCap.position.y = glassHeight / 2 + 0.04;
    scene.add(topCap);

    const bottomCap = new THREE.Mesh(capGeo, capMat);
    bottomCap.position.y = -glassHeight / 2 - 0.04;
    scene.add(bottomCap);

    // 5. Instantiate Sand Grains (350 grains)
    const grainGeo = new THREE.SphereGeometry(grainRadius, 4, 4); // low-res sphere mesh
    const grainMat = new THREE.MeshBasicMaterial({ color: 0xff6b00 }); // Signal Orange

    sandGrains = [];
    for (let i = 0; i < sandCount; i++) {
        const mesh = new THREE.Mesh(grainGeo, grainMat);
        scene.add(mesh);

        const s = new Sand3D(mesh);
        sandGrains.push(s);
    }

    // 6. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(4, 5, 5);
    scene.add(dirLight);

    const btnReset = document.getElementById('btn-reset-hourglass');
    if (btnReset) {
        btnReset.removeEventListener('click', resetHourglassSand);
        btnReset.addEventListener('click', resetHourglassSand);
    }

    window.addEventListener('resize', resizeHourglass);
}

function resetHourglassSand() {
    sandGrains.forEach(s => s.resetPosition());
}

export function resizeHourglass() {
    if (!renderer || !container || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width * renderScale, height * renderScale, false);
}

export function tickHourglass(timestamp) {
    if (!renderer || !scene || !camera) return;

    const radGamma = (sensorState.gamma * Math.PI) / 180;
    const radBeta = (sensorState.beta * Math.PI) / 180;

    const gx = Math.sin(radGamma) * gravityConstant;
    
    // INVERTED Y gravity for WebGL coord system (+Y is up)
    const gy = -Math.sin(radBeta) * gravityConstant;
    
    const gz = -Math.cos(radBeta) * Math.cos(radGamma) * gravityConstant;

    resolveSandContacts();

    sandGrains.forEach(grain => {
        grain.update(gx, gy, gz);
    });

    renderer.render(scene, camera);
}

function resolveSandContacts() {
    const len = sandGrains.length;
    // Fast contact resolver: sand particles compress and pile up quickly
    for (let i = 0; i < len; i++) {
        const g1 = sandGrains[i];
        for (let j = i + 1; j < len; j++) {
            const g2 = sandGrains[j];

            const dx = g2.x - g1.x;
            const dy = g2.y - g1.y;
            const dz = g2.z - g1.z;
            const minDist = g1.radius + g2.radius;
            const distSq = dx*dx + dy*dy + dz*dz;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 0.01;
                const overlap = minDist - dist;

                const pushX = (dx / dist) * overlap * sandSeparation;
                const pushY = (dy / dist) * overlap * sandSeparation;
                const pushZ = (dz / dist) * overlap * sandSeparation;

                g1.x -= pushX;
                g1.y -= pushY;
                g1.z -= pushZ;
                g2.x += pushX;
                g2.y += pushY;
                g2.z += pushZ;

                g1.vx *= 0.3;
                g1.vy *= 0.3;
                g1.vz *= 0.3;
                g2.vx *= 0.3;
                g2.vy *= 0.3;
                g2.vz *= 0.3;
            }
        }
    }
}
