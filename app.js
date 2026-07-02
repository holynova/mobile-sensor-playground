/**
 * Mobile Sensor Playground - App Coordinator
 * Handles sensor setup, iOS permission flows, desktop simulation, and tab switching.
 */

// Shared sensor state
export const sensorState = {
    alpha: 0,     // Yaw (0 ~ 360)
    beta: 0,      // Pitch (-180 ~ 180)
    gamma: 0,     // Roll (-90 ~ 90)
    source: '未连接', 
    isSimulated: true,
    permission: 'pending'
};

// Acceleration sensor state
export const accelState = {
    x: 0,
    y: 0,
    z: 0,
    shakeImpulse: 0 // simulated shake trigger
};

// Scene instances
let currentSceneId = 'scene-dashboard';

// Import scene modules
import { initDashboard, tickDashboard, resizeDashboard } from './js/sensor-visualizer.js';
import { initWater, tickWater, resizeWater } from './js/scene-water.js';
import { initHourglass, tickHourglass, resizeHourglass } from './js/scene-hourglass.js';
import { initCube, tickCube } from './js/scene-cube.js';
import { initParallax, tickParallax } from './js/scene-parallax.js';

// Import the 5 NEW scene modules
import { initMaze, tickMaze, resizeMaze } from './js/scene-maze.js';
import { initStars, tickStars } from './js/scene-stars.js';
import { initShake, tickShake, resizeShake } from './js/scene-shake.js';
import { initCard, tickCard, resizeCard } from './js/scene-card.js';
import { initTheremin, tickTheremin, resizeTheremin } from './js/scene-theremin.js';

// Scene map mapping
const scenes = {
    'scene-dashboard': { init: initDashboard, tick: tickDashboard, resize: resizeDashboard },
    'scene-water': { init: initWater, tick: tickWater, resize: resizeWater },
    'scene-hourglass': { init: initHourglass, tick: tickHourglass, resize: resizeHourglass },
    'scene-cube': { init: initCube, tick: tickCube, resize: null },
    'scene-parallax': { init: initParallax, tick: tickParallax, resize: null },
    'scene-maze': { init: initMaze, tick: tickMaze, resize: resizeMaze },
    'scene-stars': { init: initStars, tick: tickStars, resize: null },
    'scene-shake': { init: initShake, tick: tickShake, resize: resizeShake },
    'scene-card': { init: initCard, tick: tickCard, resize: resizeCard },
    'scene-theremin': { init: initTheremin, tick: tickTheremin, resize: resizeTheremin }
};

// Target elements
const btnRequest = document.getElementById('btn-request-permission');
const permissionStatus = document.getElementById('permission-status');
const simIndicator = document.getElementById('sim-indicator');
const valAlpha = document.getElementById('val-alpha');
const valBeta = document.getElementById('val-beta');
const valGamma = document.getElementById('val-gamma');
const valSource = document.getElementById('val-source');

// DOM Content Loaded
window.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    detectDeviceSupport();
    setupDesktopSimulation();
    
    // Initialize Dashboard Scene by default
    switchScene('scene-dashboard');

    // Start global animation frame loop
    requestAnimationFrame(globalTick);
});

// Resize handler
window.addEventListener('resize', () => {
    const scene = scenes[currentSceneId];
    if (scene && scene.resize) {
        scene.resize();
    }
});

// Navigation logic
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (target === currentSceneId) return;

            // Update UI tabs
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Handle scroll tab focus on mobile
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

            // Switch view
            switchScene(target);
        });
    });
}

function switchScene(sceneId) {
    // Stop audio context if leaving Theremin scene
    if (currentSceneId === 'scene-theremin' && sceneId !== 'scene-theremin') {
        const btnToggle = document.getElementById('btn-toggle-audio');
        if (btnToggle && btnToggle.innerText.includes('STOP')) {
            btnToggle.click(); // Stop oscillator
        }
    }

    // Hide all scenes
    document.querySelectorAll('.scene-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target scene
    const targetSection = document.getElementById(sceneId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    currentSceneId = sceneId;
    const scene = scenes[sceneId];
    if (scene && scene.init) {
        scene.init();
    }
}

// Device sensor detection & request permission
function detectDeviceSupport() {
    const isIOS = typeof DeviceOrientationEvent !== 'undefined' && 
                  typeof DeviceOrientationEvent.requestPermission === 'function';

    if (isIOS) {
        sensorState.permission = 'pending';
        updatePermissionUI('WAITING', 'pending');
        btnRequest.addEventListener('click', requestIOSPermission);
    } else if (typeof window.DeviceOrientationEvent !== 'undefined') {
        // Modern android/non-iOS that supports Orientation
        window.addEventListener('deviceorientation', handleOrientationEvent, true);
        window.addEventListener('devicemotion', handleMotionEvent, true);
        
        // Timeout to verify if orientation actually sends values
        setTimeout(() => {
            if (sensorState.isSimulated) {
                enableSimulationMode(true);
            }
        }, 1000);

        sensorState.permission = 'granted';
        updatePermissionUI('ACTIVE', 'success');
        btnRequest.style.display = 'none';
    } else {
        sensorState.permission = 'unsupported';
        updatePermissionUI('NO SENSOR', 'pending');
        enableSimulationMode(true);
    }
}

// Request permission flow for iOS
async function requestIOSPermission() {
    try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
            sensorState.permission = 'granted';
            sensorState.isSimulated = false;
            sensorState.source = 'PHYSICAL';
            updatePermissionUI('ACTIVE', 'success');
            btnRequest.style.display = 'none';

            window.addEventListener('deviceorientation', handleOrientationEvent, true);
            window.addEventListener('devicemotion', handleMotionEvent, true);
            simIndicator.classList.add('hide');
        } else {
            sensorState.permission = 'denied';
            updatePermissionUI('DENIED', 'pending');
            enableSimulationMode(true);
        }
    } catch (e) {
        console.error('Sensor Permission Request Error:', e);
        sensorState.permission = 'denied';
        updatePermissionUI('FAILED', 'pending');
        enableSimulationMode(true);
    }
}

// Device orientation listener
function handleOrientationEvent(event) {
    if (event.beta === null || event.gamma === null) {
        return; 
    }

    sensorState.isSimulated = false;
    sensorState.source = 'PHYSICAL';
    
    // Normalize orientations
    sensorState.alpha = event.alpha || 0;
    sensorState.beta = event.beta || 0;
    sensorState.gamma = event.gamma || 0;

    simIndicator.classList.add('hide');
}

// Device motion listener
function handleMotionEvent(event) {
    if (event.acceleration) {
        accelState.x = event.acceleration.x || 0;
        accelState.y = event.acceleration.y || 0;
        accelState.z = event.acceleration.z || 0;
    }
}

// Enable desktop simulation
function enableSimulationMode(force = false) {
    if (force) {
        sensorState.isSimulated = true;
        sensorState.source = 'SIMULATED';
        simIndicator.classList.remove('hide');
    }
}

function updatePermissionUI(text, statusClass) {
    permissionStatus.textContent = text;
    permissionStatus.className = `status-badge status-${statusClass}`;
}

// Setup desktop simulation using mouse/touch dragging
let isDragging = false;
let startX = 0;
let startY = 0;
let startAlpha = 0;

function setupDesktopSimulation() {
    const handleMove = (x, y) => {
        if (!sensorState.isSimulated) return;

        // Screen center coordinates
        const cX = window.innerWidth / 2;
        const cY = window.innerHeight / 2;

        const rX = (x - cX) / cX;
        const rY = (y - cY) / cY;

        // Map mouse position to tilt angles:
        sensorState.gamma = rX * 45;
        sensorState.beta = rY * -60; 

        // If mouse dragging, also rotate yaw (Alpha)
        if (isDragging) {
            const dx = x - startX;
            sensorState.alpha = (startAlpha + (dx * 0.5) + 360) % 360;
        }
    };

    window.addEventListener('mousemove', (e) => {
        handleMove(e.clientX, e.clientY);
    });

    window.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startAlpha = sensorState.alpha;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Press SPACE BAR on desktop to trigger a simulated device shake!
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            accelState.shakeImpulse = 20; // set trigger value
            setTimeout(() => {
                accelState.shakeImpulse = 0; // reset
            }, 150);
        }
    });

    // Touch support for simulation
    window.addEventListener('touchmove', (e) => {
        if (!sensorState.isSimulated) return;
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
        if (!sensorState.isSimulated) return;
        const touch = e.touches[0];
        isDragging = true;
        startX = touch.clientX;
        startY = touch.clientY;
        startAlpha = sensorState.alpha;
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// Global Animation Frame Tick Loop
function globalTick(timestamp) {
    // Update Telemetry readouts
    valAlpha.textContent = `${sensorState.alpha.toFixed(2)}°`;
    valBeta.textContent = `${sensorState.beta.toFixed(2)}°`;
    valGamma.textContent = `${sensorState.gamma.toFixed(2)}°`;
    valSource.textContent = sensorState.source;

    // Tick active scene
    const scene = scenes[currentSceneId];
    if (scene && scene.tick) {
        scene.tick(timestamp);
    }

    requestAnimationFrame(globalTick);
}
