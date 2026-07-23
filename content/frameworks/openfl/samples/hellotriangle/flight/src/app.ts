import { createScene } from '@flighthq/scene';

import type { VertexAttributeLayout } from '@flighthq/sdk';
import {
  addNodeChild,
  createCamera3D,
  createMesh,
  createMeshGeometry,
  createOrthographicProjection,
  createQuaternion,
  createSceneLights,
  createVector3,
  createVertexColorMaterial,
  setCamera3DViewMatrix4FromLookAt,
  copyQuaternion,
  invalidateNodeLocalTransform,
  setQuaternionFromAxisAngle,
} from '@flighthq/sdk';

import { render } from './render';

const TRIANGLE_LAYOUT: VertexAttributeLayout = {
  attributes: [
    { byteOffset: 0, format: 'float32x3', semantic: 'position' },
    { byteOffset: 12, format: 'float32x4', semantic: 'color0' },
  ],
  stride: 28,
};

const geometry = createMeshGeometry({
  indices: new Uint16Array([0, 1, 2]),
  layout: TRIANGLE_LAYOUT,
  vertices: new Float32Array([-0.3, -0.3, 0, 1, 0, 0, 1, -0.3, 0.3, 0, 0, 1, 0, 1, 0.3, 0.3, 0, 0, 0, 1, 1]),
});

const scene = createScene();
const material = createVertexColorMaterial({ tint: 0xffffffff });
material.doubleSided = true;
const mesh = createMesh(geometry, [material]);
addNodeChild(scene.root, mesh);

const camera = createCamera3D({
  far: 10,
  near: 0.1,
  projection: createOrthographicProjection({ halfHeight: 1, halfWidth: 1 }),
});
setCamera3DViewMatrix4FromLookAt(camera, createVector3(0, 0, 1), createVector3(0, 0, 0), createVector3(0, 1, 0));

const lights = createSceneLights();
const zAxis = createVector3(0, 0, 1);
const scratchQuat = createQuaternion();

function frame(): void {
  setQuaternionFromAxisAngle(scratchQuat, zAxis, (performance.now() / 40) * (Math.PI / 180));
  copyQuaternion(mesh.rotation, scratchQuat);
  invalidateNodeLocalTransform(mesh);
  render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

frame();
