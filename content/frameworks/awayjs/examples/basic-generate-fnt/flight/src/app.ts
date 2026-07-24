import type { GlyphAtlas } from '@flighthq/sdk';
import {
  addNodeChild,
  attachKeyboardInput,
  attachWheelInput,
  connectSignal,
  createBitmapText,
  createDisplayContainer,
  createGlCanvasElement,
  createGlRenderState,
  createGlyphAtlas,
  createGlyphSourceFromGlyphAtlas,
  createInputManager,
  createMatrix,
  createWebGlyphRasterizerBackend,
  defaultGlQuadBatchRenderer,
  getGlyphAtlasSurface,
  invalidateNodeLocalContent,
  invalidateNodeLocalTransform,
  loadFontFromUrl,
  prepareDisplayObjectRender,
  QuadBatchKind,
  registerDefaultGlMaterial,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  setGlyphRasterizerBackend,
  updateBitmapText,
} from '@flighthq/sdk';
import { createGlFrameVerifier } from '../../../_shared/flight/src/verify';

let width = window.innerWidth;
let height = window.innerHeight;

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
  backgroundColor: 0xccccccff,
  contextAttributes: { alpha: false, preserveDrawingBuffer: false },
  pixelRatio,
});
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);

registerDefaultGlMaterial(state);
registerRenderer(state, QuadBatchKind, defaultGlQuadBatchRenderer);

const verifyFrame = createGlFrameVerifier(state);

const font = await loadFontFromUrl('awayjs/assets/georgia.ttf', 'Georgia');

setGlyphRasterizerBackend(createWebGlyphRasterizerBackend());

const atlas = createGlyphAtlas({
  fontFamily: font.name,
  fontSize: 128,
  width: 2048,
  height: 2048,
  padding: 5,
});

const glyphSource = createGlyphSourceFromGlyphAtlas(atlas);

const root = createDisplayContainer();
root.x = width / 2;
root.y = height / 2;
invalidateNodeLocalTransform(root);

const BASE_SIZE = 128;

for (let i = 0; i < 300; i++) {
  const size = Math.round(10 + Math.random() * 100);
  const scale = size / BASE_SIZE;

  const bt = createBitmapText(glyphSource, {
    text: '12345\n67890',
    color: 0xff0000ff,
  });
  bt.x = (Math.random() - 0.5) * 1000 * (width / height);
  bt.y = (Math.random() - 0.5) * 1000;
  bt.scaleX = scale;
  bt.scaleY = scale;
  updateBitmapText(bt);
  invalidateNodeLocalContent(bt);
  invalidateNodeLocalTransform(bt);
  addNodeChild(root, bt);
}

showAtlasSurface(atlas);

let cameraX = 0;
let cameraY = 0;
let cameraZ = -500;

function updateCamera(): void {
  const s = 500 / Math.abs(cameraZ);
  root.scaleX = s;
  root.scaleY = s;
  root.x = width / 2 - cameraX * s;
  root.y = height / 2 - cameraY * s;
  invalidateNodeLocalTransform(root);
}

const input = createInputManager();
attachKeyboardInput(input, window);
attachWheelInput(input, canvas);

connectSignal(input.onWheel, (data) => {
  if (data.ctrlKey) {
    cameraZ -= data.deltaY;
    if (cameraZ > -100) cameraZ = -100;
    else if (cameraZ < -2000) cameraZ = -2000;
  } else {
    cameraX += data.deltaX;
    cameraY += data.deltaY;
  }
  updateCamera();
});

function frame(): void {
  prepareDisplayObjectRender(state, root);
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
  verifyFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  const pr = window.devicePixelRatio || 1;
  canvas.width = width * pr;
  canvas.height = height * pr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  state.gl.viewport(0, 0, canvas.width, canvas.height);
  updateCamera();
});

frame();

function showAtlasSurface(glyphAtlas: GlyphAtlas): void {
  const surface = getGlyphAtlasSurface(glyphAtlas);
  if (!surface) return;

  const wrapper = document.createElement('div');
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = surface.width;
  displayCanvas.height = surface.height;
  displayCanvas.style.width = surface.width / pixelRatio + 'px';
  displayCanvas.style.height = surface.height / pixelRatio + 'px';

  const ctx = displayCanvas.getContext('2d');
  if (ctx) {
    if (surface.source) {
      ctx.drawImage(surface.source as CanvasImageSource, 0, 0);
    } else if (surface.data) {
      const imageData = ctx.createImageData(surface.width, surface.height);
      imageData.data.set(surface.data);
      ctx.putImageData(imageData, 0, 0);
    }
  }

  wrapper.appendChild(displayCanvas);
  document.body.appendChild(wrapper);
}
