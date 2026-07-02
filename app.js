/**
 * Mobile Sensor Playground - App Coordinator
 * Handles sensor setup, iOS permission flows, and desktop fallbacks.
 */

// Shared sensor state
export const sensorState = {
    alpha: 0,     // Yaw (0 ~ 360)
    beta: 0,      // Pitch (-180 ~ 180)
    gamma: 0,     // Roll (-90 ~ 90)
    source: '未连接', // 'Real' or 'Simulated'
    isSimulated: true,
    permission: 'pending' // 'pending', 'granted', 'denied', 'unsupported'
};

// Scene instances
let currentSceneId = 'scene-dashboard';
let activeSceneModule = null;

// Import scene modules
import { initDashboard, tickDashboard, resizeDashboard } from './js/sensor-visualizer.js';
import { initWater, tickWater, resizeWater } from './js/scene-water.js';
import { initHourglass, tickHourglass, resizeHourglass } from './js/scene-hourglass.js';
import { initCube, tickCube } from './js/scene-cube.js';
import { initParallax, tickParallax } from './js/scene-parallax.js';

// Scene map
const scenes = {
    'scene-dashboard': { init: initDashboard, tick: tickDashboard, resize: resizeDashboard },
    'scene-water': { init: initWater, tick: tickWater, resize: resizeWater },
    'scene-hourglass': { init: initHourglass, tick: tickHourglass, resize: resizeHourglass },
    'scene-cube': { init: initCube, tick: tickCube, resize: null },
    'scene-parallax': { init: initParallax, tick: tickParallax, resize: null }
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

            // Switch view
            switchScene(target);
        });
    });
}

function switchScene(sceneId) {
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
        updatePermissionUI('等待激活', 'pending');
        btnRequest.addEventListener('click', requestIOSPermission);
    } else if (typeof window.DeviceOrientationEvent !== 'undefined') {
        // Modern android/non-iOS that supports Orientation
        // We will bind orientation check immediately.
        window.addEventListener('deviceorientation', handleOrientationEvent, true);
        
        // Timeout to verify if orientation actually sends values
        setTimeout(() => {
            if (sensorState.isSimulated) {
                // If still simulated, sensor API exists but no real values generated (like on desktop)
                enableSimulationMode(true);
            }
        }, 1000);

        sensorState.permission = 'granted';
        updatePermissionUI('已激活', 'success');
        btnRequest.style.display = 'none';
    } else {
        sensorState.permission = 'unsupported';
        updatePermissionUI('不支持陀螺仪', 'pending');
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
            sensorState.source = '设备物理传感器 (iOS)';
            updatePermissionUI('已激活', 'success');
            btnRequest.style.display = 'none';

            window.addEventListener('deviceorientation', handleOrientationEvent, true);
            simIndicator.classList.add('hide');
        } else {
            sensorState.permission = 'denied';
            updatePermissionUI('拒绝访问', 'pending');
            enableSimulationMode(true);
        }
    } catch (e) {
        console.error('Sensor Permission Request Error:', e);
        sensorState.permission = 'denied';
        updatePermissionUI('授权失败', 'pending');
        enableSimulationMode(true);
    }
}

// Device orientation listener
function handleOrientationEvent(event) {
    // If event values are null, it means no real hardware sensor is present (even if API exists)
    if (event.beta === null || event.gamma === null) {
        return; 
    }

    sensorState.isSimulated = false;
    sensorState.source = '设备物理传感器';
    
    // Normalize orientations
    // Alpha (Yaw): 0 to 360
    sensorState.alpha = event.alpha || 0;
    // Beta (Pitch): -180 to 180 (tilt front-to-back)
    sensorState.beta = event.beta || 0;
    // Gamma (Roll): -90 to 90 (tilt left-to-right)
    sensorState.gamma = event.gamma || 0;

    simIndicator.classList.add('hide');
}

// Enable desktop simulation
function enableSimulationMode(force = false) {
    if (force) {
        sensorState.isSimulated = true;
        sensorState.source = '鼠标模拟';
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

        // Ratio from center: -1 to +1
        const rX = (x - cX) / cX;
        const rY = (y - cY) / cY;

        // Map mouse position to tilt angles:
        // Left/Right: Gamma (-45 to 45 deg)
        sensorState.gamma = rX * 45;
        // Front/Back: Beta (-60 to 60 deg)
        sensorState.beta = rY * -60; // Up is forward tilt, down is backward tilt

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
