import type { GlRenderEffectPipeline, PerspectiveProjection } from '@flighthq/sdk';
import {
  addNodeChild,
  beginGlRenderEffectPipeline,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  createMesh,
  createScene,
  createSceneLights,
  createStandardPbrMaterial,
  createTexture,
  createToneMapEffect,
  createTorusMeshGeometry,
  createQuaternion,
  createVector3,
  drawGlScene,
  endGlRenderEffectPipeline,
  getPbrRoughnessFromPhongShininess,
  loadImageResourceFromUrl,
  registerDefaultGlRenderEffects,
  registerStandardPbrGlMaterial,
  renderGlBackground,
  setQuaternionFromAxisAngle,
  copyQuaternion,
  invalidateNodeLocalTransform,
} from '@flighthq/sdk';

import { awayDirection, createCameraFromAway } from '../../../_shared/flight/src/camera';
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
registerDefaultGlRenderEffects(state);
const verifyFrame = createGlFrameVerifier(state);

const effects = [createToneMapEffect({ operator: 'aces' })];
let pipeline: GlRenderEffectPipeline | null = null;

const scene = createScene();

const camera = createCameraFromAway({ z: -1000, fov: 60 });

// AwayJS's DirectionalLight defaults to ambient 0 and this sample adds no ambient light, so the torus
// is lit by the directional alone; the helper supplies the matching ~zero ambient. ACES tone mapping
// (below) compresses the single light's highlights into range without a flat fill washing it out.
const { directional, ambient } = createDirectionalLightFromAway({
  direction: awayDirection(0, 0, 1),
  diffuse: 0.7,
});

const lights = createSceneLights({ ambient, directional });

const image = await loadImageResourceFromUrl('awayjs/assets/dots.png');
// Flight builds the torus in its native right-handed space while the camera helper mirrors z
// (left-handed AwayJS -> right-handed Flight). The unmirrored mesh renders as the z-reflection of the
// original, flipping the texture along the tube (v) axis; mirror v back to match the AwayJS look.
const texture = createTexture({ image });
texture.uvScale.y = -1;
texture.uvOffset.y = 1;

const material = createStandardPbrMaterial({
  baseColor: 0xffffffff,
  metallic: 0,
  roughness: getPbrRoughnessFromPhongShininess(20),
  baseColorMap: texture,
});

// AwayJS PrimitiveTorusPrefab(radius, tube, segmentsR=32 around the ring, segmentsT=16 around the
// tube). Flight's signature is (radius, tube, radialSegments=around the tube, tubularSegments=around
// the ring), so the counts swap to reproduce the original's tessellation (smoother ring, coarser tube).
const geometry = createTorusMeshGeometry(220, 80, 16, 32);
const torus = createMesh(geometry, [material]);
addNodeChild(scene, torus);

const yAxis = createVector3(0, 1, 0);
const scratchQuat = createQuaternion();
let rotationY = 0;

function frame(): void {
  rotationY -= DEG;

  setQuaternionFromAxisAngle(scratchQuat, yAxis, rotationY);
  copyQuaternion(torus.rotation, scratchQuat);
  invalidateNodeLocalTransform(torus);

  // Draw into the pipeline's HDR target, then ACES tone-map to the canvas so the single directional
  // light's highlights compress into range instead of clipping (matches basic-load-3ds).
  if (pipeline === null) {
    pipeline = createGlRenderEffectPipeline(state, { format: 'rgba16f', depth: 'depth-stencil' });
  }
  beginGlRenderEffectPipeline(state, pipeline);
  renderGlBackground(state);
  const gl = state.gl;
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlScene(state, scene, camera, lights);
  endGlRenderEffectPipeline(state, pipeline, effects);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  (camera.projection as PerspectiveProjection).aspect = width / height;
});

frame();
