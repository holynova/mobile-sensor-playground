/**
 * Scene: 3D Rotating Cube
 * Controls HTML CSS 3D transformed elements responsive to phone posture.
 */
import { sensorState } from '../app.js';

let cube = null;
let curX = -25; // Base rotation so user can see it's a 3D box
let curY = 25;
let curZ = 0;

const lerpFactor = 0.12; // smooth out jittery gyroscope readings

export function initCube() {
    cube = document.getElementById('css-3d-cube');
    if (!cube) return;
    
    // Set base orientation
    curX = -25;
    curY = 25;
    curZ = 0;
}

export function tickCube(timestamp) {
    if (!cube) return;

    // Auto-spin simulated Alpha yaw when in simulation mode to show 3D nature
    if (sensorState.isSimulated) {
        // Increment alpha slowly for visual dynamism
        sensorState.alpha = (sensorState.alpha + 0.3) % 360;
    }

    // Determine targets
    // We map:
    // beta (front/back tilt) -> rotate around X-axis
    // gamma (left/right tilt) -> rotate around Y-axis
    // alpha (compass/yaw) -> rotate around Z-axis
    // We inject a base offset of X: -20, Y: 25 to ensure the cube is always rendered isometrically when phone is flat
    const targetX = -sensorState.beta - 20; 
    const targetY = sensorState.gamma + 25;
    const targetZ = sensorState.alpha;

    // Smooth Lerp transitions
    curX += (targetX - curX) * lerpFactor;
    curY += (targetY - curY) * lerpFactor;

    // Handle Z wrapping (0 ~ 360)
    let diffZ = targetZ - curZ;
    if (diffZ > 180) diffZ -= 360;
    if (diffZ < -180) diffZ += 360;
    curZ = (curZ + diffZ * lerpFactor + 360) % 360;

    // Apply 3D CSS Transforms
    cube.style.transform = `rotateX(${curX}deg) rotateY(${curY}deg) rotateZ(${curZ}deg)`;
}
