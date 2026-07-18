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
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  registerEmissiveGlMaterial,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  resolveGlRenderTarget,
  resizeGlRenderTarget,
  rotateMatrix4,
  rotateSurface180,
  setCameraViewMatrix4FromLookAt,
  setCubeTextureFace,
  setMatrix4Identity,
  translateMatrix4,
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
addNodeChild(scene, torus);

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
  setMatrix4Identity(edge.localMatrix);
  translateMatrix4(edge.localMatrix, edge.localMatrix, x, y, z);
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

// AwayJS is left-handed and the camera is z-negated for Flight's right-handed space, so the environment
// starts facing the opposite side. Rotating the cube 180° about Y — swapping the +X/-X and +Z/-Z faces —
// brings the AwayJS start view back into frame. (Face slots: +X,-X,+Y,-Y,+Z,-Z.)
const faceUrls = [
  'awayjs/assets/skybox/snow_negative_x.jpg',
  'awayjs/assets/skybox/snow_positive_x.jpg',
  'awayjs/assets/skybox/snow_positive_y.jpg',
  'awayjs/assets/skybox/snow_negative_y.jpg',
  'awayjs/assets/skybox/snow_negative_z.jpg',
  'awayjs/assets/skybox/snow_positive_z.jpg',
];

const faceImages = await Promise.all(faceUrls.map((url) => loadImageResourceFromUrl(url)));

// The 180°-about-Y rotation (the side-face swap above) also rotates the +Y/-Y faces about Y — an
// in-plane 180° turn of those two images. Without it the top/bottom don't line up with the rotated
// walls and the cube seams show. Rasterize each to a Surface and rotate it 180° in place to close them.
function rotateImage180(resource: ImageResource): ImageResource {
  const surface = createSurfaceFromImageResource(resource);
  const region = createSurfaceRegion(surface);
  rotateSurface180(region, region);
  return surface;
}

for (let i = 0; i < 6; i++) {
  const isTopOrBottom = i === 2 || i === 3;
  setCubeTextureFace(cubeTexture, i, isTopOrBottom ? rotateImage180(faceImages[i]) : faceImages[i]);
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

  const w = canvas.width;
  const h = canvas.height;

  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }

  // The pass clears depth (to renderTarget.clearDepth = 1); renderGlBackground clears color, so
  // color is preserved on begin. No display-object 2D transform is involved in this 3D pass.
  beginGlRenderPass(state, renderTarget, { preserveColor: true });
  renderGlBackground(state);
  drawGlEnvironmentSkybox(state, environment, camera, aspect);
  drawGlScene(state, scene, camera, lights);
  endGlRenderPass(state);
  resolveGlRenderTarget(state, renderTarget);
  drawGlLinearToSrgbPass(state, renderTarget, null);

  verifyFrame();

  requestAnimationFrame(frame);
}

frame();
