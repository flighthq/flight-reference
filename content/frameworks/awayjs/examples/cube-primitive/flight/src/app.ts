import type { PerspectiveProjection } from '@flighthq/sdk';
import {
  addNodeChild,
  BlendMode,
  copyQuaternion,
  createBoxMeshGeometry,
  createFxaaEffect,
  createMesh,
  createQuaternion,
  createScene,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createToneMapEffect,
  createTorusMeshGeometry,
  createVector3,
  getPbrRoughnessFromPhongShininess,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  multiplyQuaternion,
  setCamera3DViewMatrix4FromLookAt,
  setQuaternionFromAxisAngle,
  setVector3,
} from '@flighthq/sdk';

import { awayDirection, awayPosition, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createScene3DContext } from '../../../_shared/flight/src/scene3d';

const DEG = Math.PI / 180;

const ctx = createScene3DContext({
  width: window.innerWidth,
  height: window.innerHeight,
  effects: [createToneMapEffect(), createFxaaEffect()],
});

const scene = createScene();

const camera = createCameraFromAway({ fov: 120, near: 0.1 });

const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(1, 0, 0),
  color: 0xffffff,
  diffuse: 2.8,
  ambient: 0.4,
  ambientColor: 0x85b2cd,
});
const lights = createSceneLights({ ambient, directional });

const image = await loadImageResourceFromUrl('awayjs/assets/spacy_texture.png');
const texture = createTexture({ image });

const material = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(50),
});
material.baseColorMap = texture;
material.blendMode = BlendMode.Add;
material.alphaMode = 'blend';
material.doubleSided = true;

const torusGeometry = createTorusMeshGeometry(150, 80, 32, 16);
const torus = createMesh(torusGeometry, [material]);
addNodeChild(scene.root, torus);

const cubeGeometry = createBoxMeshGeometry(20, 20, 20);
const cube = createMesh(cubeGeometry, [material]);
setVector3(cube.position, ...awayPosition(130, 0, 40));
invalidateNodeLocalTransform(cube);
addNodeChild(scene.root, cube);

const eye = createVector3(130, 0, 0);
const lookTarget = createVector3(...awayPosition(130, 0, 40));
const up = createVector3(0, 1, 0);
const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);
const scratchQuatA = createQuaternion();
const scratchQuatB = createQuaternion();

let cameraAngle = 0;
let torusAngleY = 0;
let cubeAngleX = 0;
let cubeAngleY = 0;

setCamera3DViewMatrix4FromLookAt(camera, eye, lookTarget, up);

function frame(): void {
  cameraAngle += DEG;
  torusAngleY -= DEG;
  cubeAngleX -= 0.4 * DEG;
  cubeAngleY -= 0.4 * DEG;

  up.x = -Math.sin(cameraAngle);
  up.y = Math.cos(cameraAngle);
  up.z = 0;

  setCamera3DViewMatrix4FromLookAt(camera, eye, lookTarget, up);

  setQuaternionFromAxisAngle(scratchQuatA, yAxis, torusAngleY);
  setQuaternionFromAxisAngle(scratchQuatB, xAxis, Math.PI / 2);
  multiplyQuaternion(scratchQuatA, scratchQuatA, scratchQuatB);
  copyQuaternion(torus.rotation, scratchQuatA);
  invalidateNodeLocalTransform(torus);

  setQuaternionFromAxisAngle(scratchQuatA, yAxis, cubeAngleY);
  setQuaternionFromAxisAngle(scratchQuatB, xAxis, cubeAngleX);
  multiplyQuaternion(scratchQuatA, scratchQuatA, scratchQuatB);
  copyQuaternion(cube.rotation, scratchQuatA);
  invalidateNodeLocalTransform(cube);

  ctx.render(scene.root, camera, lights);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = w * pixelRatio;
  ctx.canvas.height = h * pixelRatio;
  ctx.canvas.style.width = `${w}px`;
  ctx.canvas.style.height = `${h}px`;
  ctx.state.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

frame();
