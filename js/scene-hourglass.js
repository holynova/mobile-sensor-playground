/**
 * Scene: Gravity Hourglass
 * Overhauled to draw a clean blueprint wireframe frame and Signal Orange sand.
 */
import { sensorState } from '../app.js';

let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let sandGrains = [];

const sandCount = 180;
const grainRadius = 2.5; // Slightly smaller, sharper sand
const gravityConstant = 0.38;
const sandDamping = 0.72;
const sandBounce = 0.08;
const sandSeparation = 0.45;

let cx = 0;
let cy = 0;
const glassHeight = 260;
const glassMaxHalfWidth = 60;
const glassNeckHalfWidth = 7;
const neckYOffset = 10;
const funnelHalfHeight = 110;

class SandGrain {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = grainRadius;
        this.color = '#ff6b00'; // Pure Signal Orange
    }

    update(gx, gy) {
        this.vx += gx;
        this.vy += gy;
        this.vx *= sandDamping;
        this.vy *= sandDamping;
        this.x += this.vx;
        this.y += this.vy;

        this.constrainToGlass();
    }

    constrainToGlass() {
        let rx = this.x - cx;
        let ry = this.y - cy;
        const r = this.radius;

        const maxY = glassHeight / 2 - r;
        if (ry > maxY) {
            ry = maxY;
            this.vy = -this.vy * sandBounce;
        } else if (ry < -maxY) {
            ry = -maxY;
            this.vy = -this.vy * sandBounce;
        }

        const absRy = Math.abs(ry);
        let allowedWidth = 0;

        if (absRy <= neckYOffset) {
            allowedWidth = glassNeckHalfWidth - r;
        } else if (absRy <= funnelHalfHeight) {
            const t = (absRy - neckYOffset) / (funnelHalfHeight - neckYOffset);
            allowedWidth = glassNeckHalfWidth + (glassMaxHalfWidth - glassNeckHalfWidth) * t - r;
        } else {
            allowedWidth = glassMaxHalfWidth - r;
        }

        if (Math.abs(rx) > allowedWidth) {
            rx = Math.sign(rx) * allowedWidth;
            this.vx = -this.vx * sandBounce;
            
            const slopeNudge = 0.18;
            if (ry < 0) {
                this.vy += slopeNudge;
            } else {
                if (sensorState.beta < 0) {
                    this.vy -= slopeNudge;
                } else {
                    this.vy += slopeNudge;
                }
            }
        }

        this.x = rx + cx;
        this.y = ry + cy;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

export function initHourglass() {
    canvas = document.getElementById('canvas-hourglass');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeHourglass();
    resetSand();

    const btnReset = document.getElementById('btn-reset-hourglass');
    if (btnReset) {
        btnReset.removeEventListener('click', resetSand);
        btnReset.addEventListener('click', resetSand);
    }
}

function resetSand() {
    sandGrains = [];
    for (let i = 0; i < sandCount; i++) {
        const ry = -neckYOffset - Math.random() * (funnelHalfHeight - neckYOffset - 12);
        const t = (Math.abs(ry) - neckYOffset) / (funnelHalfHeight - neckYOffset);
        const maxW = (glassNeckHalfWidth + (glassMaxHalfWidth - glassNeckHalfWidth) * t) - 5;
        const rx = (Math.random() * 2 - 1) * maxW;
        sandGrains.push(new SandGrain(cx + rx, cy + ry));
    }
}

export function resizeHourglass() {
    if (!canvas) return;
    const container = canvas.parentElement;
    width = container.clientWidth;
    height = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    cx = width / 2;
    cy = height / 2;
}

export function tickHourglass() {
    if (!canvas || !ctx) return;

    // Clear background
    ctx.fillStyle = '#090c13';
    ctx.fillRect(0, 0, width, height);

    // Compute gravity
    const radGamma = (sensorState.gamma * Math.PI) / 180;
    const radBeta = (sensorState.beta * Math.PI) / 180;

    const gx = Math.sin(radGamma) * gravityConstant;
    const gy = Math.sin(radBeta) * gravityConstant;

    // 1. Technical blueprint grid lines
    drawTechnicalGrid();

    // 2. Draw Hourglass Outer Frame (Blueprint style)
    drawHourglassFrame();

    // 3. Stack Sand
    resolveSandCollisions();

    // 4. Draw Grains
    sandGrains.forEach(grain => {
        grain.update(gx, gy);
        grain.draw();
    });
}

function drawTechnicalGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
    ctx.moveTo(0, cy); ctx.lineTo(width, cy);
    ctx.stroke();
}

function drawHourglassFrame() {
    ctx.save();
    
    // Glass boundary paths
    ctx.beginPath();
    // Top Lid
    ctx.moveTo(cx - glassMaxHalfWidth, cy - glassHeight/2);
    ctx.lineTo(cx + glassMaxHalfWidth, cy - glassHeight/2);
    
    // Top bulb funnel
    ctx.lineTo(cx + glassNeckHalfWidth, cy - neckYOffset);
    ctx.lineTo(cx + glassNeckHalfWidth, cy + neckYOffset);
    
    // Bottom bulb funnel
    ctx.lineTo(cx + glassMaxHalfWidth, cy + glassHeight/2);
    
    // Base Lid
    ctx.lineTo(cx - glassMaxHalfWidth, cy + glassHeight/2);
    
    // Bottom left funnel
    ctx.lineTo(cx - glassNeckHalfWidth, cy + neckYOffset);
    ctx.lineTo(cx - glassNeckHalfWidth, cy - neckYOffset);
    ctx.closePath();

    // Clear glass line - no neon glows, just a solid technical blueprint gray line
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#2d3748';
    ctx.stroke();

    // Flat slate grey caps (Top & Bottom bases)
    ctx.fillStyle = '#161f30';
    ctx.fillRect(cx - glassMaxHalfWidth - 6, cy - glassHeight/2 - 4, (glassMaxHalfWidth + 6) * 2, 4);
    ctx.fillRect(cx - glassMaxHalfWidth - 6, cy + glassHeight/2, (glassMaxHalfWidth + 6) * 2, 4);
    
    // Caps outline border
    ctx.strokeStyle = '#3d4960';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - glassMaxHalfWidth - 6, cy - glassHeight/2 - 4, (glassMaxHalfWidth + 6) * 2, 4);
    ctx.strokeRect(cx - glassMaxHalfWidth - 6, cy + glassHeight/2, (glassMaxHalfWidth + 6) * 2, 4);

    ctx.restore();
}

function resolveSandCollisions() {
    for (let i = 0; i < sandGrains.length; i++) {
        const g1 = sandGrains[i];
        for (let j = i + 1; j < sandGrains.length; j++) {
            const g2 = sandGrains[j];

            const dx = g2.x - g1.x;
            const dy = g2.y - g1.y;
            const minDist = g1.radius + g2.radius;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 0.1;
                const overlap = minDist - dist;

                const pushX = (dx / dist) * overlap * sandSeparation;
                const pushY = (dy / dist) * overlap * sandSeparation;

                g1.x -= pushX;
                g1.y -= pushY;
                g2.x += pushX;
                g2.y += pushY;

                g1.vx *= 0.35;
                g1.vy *= 0.35;
                g2.vx *= 0.35;
                g2.vy *= 0.35;
            }
        }
    }
}
