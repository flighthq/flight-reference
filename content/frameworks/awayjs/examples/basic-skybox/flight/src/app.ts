import type { GlRenderTarget, ImageResource, SceneLights } from '@flighthq/sdk';
import {
  addNodeChild,
  bakeEnvironmentIbl,
  beginGlRenderPass,
  createAmbientLight,
  createBoxMeshGeometry,
  createCubeTexture,
  createDirectionalLight,
  createEnvironment,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createScene,
  createSceneLights,
  createEmissiveMaterial,
  createStandardPbrMaterial,
  createSurfaceFromImageResource,
  createSurfaceRegion,
  createTorusMeshGeometry,
  createVector3,
  DEG_TO_RAD,
  drawGlEnvironmentSkybox,
  drawGlLinearToSrgbPass,
  drawGlScene,
  endGlRenderPass,
  flipSurfaceHorizontal,
  flipSurfaceVertical,
  createQuaternion,
  loadImageResourceFromUrl,
  multiplyQuaternion,
  registerEmissiveGlMaterial,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  resolveGlRenderTarget,
  resizeGlRenderTarget,
  setCameraViewMatrix4FromLookAt,
  setCubeTextureFace,
  setQuaternionFromAxisAngle,
  copyQuaternion,
  invalidateNodeLocalTransform,
  setVector3,
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
registerEmissiveGlMaterial(state);

const verifyFrame = createGlFrameVerifier(state);

const scene = createScene();

const torusMaterial = createStandardPbrMaterial({
  baseColor: 0xccccccff,
  metallic: 1,
  roughness: 0,
});

const geometry = createTorusMeshGeometry(150, 60, 40, 20);
const torus = createMesh(geometry, [torusMaterial]);
addNodeChild(scene.root, torus);

// AwayJS torus.boundsVisible = true draws the torus's bounding box outline, rotating with the torus.
// Flight's GL wireframe draws every triangle edge (diagonals) and ignores thickness, so build a clean,
// bold outline from thin emissive beams along the 12 box edges. Half-extents: radius+tube in X/Y, tube
// in Z. Beams overlap by their thickness at the corners so the edges meet cleanly. Parented to the torus
// so the outline inherits the spin.
const boundsMaterial = createEmissiveMaterial({ emissive: 0xffffffff });
const halfXY = 150 + 60;
const halfZ = 60;
const beam = 4;

function addBoundsBeam(w: number, h: number, d: number, x: number, y: number, z: number): void {
  const edge = createMesh(createBoxMeshGeometry(w, h, d), [boundsMaterial]);
  setVector3(edge.position, x, y, z);
  invalidateNodeLocalTransform(edge);
  addNodeChild(torus, edge);
}

for (const sy of [-halfXY, halfXY]) {
  for (const sz of [-halfZ, halfZ]) {
    addBoundsBeam(2 * halfXY + beam, beam, beam, 0, sy, sz);
  }
}
for (const sx of [-halfXY, halfXY]) {
  for (const sz of [-halfZ, halfZ]) {
    addBoundsBeam(beam, 2 * halfXY + beam, beam, sx, 0, sz);
  }
}
for (const sx of [-halfXY, halfXY]) {
  for (const sy of [-halfXY, halfXY]) {
    addBoundsBeam(beam, beam, 2 * halfZ + beam, sx, sy, 0);
  }
}

const camera = createCameraFromAway({ fov: 90 });

const directional = createDirectionalLight({
  direction: awayDirection(0, -1, -1),
  color: 0xffffffff,
  intensity: 5,
});

const ambient = createAmbientLight({ color: 0xffffffff, intensity: 1.5 });
const lights: SceneLights = createSceneLights({ ambient, directional });

const cubeTexture = createCubeTexture();

// AwayJS uses a left-handed coordinate system (+Z into screen); Flight is right-handed (+Z out). The
// only axis that flips is Z, which affects cubemap sampling: for each world-space direction d, Flight's
// shader samples the cubemap at d while AwayJS would sample at (dx, dy, -dz). Working through the
// OpenGL cubemap face-selection and UV formulas with this Z-negate gives a clean rule:
//   - ±X and ±Z side faces: same-name for X, Z-swapped for Z, all horizontally flipped
//   - ±Y top/bottom faces: same slot, vertically flipped
const faceUrls = [
  'awayjs/assets/skybox/snow_positive_x.jpg',
  'awayjs/assets/skybox/snow_negative_x.jpg',
  'awayjs/assets/skybox/snow_positive_y.jpg',
  'awayjs/assets/skybox/snow_negative_y.jpg',
  'awayjs/assets/skybox/snow_negative_z.jpg',
  'awayjs/assets/skybox/snow_positive_z.jpg',
];

const faceImages = await Promise.all(faceUrls.map((url) => loadImageResourceFromUrl(url)));

function flipImageH(resource: ImageResource): ImageResource {
  const surface = createSurfaceFromImageResource(resource);
  const region = createSurfaceRegion(surface);
  flipSurfaceHorizontal(region, region);
  return surface;
}

function flipImageV(resource: ImageResource): ImageResource {
  const surface = createSurfaceFromImageResource(resource);
  const region = createSurfaceRegion(surface);
  flipSurfaceVertical(region, region);
  return surface;
}

for (let i = 0; i < 6; i++) {
  const isTopOrBottom = i === 2 || i === 3;
  setCubeTextureFace(cubeTexture, i, isTopOrBottom ? flipImageV(faceImages[i]) : flipImageH(faceImages[i]));
}

const environment = createEnvironment({ environment: cubeTexture, intensity: 1 });
bakeEnvironmentIbl(state, environment);

let renderTarget: GlRenderTarget | null = null;

let mouseX = width / 2;
let cameraRotationY = 0;

const eye = createVector3(0, 0, 600);
const target = createVector3(0, 0, 0);
const up = createVector3(0, 1, 0);

const xAxis = createVector3(1, 0, 0);
const yAxis = createVector3(0, 1, 0);
const scratchQuatA = createQuaternion();
const scratchQuatB = createQuaternion();

document.addEventListener('mousemove', (event: MouseEvent) => {
  mouseX = event.clientX;
});

const aspect = width / height;

let torusRotX = 0;
let torusRotY = 0;

function frame(): void {
  torusRotX -= 2 * DEG_TO_RAD;
  torusRotY -= 1 * DEG_TO_RAD;

  setQuaternionFromAxisAngle(scratchQuatA, xAxis, torusRotX);
  setQuaternionFromAxisAngle(scratchQuatB, yAxis, torusRotY);
  multiplyQuaternion(scratchQuatA, scratchQuatA, scratchQuatB);
  copyQuaternion(torus.rotation, scratchQuatA);
  invalidateNodeLocalTransform(torus);

  cameraRotationY += (0.5 * (mouseX - window.innerWidth / 2)) / 800;
  const rotRad = cameraRotationY * DEG_TO_RAD;

  setAwayPosition(eye, -600 * Math.sin(rotRad), 0, -600 * Math.cos(rotRad));

  setCameraViewMatrix4FromLookAt(camera, eye, target, up);

  const w = canvas.width;
  const h = canvas.height;

  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }

  beginGlRenderPass(state, renderTarget, { preserveColor: true });
  renderGlBackground(state);
  drawGlEnvironmentSkybox(state, environment, camera, aspect);
  drawGlScene(state, scene.root, camera, lights);
  endGlRenderPass(state);
  resolveGlRenderTarget(state, renderTarget);
  drawGlLinearToSrgbPass(state, renderTarget, null);

  verifyFrame();

  requestAnimationFrame(frame);
}

frame();
