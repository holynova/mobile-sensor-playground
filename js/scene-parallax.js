/**
 * Scene: Multi-layered Scenic Parallax
 * Drives SVG landscape layers translation based on sensor deltas.
 * Includes auto-calibration upon entering the scene.
 */
import { sensorState } from '../app.js';

let layers = [];
let refBeta = 0;
let refGamma = 0;
let hasCalibrated = false;

// Smooth lerped values for rendering
let curDeltaX = 0;
let curDeltaY = 0;
const lerpFactor = 0.1;

// Max displacement in pixels
const maxDisplacement = 40;

export function initParallax() {
    layers = document.querySelectorAll('.parallax-layer');
    
    // Reset calibration on entry
    hasCalibrated = false;
    refBeta = 0;
    refGamma = 0;
    curDeltaX = 0;
    curDeltaY = 0;
}

export function tickParallax(timestamp) {
    if (layers.length === 0) return;

    // Calibrate once we get non-zero values (sensor initialized)
    if (!hasCalibrated) {
        // If simulated or if we have real active readings, lock the reference point
        if (sensorState.beta !== 0 || sensorState.gamma !== 0) {
            refBeta = sensorState.beta;
            refGamma = sensorState.gamma;
            hasCalibrated = true;
        } else {
            // For desktop when mouse hasn't moved yet
            refBeta = 0;
            refGamma = 0;
            hasCalibrated = true;
        }
    }

    // Compute delta relative to starting position
    let deltaX = sensorState.gamma - refGamma;
    let deltaY = sensorState.beta - refBeta;

    // Constrain deltas to [-35, 35] degrees range
    deltaX = Math.max(-35, Math.min(35, deltaX));
    deltaY = Math.max(-35, Math.min(35, deltaY));

    // Smooth values with Lerp
    curDeltaX += (deltaX - curDeltaX) * lerpFactor;
    curDeltaY += (deltaY - curDeltaY) * lerpFactor;

    // Apply translations to each layer based on depth
    layers.forEach(layer => {
        const depth = parseFloat(layer.getAttribute('data-depth')) || 0;
        
        // Horizontal and vertical translations (scaled by depth factor)
        const translateX = curDeltaX * maxDisplacement * depth * 0.8;
        const translateY = curDeltaY * maxDisplacement * depth * 0.8;

        // Apply scale slightly larger than 1 to prevent edge clipping during translation
        const scale = 1.0 + (depth * 0.1); 

        layer.style.transform = `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0) scale(${scale})`;
    });
}
