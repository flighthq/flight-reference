import type { Camera3D, Scene3DLights, Node3D } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  createGlRenderTarget,
  presentGlScene3D,
  registerUnlitGlMaterial,
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

registerUnlitGlMaterial(state);

const target = createGlRenderTarget(state, {
  width: canvas.width,
  height: canvas.height,
  depth: 'depth-stencil',
  colorSpace: 'linear',
});

export function render(scene: Readonly<Node3D>, camera: Readonly<Camera3D>, lights: Readonly<Scene3DLights>): void {
  presentGlScene3D(state, target, scene, camera, lights);
}
