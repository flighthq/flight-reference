import type { Camera3D, GlRenderEffectPipeline, Scene3DLights, Node3D } from '@flighthq/sdk';
import {
  beginGlRenderEffectPipeline,
  createGlCanvasElement,
  createGlRenderEffectPipeline,
  createGlRenderState,
  drawGlScene3D,
  endGlRenderEffectPipeline,
  registerStandardGlTextureResolvers,
  registerGlUnlitMaterial,
  renderGlBackground,
} from '@flighthq/sdk';

const width = 800;
const height = 600;
const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(width, height, pixelRatio);

const mount = document.getElementById('app');
if (mount) {
  mount.replaceWith(canvas);
} else {
  document.body.appendChild(canvas);
}

document.body.style.margin = '0';

const state = createGlRenderState(canvas, {
  backgroundColor: 0xffffffff,
  contextAttributes: { alpha: false, depth: true, preserveDrawingBuffer: false },
  pixelRatio,
});

registerStandardGlTextureResolvers(state);
registerGlUnlitMaterial(state);

const pipeline: GlRenderEffectPipeline = createGlRenderEffectPipeline(state, {
  depth: 'depth-stencil',
  format: 'rgba8',
});

export function render(scene: Readonly<Node3D>, camera: Readonly<Camera3D>, lights: Readonly<Scene3DLights>): void {
  beginGlRenderEffectPipeline(state, pipeline);
  renderGlBackground(state);
  state.gl.depthMask(true);
  state.gl.clearDepth(1);
  state.gl.clear(state.gl.DEPTH_BUFFER_BIT);
  drawGlScene3D(state, scene, camera, lights);
  endGlRenderEffectPipeline(state, pipeline, []);
}
