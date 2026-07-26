import { createScene3D } from '@flighthq/scene3d';

import {
  addNodeChild,
  createCamera3D,
  createMesh,
  createPerspectiveProjection,
  createQuadMeshGeometry,
  createScene3DLights,
  createTexture,
  createUnlitMaterial,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  setCamera3DViewMatrix4FromLookAt,
  setQuaternionFromEuler,
} from '@flighthq/sdk';

import { render } from './render';

const DAMPING = 1.09;
const LINEAR_ACCELERATION = 0.0005;
const MAX_FORWARD_VELOCITY = 0.05;
const MAX_ROTATION_VELOCITY = 0.5;
const ROTATION_ACCELERATION = 0.01;

function updateVelocity(velocity: number, acceleration: number, max: number): number {
  if (acceleration !== 0) return Math.max(-max, Math.min(max, velocity + acceleration));
  return velocity / DAMPING;
}

const image = await loadImageResourceFromUrl('openfl/checkers.png');
const texture = createTexture({ image });
const scene = createScene3D();
const material = createUnlitMaterial({ baseColor: 0xffffffff, baseColorMap: texture });
material.doubleSided = true;
const mesh = createMesh(createQuadMeshGeometry(0.6, 0.6), [material]);
mesh.position.z = 1;
addNodeChild(scene.root, mesh);

const camera = createCamera3D({
  far: 1000,
  near: 0.1,
  projection: createPerspectiveProjection({ aspect: 4 / 3, fovY: (45 * Math.PI) / 180 }),
});

const lights = createScene3DLights();
const cameraEye = createVector3(0, 0, 2);
const cameraTarget = createVector3(0, 0, 1);
const up = createVector3(0, 1, 0);

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
  cameraLinearVelocity = updateVelocity(cameraLinearVelocity, cameraLinearAcceleration, MAX_FORWARD_VELOCITY);
  cameraRotationVelocity = updateVelocity(cameraRotationVelocity, cameraRotationAcceleration, MAX_ROTATION_VELOCITY);
  cameraYaw += cameraRotationVelocity;
  const yawRad = (cameraYaw * Math.PI) / 180;
  cameraEye.x += Math.sin(yawRad) * cameraLinearVelocity;
  cameraEye.z -= Math.cos(yawRad) * cameraLinearVelocity;
  cameraTarget.x = cameraEye.x + Math.sin(yawRad);
  cameraTarget.y = 0;
  cameraTarget.z = cameraEye.z - Math.cos(yawRad);
  setCamera3DViewMatrix4FromLookAt(camera, cameraEye, cameraTarget, up);

  const t = performance.now();
  setQuaternionFromEuler(mesh.rotation, -(t / 10) * (Math.PI / 180), -(t / 30) * (Math.PI / 180), 0, 'YXZ');
  invalidateNodeLocalTransform(mesh);

  render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

frame();
