import { createScene } from '@flighthq/scene';

import type { SceneLights, VertexAttributeLayout } from '@flighthq/sdk';
import {
  addNodeChild,
  createCamera,
  createMesh,
  createMeshGeometry,
  createOrthographicProjection,
  createVector3,
  createVertexColorMaterial,
  invalidateNodeLocalTransform,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setMatrix4Identity,
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
  vertices: new Float32Array([-0.3, -0.3, 0, 1, 0, 0, 1, 0.3, 0.3, 0, 0, 0, 1, 1, -0.3, 0.3, 0, 0, 1, 0, 1]),
});

const scene = createScene();
const material = createVertexColorMaterial({ tint: 0xffffffff });
material.doubleSided = true;
const mesh = createMesh(geometry, [material]);
addNodeChild(scene, mesh);

const camera = createCamera({
  far: 10,
  near: 0.1,
  projection: createOrthographicProjection({ halfHeight: 1, halfWidth: 1 }),
});
setCameraViewMatrix4FromLookAt(camera, createVector3(0, 0, 1), createVector3(0, 0, 0), createVector3(0, 1, 0));

const lights: SceneLights = { ambient: null, directional: null };
const zAxis = createVector3(0, 0, 1);

function frame(): void {
  setMatrix4Identity(mesh.localMatrix);
  rotateMatrix4(mesh.localMatrix, mesh.localMatrix, zAxis, performance.now() / 40);
  invalidateNodeLocalTransform(mesh);
  render(scene, camera, lights);
  requestAnimationFrame(frame);
}

frame();
