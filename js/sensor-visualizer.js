/**
 * Sensor Visualizer - Bubble Level
 * Redrawn as a flat, precise technical instrument dial.
 */
import { sensorState } from '../app.js';

let canvas = null;
let ctx = null;
let width = 200;
let height = 200;

export function initDashboard() {
    canvas = document.getElementById('canvas-bubble-level');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeDashboard();
}

export function resizeDashboard() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    width = rect.width;
    height = rect.height;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
}

export function tickDashboard() {
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const rBoundary = 85;

    // Calculate angles
    const totalTilt = Math.sqrt(sensorState.beta * sensorState.beta + sensorState.gamma * sensorState.gamma);
    const isLeveled = totalTilt < 1.0;

    // Update Status Badge Text
    const statusText = document.getElementById('lbl-level-status');
    if (statusText) {
        if (isLeveled) {
            statusText.innerHTML = `<span style="color: #00e5ff; font-weight: 700;">✓ ALIGNED (TILT < 1°)</span>`;
        } else {
            statusText.innerHTML = `DEVIATION: <span style="color: #ff6b00; font-weight: 700;">${totalTilt.toFixed(1)}°</span>`;
        }
    }

    // 1. Draw solid dark backing plate
    ctx.beginPath();
    ctx.arc(cx, cy, rBoundary, 0, Math.PI * 2);
    ctx.fillStyle = '#090c13';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#202838';
    ctx.stroke();

    // 2. Technical crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - rBoundary, cy);
    ctx.lineTo(cx + rBoundary, cy);
    ctx.moveTo(cx, cy - rBoundary);
    ctx.lineTo(cx, cy + rBoundary);
    ctx.strokeStyle = 'rgba(96, 116, 139, 0.1)';
    ctx.stroke();

    // 3. Concentric Technical Target rings
    const rings = [rBoundary * 0.3, rBoundary * 0.65, rBoundary * 0.15];
    rings.forEach((ringR, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.lineWidth = idx === 2 ? 1.5 : 1;
        ctx.strokeStyle = idx === 2 ? 'rgba(0, 229, 255, 0.25)' : 'rgba(96, 116, 139, 0.1)';
        ctx.stroke();
    });

    // 4. Compute bubble coordinate (Max visualized angle is 30 deg)
    const maxAngle = 30;
    let dx = (sensorState.gamma / maxAngle) * rBoundary;
    let dy = (sensorState.beta / maxAngle) * rBoundary;

    // Boundary constraint check
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxBubbleTravel = rBoundary - 12; // 12px is bubble radius
    if (dist > maxBubbleTravel) {
        const theta = Math.atan2(dy, dx);
        dx = Math.cos(theta) * maxBubbleTravel;
        dy = Math.sin(theta) * maxBubbleTravel;
    }

    const bx = cx + dx;
    const by = cy + dy;

    // 5. Draw flat bubble
    const bubbleR = 10;
    ctx.beginPath();
    ctx.arc(bx, by, bubbleR, 0, Math.PI * 2);
    // Leveled = green/cyan laser; Unbalanced = Signal Orange
    ctx.fillStyle = isLeveled ? '#00e5ff' : '#ff6b00';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#090c13';
    ctx.stroke();

    // Draw tiny technical dot in the exact center of the bubble
    ctx.beginPath();
    ctx.arc(bx, by, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#090c13';
    ctx.fill();
}
