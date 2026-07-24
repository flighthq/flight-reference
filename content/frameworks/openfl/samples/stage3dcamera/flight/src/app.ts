import { createScene } from '@flighthq/scene';

import {
  addNodeChild,
  createCamera,
  createMatrix4,
  createMesh,
  createPerspectiveProjection,
  createSceneLights,
  createTexture,
  createUnlitMaterial,
  createVector3,
  loadImageResourceFromUrl,
  rotateMatrix4,
  scaleMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  setNodeLocalMatrix4,
  translateMatrix4,
} from '@flighthq/sdk';

import { createTexturedQuadGeometry } from '../../../_shared/flightSceneGeometry';
import { render } from './render';

const DAMPING = 1.09;
const LINEAR_ACCELERATION = 0.0005;
const MAX_FORWARD_VELOCITY = 0.05;
const MAX_ROTATION_VELOCITY = 0.5;
const ROTATION_ACCELERATION = 0.01;

function calculateUpdatedVelocity(curVelocity: number, curAcceleration: number, maxVelocity: number): number {
  if (curAcceleration !== 0) {
    const next = curVelocity + curAcceleration;
    return Math.max(-maxVelocity, Math.min(maxVelocity, next));
  }

  return curVelocity / DAMPING;
}

const image = await loadImageResourceFromUrl('openfl/openfl.png');
const texture = createTexture({ image: image });
const scene = createScene();
const material = createUnlitMaterial({ baseColor: 0xffffffff, baseColorMap: texture });
material.doubleSided = true;
const mesh = createMesh(createTexturedQuadGeometry(0.6, 0.6), [material]);
addNodeChild(scene.root, mesh);

const camera = createCamera({
  far: 1000,
  near: 0.1,
  projection: createPerspectiveProjection({ aspect: 4 / 3, fovY: (45 * Math.PI) / 180 }),
});

const lights = createSceneLights();
const cameraEye = createVector3(0, 0, 2);
const cameraTarget = createVector3(0, 0, 1);
const up = createVector3(0, 1, 0);
const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);
const scratchMatrix = createMatrix4();

let cameraLinearAcceleration = 0;
let cameraLinearVelocity = 0;
let cameraRotationAcceleration = 0;
let cameraRotationVelocity = 0;
let cameraYaw = 0;

window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      cameraRotationAcceleration = -ROTATION_ACCELERATION;
      break;
    case 'ArrowRight':
      cameraRotationAcceleration = ROTATION_ACCELERATION;
      break;
    case 'ArrowUp':
      cameraLinearAcceleration = LINEAR_ACCELERATION;
      break;
    case 'ArrowDown':
      cameraLinearAcceleration = -LINEAR_ACCELERATION;
      break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowRight':
      cameraRotationAcceleration = 0;
      break;
    case 'ArrowUp':
    case 'ArrowDown':
      cameraLinearAcceleration = 0;
      break;
  }
});

function frame(): void {
  cameraLinearVelocity = calculateUpdatedVelocity(cameraLinearVelocity, cameraLinearAcceleration, MAX_FORWARD_VELOCITY);
  cameraRotationVelocity = calculateUpdatedVelocity(
    cameraRotationVelocity,
    cameraRotationAcceleration,
    MAX_ROTATION_VELOCITY,
  );
  cameraYaw += cameraRotationVelocity;
  cameraEye.x += Math.sin((cameraYaw * Math.PI) / 180) * cameraLinearVelocity;
  cameraEye.z -= Math.cos((cameraYaw * Math.PI) / 180) * cameraLinearVelocity;
  cameraTarget.x = cameraEye.x + Math.sin((cameraYaw * Math.PI) / 180);
  cameraTarget.y = 0;
  cameraTarget.z = cameraEye.z - Math.cos((cameraYaw * Math.PI) / 180);
  setCameraViewMatrix4FromLookAt(camera, cameraEye, cameraTarget, up);

  setMatrix4Identity(scratchMatrix);
  translateMatrix4(scratchMatrix, scratchMatrix, 0, 0, 1);
  scaleMatrix4(scratchMatrix, scratchMatrix, 1, 1, -1);
  rotateMatrix4(scratchMatrix, scratchMatrix, xAxis, (performance.now() / 10) * (Math.PI / 180));
  rotateMatrix4(scratchMatrix, scratchMatrix, yAxis, (performance.now() / 30) * (Math.PI / 180));
  setNodeLocalMatrix4(mesh, scratchMatrix);

  render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

frame();
