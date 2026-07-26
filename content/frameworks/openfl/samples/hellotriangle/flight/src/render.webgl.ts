import { drawGlScene3D } from '@flighthq/scene3d-gl';
import type { Camera3D, Scene3DLights, Node3D } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  registerVertexColorGlMaterial,
  renderGlBackground,
} from '@flighthq/sdk';

const width = 550;
const height = 400;
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

registerVertexColorGlMaterial(state);

export function render(scene: Readonly<Node3D>, camera: Readonly<Camera3D>, lights: Readonly<Scene3DLights>): void {
  renderGlBackground(state);
  const gl = state.gl;
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.clearDepth(1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawGlScene3D(state, scene, camera, lights);
}
