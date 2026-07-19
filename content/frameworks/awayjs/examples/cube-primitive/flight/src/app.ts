import type { GlRenderTarget } from '@flighthq/sdk';
import {
  addNodeChild,
  BlendMode,
  createBoxMeshGeometry,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createScene,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createTorusMeshGeometry,
  createQuaternion,
  createVector3,
  getPbrRoughnessFromPhongShininess,
  loadImageResourceFromUrl,
  multiplyQuaternion,
  presentGlScene,
  registerStandardPbrGlMaterial,
  resizeGlRenderTarget,
  setCameraViewMatrix4FromLookAt,
  setQuaternionFromAxisAngle,
  setSceneNodePosition,
  setSceneNodeRotationQuaternion,
} from '@flighthq/sdk';

import { awayDirection, awayPosition, createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createDirectionalLightFromAway } from '../../../_shared/flight/src/lighting';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

const DEG = Math.PI / 180;

const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(window.innerWidth, window.innerHeight, pixelRatio);
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}
document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0x000000ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerStandardPbrGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

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
addNodeChild(scene, torus);

const cubeGeometry = createBoxMeshGeometry(20, 20, 20);
const cube = createMesh(cubeGeometry, [material]);
setSceneNodePosition(cube, ...awayPosition(130, 0, 40));
addNodeChild(scene, cube);

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

setCameraViewMatrix4FromLookAt(camera, eye, lookTarget, up);

function frame(): void {
  cameraAngle += DEG;
  torusAngleY -= DEG;
  cubeAngleX -= 0.4 * DEG;
  cubeAngleY -= 0.4 * DEG;

  up.x = -Math.sin(cameraAngle);
  up.y = Math.cos(cameraAngle);
  up.z = 0;

  setCameraViewMatrix4FromLookAt(camera, eye, lookTarget, up);

  setQuaternionFromAxisAngle(scratchQuatA, yAxis, torusAngleY);
  setQuaternionFromAxisAngle(scratchQuatB, xAxis, Math.PI / 2);
  multiplyQuaternion(scratchQuatA, scratchQuatA, scratchQuatB);
  setSceneNodeRotationQuaternion(torus, scratchQuatA);

  setSceneNodePosition(cube, ...awayPosition(130, 0, 40));
  setQuaternionFromAxisAngle(scratchQuatA, yAxis, cubeAngleY);
  setQuaternionFromAxisAngle(scratchQuatB, xAxis, cubeAngleX);
  multiplyQuaternion(scratchQuatA, scratchQuatA, scratchQuatB);
  setSceneNodeRotationQuaternion(cube, scratchQuatA);

  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  presentGlScene(state, renderTarget, scene, camera, lights);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  camera.projection.aspect = w / h;
});

frame();
