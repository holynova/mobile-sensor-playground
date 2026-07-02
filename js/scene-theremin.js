/**
 * Scene: Audio Theremin Sound Synthesizer & Oscilloscope Wave (Web Audio API + 2D Canvas)
 * Pixelated 0.25 rendering scale.
 * Frequency mapped to device roll (gamma), volume mapped to device pitch (beta).
 */
import { sensorState } from '../app.js';

let container = null;
let canvas = null;
let ctx = null;
let width = 300;
let height = 160;
const renderScale = 0.25;

// Web Audio API State
let audioCtx = null;
let oscillator = null;
let gainNode = null;
let analyser = null;
let audioDataArray = null;
let isAudioPlaying = false;

export function initTheremin() {
    canvas = document.getElementById('canvas-theremin');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    container = canvas.parentElement;

    resizeTheremin();

    const btnToggle = document.getElementById('btn-toggle-audio');
    if (btnToggle) {
        btnToggle.removeEventListener('click', toggleAudio);
        btnToggle.addEventListener('click', toggleAudio);
        // Reset label just in case
        btnToggle.textContent = 'START AUDIO';
        btnToggle.className = 'btn btn-primary btn-xs';
    }
}

function toggleAudio() {
    const btnToggle = document.getElementById('btn-toggle-audio');
    if (!btnToggle) return;

    if (!isAudioPlaying) {
        startSynthesizer();
        btnToggle.textContent = 'STOP AUDIO';
        btnToggle.className = 'btn btn-secondary btn-xs';
    } else {
        stopSynthesizer();
        btnToggle.textContent = 'START AUDIO';
        btnToggle.className = 'btn btn-primary btn-xs';
    }
}

function startSynthesizer() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. Create Oscillator (Triangle wave for retro chip sound)
        oscillator = audioCtx.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // default A4

        // 2. Create Gain Node (Volume controller)
        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime); // start silent to prevent pop

        // 3. Create Analyser (Oscilloscope wave data)
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        audioDataArray = new Uint8Array(bufferLength);

        // Connect nodes: Osc -> Gain -> Analyser -> Output
        oscillator.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioCtx.destination);

        // Start oscillator
        oscillator.start(0);
        isAudioPlaying = true;
    } catch (e) {
        console.error('Failed to initialize AudioContext:', e);
        isAudioPlaying = false;
    }
}

function stopSynthesizer() {
    if (oscillator) {
        try {
            oscillator.stop();
        } catch (e) {}
        oscillator.disconnect();
        oscillator = null;
    }
    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }
    isAudioPlaying = false;
    audioDataArray = null;
}

export function resizeTheremin() {
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

export function tickTheremin(timestamp) {
    if (!canvas || !ctx) return;

    // 1. Real-time mapping: Update synthesizer pitch/frequency and volume/gain
    if (isAudioPlaying && audioCtx && oscillator && gainNode) {
        
        // Map Roll (Gamma) to Frequency: -45° to +45° maps to 220Hz to 1100Hz
        const minFreq = 220;
        const maxFreq = 1100;
        const rollPct = (sensorState.gamma + 45) / 90;
        const clampedRoll = Math.max(0, Math.min(1, rollPct));
        const targetFreq = minFreq + clampedRoll * (maxFreq - minFreq);
        
        // Smooth frequency changes to prevent click noise
        oscillator.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.04);

        // Map Pitch (Beta) to Volume: 15° to 80° maps to 0.0 to 0.12 gain
        const minPitch = 15;
        const maxPitch = 85;
        const pitchPct = (sensorState.beta - minPitch) / (maxPitch - minPitch);
        const clampedPitch = Math.max(0, Math.min(1, pitchPct));
        const targetGain = clampedPitch * 0.12;

        gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.04);
    }

    // 2. Clear background and draw screen grid
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(38, 48, 69, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Horizontal center axis
    ctx.strokeStyle = 'rgba(38, 48, 69, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 3. Draw Oscilloscope wave
    ctx.strokeStyle = isAudioPlaying ? '#00e5ff' : '#4e5d78';
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (isAudioPlaying && analyser && audioDataArray) {
        analyser.getByteTimeDomainData(audioDataArray);
        const len = audioDataArray.length;
        
        for (let i = 0; i < len; i++) {
            const px = (i / (len - 1)) * width;
            
            // Normalize audio data byte (0 ~ 255, center is 128)
            const norm = (audioDataArray[i] - 128) / 128.0; // range -1.0 to 1.0
            const py = height / 2 + norm * (height * 0.4);

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
    } else {
        // Draw flat line with subtle simulated noise
        const len = 64;
        for (let i = 0; i < len; i++) {
            const px = (i / (len - 1)) * width;
            const noise = (Math.sin(timestamp * 0.015 + i * 0.3) * Math.cos(timestamp * 0.007)) * 1.5;
            const py = height / 2 + noise;

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
    }
    ctx.stroke();

    // 4. Panel metrics readout text
    ctx.fillStyle = '#4e5d78';
    ctx.font = '8px Silkscreen, monospace';
    
    if (isAudioPlaying && oscillator && gainNode) {
        const curFreq = Math.round(oscillator.frequency.value);
        const curVol = Math.round(gainNode.gain.value * 100);
        ctx.fillText(`FREQ: ${curFreq} HZ`, 10, 16);
        ctx.fillText(`VOL: ${curVol}%`, width - 80, 16);
    } else {
        ctx.fillText('OSC STANDBY', 10, 16);
        ctx.fillText('VOL: 0%', width - 60, 16);
    }
}
