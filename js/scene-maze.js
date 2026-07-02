/**
 * Scene: 3D Marble Maze Runner (WebGL with Three.js)
 * Pixelated retro downscaling (0.25 scale).
 * Gravity-based rolling marble physics with elastic wall collision.
 */
import * as THREE from 'three';
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let walls = [];
let holes = [];
let goalMesh = null;
let ballMesh = null;

const renderScale = 0.25;
const gravityConstant = 0.008;
const bounce = 0.35;
const damping = 0.98;

// Ball dimensions & physics
const ballRadius = 0.12;
let ballX = 0;
let ballY = 0;
let ballVx = 0;
let ballVy = 0;

// Arena coordinates
const arenaW = 3.6;
const arenaH = 5.2;

// Maze layout grid (1: wall, 0: floor, 2: hole trap, 3: target exit)
const mazeLayout = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 2, 0, 1],
    [1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 2, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1],
    [1, 3, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
];
const rows = mazeLayout.length;
const cols = mazeLayout[0].length;
const cellW = arenaW / cols;
const cellH = arenaH / rows;

export function initMaze() {
    canvas = document.getElementById('canvas-maze');
    if (!canvas) return;

    if (renderer) {
        resizeMaze();
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
    camera.position.z = 6.2;

    // 3. WebGL Renderer (No antialiasing)
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setPixelRatio(1);
    renderer.setSize(width * renderScale, height * renderScale, false);

    // 4. Construct Maze Geometry from Grid
    walls = [];
    holes = [];

    const wallGeo = new THREE.BoxGeometry(cellW, cellH, 0.35);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c2538, roughness: 0.8 });

    const holeGeo = new THREE.CylinderGeometry(cellW * 0.32, cellW * 0.32, 0.05, 12);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x05070a });

    const goalGeo = new THREE.BoxGeometry(cellW * 0.6, cellH * 0.6, 0.1);
    const goalMat = new THREE.MeshBasicMaterial({ color: 0xff6b00 }); // Signal Orange goal

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Coordinate mapping: center of cell relative to center of screen
            const px = -arenaW / 2 + cellW / 2 + c * cellW;
            const py = arenaH / 2 - cellH / 2 - r * cellH;

            const val = mazeLayout[r][c];

            if (val === 1) {
                const wallMesh = new THREE.Mesh(wallGeo, wallMat);
                wallMesh.position.set(px, py, 0);
                scene.add(wallMesh);
                // Store bounding box coordinates for collision
                walls.push({
                    minX: px - cellW / 2,
                    maxX: px + cellW / 2,
                    minY: py - cellH / 2,
                    maxY: py + cellH / 2
                });
            } else if (val === 2) {
                const holeMesh = new THREE.Mesh(holeGeo, holeMat);
                holeMesh.rotation.x = Math.PI / 2;
                holeMesh.position.set(px, py, -0.05);
                scene.add(holeMesh);
                holes.push({ x: px, y: py, radius: cellW * 0.32 });
            } else if (val === 3) {
                goalMesh = new THREE.Mesh(goalGeo, goalMat);
                goalMesh.position.set(px, py, -0.05);
                scene.add(goalMesh);
            }
        }
    }

    // 5. Draw backing plate
    const backingGeo = new THREE.PlaneGeometry(arenaW, arenaH);
    const backingMat = new THREE.MeshBasicMaterial({ color: 0x080a0f });
    const backing = new THREE.Mesh(backingGeo, backingMat);
    backing.position.z = -0.1;
    scene.add(backing);

    const boundaryEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(arenaW, arenaH, 0.4));
    const boundaryLine = new THREE.LineSegments(boundaryEdges, new THREE.LineBasicMaterial({ color: 0x263045 }));
    scene.add(boundaryLine);

    // 6. Create Player Rolling Marble
    const ballGeo = new THREE.SphereGeometry(ballRadius, 6, 6);
    const ballMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff, // Oscilloscope Cyan
        roughness: 0.3,
        metalness: 0.6,
        flatShading: true
    });
    ballMesh = new THREE.Mesh(ballGeo, ballMat);
    scene.add(ballMesh);

    // Initial position
    resetBall();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 4, 6);
    scene.add(dirLight);

    const btnReset = document.getElementById('btn-reset-maze');
    if (btnReset) {
        btnReset.addEventListener('click', resetBall);
    }

    window.addEventListener('resize', resizeMaze);
}

function resetBall() {
    // Spawn at cell (1, 1)
    const startC = 1;
    const startR = 1;
    ballX = -arenaW / 2 + cellW / 2 + startC * cellW;
    ballY = arenaH / 2 - cellH / 2 - startR * cellH;
    ballVx = 0;
    ballVy = 0;
    if (ballMesh) {
        ballMesh.position.set(ballX, ballY, 0);
    }
}

export function resizeMaze() {
    if (!renderer || !container || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width * renderScale, height * renderScale, false);
}

export function tickMaze(timestamp) {
    if (!renderer || !scene || !camera || !ballMesh) return;

    const radGamma = (sensorState.gamma * Math.PI) / 180;
    const radBeta = (sensorState.beta * Math.PI) / 180;

    const gx = Math.sin(radGamma) * gravityConstant;
    const gy = -Math.sin(radBeta) * gravityConstant; // Inverted Y-gravity

    // Update ball physics
    ballVx += gx;
    ballVy += gy;

    ballVx *= damping;
    ballVy *= damping;

    ballX += ballVx;
    ballY += ballVy;

    // Resolve Collisions against Maze Walls
    resolveWallCollisions();

    // Check Hole Traps
    const len = holes.length;
    for (let i = 0; i < len; i++) {
        const dx = ballX - holes[i].x;
        const dy = ballY - holes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < holes[i].radius * 0.7) {
            resetBall();
            return;
        }
    }

    // Check Goal
    if (goalMesh) {
        const gPos = goalMesh.position;
        const dx = ballX - gPos.x;
        const dy = ballY - gPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cellW * 0.5) {
            // Reached target! Trigger flash and reset
            resetBall();
            return;
        }
    }

    // Update mesh position
    ballMesh.position.set(ballX, ballY, 0.05);

    renderer.render(scene, camera);
}

function resolveWallCollisions() {
    // Check collisions for both X and Y separately to slide along walls nicely
    const r = ballRadius;
    const bounds = {
        minX: -arenaW / 2 + r,
        maxX: arenaW / 2 - r,
        minY: -arenaH / 2 + r,
        maxY: arenaH / 2 - r
    };

    // Border bounds
    if (ballX < bounds.minX) { ballX = bounds.minX; ballVx = -ballVx * bounce; }
    if (ballX > bounds.maxX) { ballX = bounds.maxX; ballVx = -ballVx * bounce; }
    if (ballY < bounds.minY) { ballY = bounds.minY; ballVy = -ballVy * bounce; }
    if (ballY > bounds.maxY) { ballY = bounds.maxY; ballVy = -ballVy * bounce; }

    // Wall boxes collisions
    const len = walls.length;
    for (let i = 0; i < len; i++) {
        const wall = walls[i];

        // Is overlapping?
        if (ballX + r > wall.minX && ballX - r < wall.maxX &&
            ballY + r > wall.minY && ballY - r < wall.maxY) {
            
            // Find direction of least overlap
            const overL = (ballX + r) - wall.minX;
            const overR = wall.maxX - (ballX - r);
            const overB = (ballY + r) - wall.minY;
            const overT = wall.maxY - (ballY - r);

            const minOverlap = Math.min(overL, overR, overB, overT);

            if (minOverlap === overL) {
                ballX -= overL;
                ballVx = -ballVx * bounce;
            } else if (minOverlap === overR) {
                ballX += overR;
                ballVx = -ballVx * bounce;
            } else if (minOverlap === overB) {
                ballY -= overB;
                ballVy = -ballVy * bounce;
            } else if (minOverlap === overT) {
                ballY += overT;
                ballVy = -ballVy * bounce;
            }
        }
    }
}
