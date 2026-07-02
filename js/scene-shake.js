/**
 * Scene: Shake To Sketch & Pedometer Wave (2D Canvas)
 * Pixelated 0.25 rendering scale.
 * Accelerometer shake detection triggers physics particle explosion.
 */
import { sensorState, accelState } from '../app.js';

let container = null;
let canvas = null;
let ctx = null;
let width = 300;
let height = 400;
const renderScale = 0.25;

// Brush state
let brushX = 150;
let brushY = 200;
const brushSpeed = 1.4;

// Persistent drawing path points
let drawPoints = [];

// Exploding physics particles
let physicsParticles = [];
let isExploding = false;

// Pedometer wave history
const waveHistory = new Array(60).fill(0);
let stepCount = 0;
let isStepThresholdActive = false;

export function initShake() {
    canvas = document.getElementById('canvas-shake');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    container = canvas.parentElement;

    resizeShake();
    resetSketch();

    const btnClear = document.getElementById('btn-clear-shake');
    if (btnClear) {
        btnClear.addEventListener('click', triggerExplosion);
    }
}

function resetSketch() {
    drawPoints = [];
    physicsParticles = [];
    isExploding = false;
    brushX = width / 2;
    brushY = height / 2 - 40;
}

export function resizeShake() {
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    canvas.width = Math.floor(width * renderScale);
    canvas.height = Math.floor(height * renderScale);

    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    
    ctx.scale(renderScale, renderScale);
}

export function tickShake(timestamp) {
    if (!canvas || !ctx) return;

    // Detect Shake Gesture (Motion Impulse)
    const motionAccel = Math.abs(accelState.x) + Math.abs(accelState.y) + Math.abs(accelState.z);
    const hasShaken = motionAccel > 16 || accelState.shakeImpulse > 15;

    // Monitor Pedometer Wave (oscilloscope trace)
    // Low-pass filter motion magnitude to smooth step wave
    const totalAccel = Math.sqrt(accelState.x * accelState.x + accelState.y * accelState.y + accelState.z * accelState.z);
    const motionSignal = Math.max(0, totalAccel - 9.8); // subtract Earth gravity
    
    waveHistory.push(motionSignal);
    waveHistory.shift();

    // Simple Step counter threshold check
    if (motionSignal > 3.0) {
        if (!isStepThresholdActive) {
            stepCount++;
            isStepThresholdActive = true;
        }
    } else if (motionSignal < 1.0) {
        isStepThresholdActive = false;
    }

    if (hasShaken && !isExploding && drawPoints.length > 0) {
        triggerExplosion();
    }

    // Update brush position using device tilt (Pitch / Roll)
    if (!isExploding) {
        // Gamma controls X velocity, Beta controls Y velocity
        const vx = sensorState.gamma * 0.08 * brushSpeed;
        const vy = -sensorState.beta * 0.08 * brushSpeed; // inverted to follow visual screen direction

        brushX += vx;
        brushY += vy;

        // Constraint within drawing bounds (above the bottom wave panel)
        const drawLimitY = height - 90;
        brushX = Math.max(10, Math.min(width - 10, brushX));
        brushY = Math.max(10, Math.min(drawLimitY, brushY));

        // Add brush stroke points
        if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
            drawPoints.push({
                x: brushX,
                y: brushY,
                color: '#00e5ff' // Cyan drawing trace
            });
            // cap trails to prevent memory lag
            if (drawPoints.length > 700) {
                drawPoints.shift();
            }
        }
    }

    // Clear Screen
    ctx.clearRect(0, 0, width, height);

    // Draw grid background
    ctx.strokeStyle = 'rgba(38, 48, 69, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Render drawings
    if (!isExploding) {
        // Draw standard pixel trail
        ctx.fillStyle = '#00e5ff';
        const len = drawPoints.length;
        for (let i = 0; i < len; i++) {
            ctx.fillRect(Math.floor(drawPoints[i].x) - 1, Math.floor(drawPoints[i].y) - 1, 3, 3);
        }

        // Draw drawing pointer cursor
        ctx.strokeStyle = '#ff6b00';
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.floor(brushX) - 4, Math.floor(brushY) - 4, 8, 8);
        ctx.fillStyle = '#ff6b00';
        ctx.fillRect(Math.floor(brushX) - 1, Math.floor(brushY) - 1, 2, 2);
    } else {
        // Render explosion physics particles
        ctx.fillStyle = '#ff6b00';
        let activeParticles = 0;
        const pLen = physicsParticles.length;

        for (let i = 0; i < pLen; i++) {
            const p = physicsParticles[i];
            if (p.active) {
                activeParticles++;
                
                // Physics updates
                p.vy += 0.25; // gravity pulls drawing dots down
                p.vx *= 0.98;
                p.x += p.vx;
                p.y += p.vy;

                // Draw exploding particle block
                ctx.fillRect(Math.floor(p.x) - 1, Math.floor(p.y) - 1, 3, 3);

                // Disable when falling off screen
                if (p.y > height) {
                    p.active = false;
                }
            }
        }

        // Reset state when all particles fall off
        if (activeParticles === 0) {
            resetSketch();
        }
    }

    // Draw Pedometer & Wave Panel at Bottom
    drawBottomOscilloscope();
}

function triggerExplosion() {
    isExploding = true;
    physicsParticles = [];

    // Convert drawn coordinates to particle models
    // Skip some points if density is too high to maintain performance
    const step = drawPoints.length > 300 ? 2 : 1;
    for (let i = 0; i < drawPoints.length; i += step) {
        const pt = drawPoints[i];
        
        // Random explosive force vectors
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.2 + 1.2;

        physicsParticles.push({
            x: pt.x,
            y: pt.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2.0, // slight upward pop
            active: true
        });
    }
}

function drawBottomOscilloscope() {
    const waveY = height - 60;
    const waveH = 45;

    // Panel border container
    ctx.fillStyle = '#0d111a';
    ctx.fillRect(6, waveY - 8, width - 12, waveH + 16);
    ctx.strokeStyle = '#263045';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, waveY - 8, width - 12, waveH + 16);

    // Grid lines inside waves panel
    ctx.strokeStyle = 'rgba(38, 48, 69, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, waveY + waveH / 2);
    ctx.lineTo(width - 8, waveY + waveH / 2);
    ctx.stroke();

    // Draw pedometer metrics texts
    ctx.fillStyle = '#4e5d78';
    ctx.font = '8px Silkscreen, monospace';
    ctx.fillText('ACCEL MONITOR', 14, waveY);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`STEPS: ${stepCount}`, width - 85, waveY);

    // Plot Pedometer motion wave
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const pointsCount = waveHistory.length;
    const plotWidth = width - 24;
    const startX = 12;

    for (let i = 0; i < pointsCount; i++) {
        const px = startX + (i / (pointsCount - 1)) * plotWidth;
        
        // Scale motion amplitude to fit box
        const amp = Math.min(1.0, waveHistory[i] / 6.0) * (waveH / 2);
        const py = waveY + waveH / 2 - amp; // rises upwards

        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.stroke();
}
