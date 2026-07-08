import { createScene } from '@flighthq/scene';

import type { SceneLights } from '@flighthq/sdk';
import {
  addNodeChild,
  createCamera,
  createMesh,
  createPerspectiveProjection,
  createQuadMeshGeometry,
  createTexture,
  createUnlitMaterial,
  createVector3,
  loadImageResourceFromUrl,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
  translateMatrix4,
} from '@flighthq/sdk';

import { height, render, width } from './render';

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

const image = await loadImageResourceFromUrl('assets/openfl.png');
const texture = createTexture({ image: image });
const scene = createScene();
const mesh = createMesh(createQuadMeshGeometry(0.6, 0.6), [
  createUnlitMaterial({ baseColor: 0xffffffff, baseColorMap: texture }),
]);
addNodeChild(scene, mesh);

const camera = createCamera({
  far: 1000,
  near: 0.1,
  projection: createPerspectiveProjection({ aspect: width / height, fovY: (45 * Math.PI) / 180 }),
});

const lights: SceneLights = { ambient: null, directional: null };
const cameraEye = createVector3(0, 0, 2);
const cameraTarget = createVector3(0, 0, 1);
const up = createVector3(0, 1, 0);
const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);

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

  setMatrix4Identity(mesh.localMatrix);
  translateMatrix4(mesh.localMatrix, mesh.localMatrix, 0, 0, -1);
  rotateMatrix4(mesh.localMatrix, mesh.localMatrix, yAxis, performance.now() / 30);
  rotateMatrix4(mesh.localMatrix, mesh.localMatrix, xAxis, performance.now() / 10);

  render(scene, camera, lights);
  requestAnimationFrame(frame);
}

frame();
