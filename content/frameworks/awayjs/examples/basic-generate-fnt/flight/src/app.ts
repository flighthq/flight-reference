import type { GlyphAtlas } from '@flighthq/sdk';
import {
  addNodeChild,
  attachKeyboardInput,
  attachWheelInput,
  connectSignal,
  createBitmapText,
  createDisplayContainer,
  createGlyphAtlas,
  createGlyphSourceFromGlyphAtlas,
  createInputManager,
  createWebGlyphRasterizerBackend,
  getGlyphAtlasSurface,
  invalidateNodeLocalContent,
  invalidateNodeLocalTransform,
  loadFontFromUrl,
  QuadBatchKind,
  setGlyphRasterizerBackend,
  updateBitmapText,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const width = window.innerWidth;
const height = window.innerHeight;

const target = await createFunctionalTarget({
  width,
  height,
  background: 0xccccccff,
  kinds: [QuadBatchKind],
});

const canvas = (target.state as { canvas: HTMLCanvasElement }).canvas;

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
  target.render(root);
  requestAnimationFrame(frame);
}

frame();

function showAtlasSurface(glyphAtlas: GlyphAtlas): void {
  const surface = getGlyphAtlasSurface(glyphAtlas);
  if (!surface) return;

  const pixelRatio = window.devicePixelRatio || 1;
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
