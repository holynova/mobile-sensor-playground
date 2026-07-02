/**
 * Sensor Visualizer - Bubble Level (WebGL / 2D Canvas)
 * Pixelated downscaled rendering at 0.25 scale for retro instrument feel.
 */
import { sensorState } from '../app.js';

let canvas = null;
let ctx = null;
let width = 200;
let height = 200;
const renderScale = 0.25; // 4x pixelation

export function initDashboard() {
    canvas = document.getElementById('canvas-bubble-level');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeDashboard();
}

export function resizeDashboard() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    width = rect.width;
    height = rect.height;
    
    // Set canvas drawing buffer to a low resolution (e.g. 50x50)
    canvas.width = Math.floor(width * renderScale);
    canvas.height = Math.floor(height * renderScale);
    
    // Disable smoothing on the canvas context for crisp pixel edges
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    
    // Scale drawing operations down to fit the smaller buffer
    ctx.scale(renderScale, renderScale);
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
            statusText.innerHTML = `<span style="color: #00e5ff; font-weight: 700;">✓ ALIGNED</span>`;
        } else {
            statusText.innerHTML = `TILT: <span style="color: #ff6b00; font-weight: 700;">${totalTilt.toFixed(1)}°</span>`;
        }
    }

    // 1. Draw solid dark backing plate
    ctx.beginPath();
    ctx.arc(cx, cy, rBoundary, 0, Math.PI * 2);
    ctx.fillStyle = '#05070a';
    ctx.fill();
    ctx.lineWidth = 2; // thicker lines for pixel aesthetic
    ctx.strokeStyle = '#202838';
    ctx.stroke();

    // 2. Technical crosshairs (dashed pixel effect)
    ctx.beginPath();
    ctx.moveTo(cx - rBoundary, cy);
    ctx.lineTo(cx + rBoundary, cy);
    ctx.moveTo(cx, cy - rBoundary);
    ctx.lineTo(cx, cy + rBoundary);
    ctx.strokeStyle = 'rgba(96, 116, 139, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Concentric Target rings
    const rings = [rBoundary * 0.35, rBoundary * 0.7, rBoundary * 0.15];
    rings.forEach((ringR, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.lineWidth = idx === 2 ? 2 : 1;
        ctx.strokeStyle = idx === 2 ? 'rgba(0, 229, 255, 0.3)' : 'rgba(96, 116, 139, 0.15)';
        ctx.stroke();
    });

    // 4. Compute bubble coordinate (Max visualized angle is 30 deg)
    const maxAngle = 30;
    let dx = (sensorState.gamma / maxAngle) * rBoundary;
    let dy = (sensorState.beta / maxAngle) * rBoundary;

    // Boundary constraint check
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxBubbleTravel = rBoundary - 10;
    if (dist > maxBubbleTravel) {
        const theta = Math.atan2(dy, dx);
        dx = Math.cos(theta) * maxBubbleTravel;
        dy = Math.sin(theta) * maxBubbleTravel;
    }

    const bx = cx + dx;
    const by = cy + dy;

    // 5. Draw flat square pixel bubble
    const bubbleSize = 16;
    ctx.fillStyle = isLeveled ? '#00e5ff' : '#ff6b00';
    // Draw as a blocky pixel square representing bubble
    ctx.fillRect(bx - bubbleSize/2, by - bubbleSize/2, bubbleSize, bubbleSize);
    
    // Draw a dark outline border
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - bubbleSize/2, by - bubbleSize/2, bubbleSize, bubbleSize);

    // Draw a single center pixel highlight
    ctx.fillStyle = '#05070a';
    ctx.fillRect(bx - 1, by - 1, 2, 2);
}
