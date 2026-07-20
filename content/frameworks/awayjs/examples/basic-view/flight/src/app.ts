import type { GlRenderTarget, PerspectiveProjection, SceneLights } from '@flighthq/sdk';
import {
  createScene,
  addNodeChild,
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  createMesh,
  createPlaneMeshGeometry,
  createQuaternion,
  createTexture,
  createUnlitMaterial,
  createVector3,
  DEG_TO_RAD,
  loadImageResourceFromUrl,
  presentGlScene,
  registerUnlitGlMaterial,
  resizeGlRenderTarget,
  copyQuaternion,
  invalidateNodeLocalTransform,
  setQuaternionFromAxisAngle,
} from '@flighthq/sdk';

import { createCameraFromAway } from '../../../_shared/flight/src/camera';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

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

registerUnlitGlMaterial(state);
const verifyFrame = createGlFrameVerifier(state);

let renderTarget: GlRenderTarget | null = null;

const scene = createScene();

const material = createUnlitMaterial({ baseColor: 0xffffffff });
const geometry = createPlaneMeshGeometry(700, 700);
const mesh = createMesh(geometry, [material]);
addNodeChild(scene.root, mesh);

const camera = createCameraFromAway({ y: 500, z: -600, fov: 60 });

const lights: SceneLights = { ambient: null, directional: null };
const yAxis = createVector3(0, 1, 0);
const scratchQuat = createQuaternion();

const image = await loadImageResourceFromUrl('awayjs/assets/floor_diffuse.jpg');
const texture = createTexture({ image });
material.baseColorMap = texture;

let angle = 0;

function frame(): void {
  angle -= DEG_TO_RAD;

  setQuaternionFromAxisAngle(scratchQuat, yAxis, angle);
  copyQuaternion(mesh.rotation, scratchQuat);
  invalidateNodeLocalTransform(mesh);

  const w = canvas.width;
  const h = canvas.height;
  if (renderTarget === null) {
    renderTarget = createGlRenderTarget(state, { width: w, height: h, format: 'rgba16f', depth: 'depth-stencil' });
  } else {
    resizeGlRenderTarget(state, renderTarget, w, h);
  }
  presentGlScene(state, renderTarget, scene.root, camera, lights);
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
  (camera.projection as PerspectiveProjection).aspect = w / h;
});

frame();
