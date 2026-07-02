/**
 * Scene: Fluid Particles
 * Redrawn as sharp oscilloscope liquid pixels.
 */
import { sensorState } from '../app.js';

let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let particles = [];
const particleCount = 140;
const gravityConstant = 0.42;
const bounce = 0.4;
const damping = 0.96;
const separationStrength = 0.38;

class WaterParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = Math.random() * 4 + 5; // Flat, smaller dot size: 5 ~ 9px
        this.color = '#00e5ff'; // Pure Oscilloscope Cyan
    }

    update(gx, gy) {
        this.vx += gx;
        this.vy += gy;
        this.vx *= damping;
        this.vy *= damping;
        this.x += this.vx;
        this.y += this.vy;

        this.handleBoundaries();
    }

    handleBoundaries() {
        if (this.x < this.radius) {
            this.x = this.radius;
            this.vx = -this.vx * bounce;
        }
        if (this.x > width - this.radius) {
            this.x = width - this.radius;
            this.vx = -this.vx * bounce;
        }
        if (this.y < this.radius) {
            this.y = this.radius;
            this.vy = -this.vy * bounce;
        }
        if (this.y > height - this.radius) {
            this.y = height - this.radius;
            this.vy = -this.vy * bounce;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Solid dark line border for structural separation
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#090c13';
        ctx.stroke();
    }
}

export function initWater() {
    canvas = document.getElementById('canvas-water');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    resizeWater();

    particles = [];
    for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * (width - 40) + 20;
        const y = Math.random() * (height - 40) + 20;
        particles.push(new WaterParticle(x, y));
    }

    const btnReset = document.getElementById('btn-reset-water');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            particles.forEach(p => {
                p.x = Math.random() * (width - 40) + 20;
                p.y = Math.random() * (height / 3) + 20;
                p.vx = 0;
                p.vy = 0;
            });
        });
    }
}

export function resizeWater() {
    if (!canvas) return;
    const container = canvas.parentElement;
    width = container.clientWidth;
    height = container.clientHeight;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
}

export function tickWater(timestamp) {
    if (!canvas || !ctx) return;

    // Clear canvas with technical trace tail
    ctx.fillStyle = 'rgba(9, 12, 19, 0.25)';
    ctx.fillRect(0, 0, width, height);

    // Compute gravity
    const radGamma = (sensorState.gamma * Math.PI) / 180;
    const radBeta = (sensorState.beta * Math.PI) / 180;

    const gx = Math.sin(radGamma) * gravityConstant;
    const gy = Math.sin(radBeta) * gravityConstant;

    resolveCollisions();

    // Draw grid background on canvas to enforce technical layout
    drawCanvasGrid();

    particles.forEach(p => {
        p.update(gx, gy);
        p.draw();
    });
}

function drawCanvasGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    const gridSize = 24;
    
    ctx.beginPath();
    for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();
}

function resolveCollisions() {
    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const minDist = p1.radius + p2.radius;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 0.1;
                const overlap = minDist - dist;

                const pushX = (dx / dist) * overlap * separationStrength;
                const pushY = (dy / dist) * overlap * separationStrength;

                p1.x -= pushX;
                p1.y -= pushY;
                p2.x += pushX;
                p2.y += pushY;

                const tempVx = p1.vx;
                const tempVy = p1.vy;
                p1.vx = p1.vx * 0.92 + p2.vx * 0.08;
                p1.vy = p1.vy * 0.92 + p2.vy * 0.08;
                p2.vx = p2.vx * 0.92 + tempVx * 0.08;
                p2.vy = p2.vy * 0.92 + tempVy * 0.08;
            }
        }
    }
}
