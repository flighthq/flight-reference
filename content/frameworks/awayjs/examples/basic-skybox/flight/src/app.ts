import { createScene } from '@flighthq/scene';
import { drawGlEnvironmentSkybox, drawGlScene } from '@flighthq/scene-gl';

import type { SceneLights } from '@flighthq/sdk';
import {
  addNodeChild,
  createCamera,
  createCubeTexture,
  createEnvironment,
  createGlCanvasElement,
  createGlRenderState,
  createMesh,
  createPerspectiveProjection,
  createTorusMeshGeometry,
  createUnlitMaterial,
  createVector3,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  registerUnlitGlMaterial,
  renderGlBackground,
  rotateMatrix4,
  setCameraViewMatrix4FromLookAt,
  setCubeTextureFace,
  setMatrix4Identity,
} from '@flighthq/sdk';

const width = 800;
const height = 600;
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
  backgroundColor: 0xff000000,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: true },
  pixelRatio,
});

registerUnlitGlMaterial(state);

const scene = createScene();
const geometry = createTorusMeshGeometry(150, 50, 40, 20);
const material = createUnlitMaterial({ baseColor: 0xffffffff });
const torus = createMesh(geometry, [material]);
addNodeChild(scene, torus);

const camera = createCamera({
  far: 5000,
  near: 0.1,
  projection: createPerspectiveProjection({ fovY: Math.PI / 2 }),
});

const lights: SceneLights = { ambient: null, directional: null };

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

let panAngle = 0;
let tiltAngle = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let dragging = false;
const distance = 600;

const eye = createVector3(0, 0, -distance);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);

canvas.addEventListener('pointerdown', (event: PointerEvent) => {
  dragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
});

window.addEventListener('pointermove', (event: PointerEvent) => {
  if (!dragging) return;
  panAngle += (event.clientX - lastMouseX) * 0.3;
  tiltAngle += (event.clientY - lastMouseY) * 0.3;
  tiltAngle = Math.max(-89, Math.min(89, tiltAngle));
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
});

window.addEventListener('pointerup', () => {
  dragging = false;
});

function updateCamera(): void {
  const panRad = (panAngle * Math.PI) / 180;
  const tiltRad = (tiltAngle * Math.PI) / 180;
  eye.x = distance * Math.sin(panRad) * Math.cos(tiltRad);
  eye.y = distance * Math.sin(tiltRad);
  eye.z = distance * Math.cos(panRad) * Math.cos(tiltRad);
  setCameraViewMatrix4FromLookAt(camera, eye, target, up);
}

const aspect = width / height;

function frame(): void {
  setMatrix4Identity(torus.localMatrix);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, xAxis, (performance.now() / 500) * Math.PI);
  rotateMatrix4(torus.localMatrix, torus.localMatrix, yAxis, (performance.now() / 1000) * Math.PI);
  invalidateNodeLocalTransform(torus);

  updateCamera();

  renderGlBackground(state);
  const gl = state.gl;
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlEnvironmentSkybox(state, environment, camera, aspect);
  drawGlScene(state, scene, camera, lights);

  requestAnimationFrame(frame);
}

frame();
