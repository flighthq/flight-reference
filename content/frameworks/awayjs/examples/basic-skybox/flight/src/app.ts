import type { GlRenderTarget, SceneLights } from '@flighthq/sdk';
import {
  addNodeChild,
  bakeEnvironmentIbl,
  beginGlRenderTarget,
  createAmbientLight,
  createCubeTexture,
  createDirectionalLight,
  createEnvironment,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMatrix,
  createMesh,
  createScene,
  createSceneLights,
  createStandardPbrMaterial,
  createTorusMeshGeometry,
  createVector3,
  DEG_TO_RAD,
  drawGlEnvironmentSkybox,
  drawGlLinearToSrgbPass,
  drawGlScene,
  endGlRenderTarget,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  resolveGlRenderTarget,
  resizeGlRenderTarget,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setCubeTextureFace,
  setMatrix4Identity,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway, setAwayPosition } from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';
const width = window.innerWidth;
const height = window.innerHeight;
const pixelRatio = window.devicePixelRatio || 1;

const mount = document.getElementById('app');
const canvas = createGlCanvasElement(width, height, pixelRatio);

if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}

document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0xffff00ff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerStandardPbrGlMaterial(state);

const verifyFrame = createGlFrameVerifier(state);

const scene = createScene();

const torusMaterial = createStandardPbrMaterial({
  baseColor: 0xccccccff,
  metallic: 1,
  roughness: 0,
});

const geometry = createTorusMeshGeometry(150, 60, 40, 20);
const torus = createMesh(geometry, [torusMaterial]);
addNodeChild(scene, torus);

const camera = createCameraFromAway({ fov: 90 });

const directional = createDirectionalLight({
  direction: awayDirection(0, -1, -1),
  color: 0xffffffff,
  intensity: 5,
});

const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1.5 });
const lights: SceneLights = createSceneLights({ ambient, directional });

const cubeTexture = createCubeTexture();

const faceUrls = [
  'awayjs/assets/skybox/snow_positive_x.jpg',
  'awayjs/assets/skybox/snow_negative_x.jpg',
  'awayjs/assets/skybox/snow_positive_y.jpg',
  'awayjs/assets/skybox/snow_negative_y.jpg',
  'awayjs/assets/skybox/snow_positive_z.jpg',
  'awayjs/assets/skybox/snow_negative_z.jpg',
];

const faceImages = await Promise.all(faceUrls.map((url) => loadImageResourceFromUrl(url)));

for (let i = 0; i < 6; i++) {
  setCubeTextureFace(cubeTexture, i, faceImages[i]);
}

const environment = createEnvironment({ environment: cubeTexture, intensity: 1 });
bakeEnvironmentIbl(state, environment);

let renderTarget: GlRenderTarget | null = null;
const identityMatrix = createMatrix();

let mouseX = width / 2;
let cameraRotationY = 0;

const eye = createVector3(0, 0, 600);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);

document.addEventListener('mousemove', (event: MouseEvent) => {
  mouseX = event.clientX;
});

const aspect = width / height;

let torusRotX = 0;
let torusRotY = 0;

function frame(): void {
  torusRotX -= 2 * DEG_TO_RAD;
  torusRotY -= 1 * DEG_TO_RAD;

  setMatrix4Identity(torus.localMatrix);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, xAxis, torusRotX);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, yAxis, torusRotY);
  invalidateNodeLocalTransform(torus);

  cameraRotationY += (0.5 * (mouseX - window.innerWidth / 2)) / 800;
  const rotRad = cameraRotationY * DEG_TO_RAD;

  setAwayPosition(eye, -600 * Math.sin(rotRad), 0, -600 * Math.cos(rotRad));

  setCameraViewMatrix4FromLookAt(camera, eye, target, up);

  const gl = state.gl;
  const w = canvas.width;
  const h = canvas.height;

  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }

  beginGlRenderTarget(state, renderTarget, identityMatrix);
  renderGlBackground(state);
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlEnvironmentSkybox(state, environment, camera, aspect);
  drawGlScene(state, scene, camera, lights);
  endGlRenderTarget(state);
  resolveGlRenderTarget(state, renderTarget);
  drawGlLinearToSrgbPass(state, renderTarget, null);

  verifyFrame();

  requestAnimationFrame(frame);
}

frame();
