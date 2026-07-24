import type { GlyphAtlas, RichText } from '@flighthq/sdk';
import {
  addNodeChild,
  attachKeyboardInput,
  attachTextInput,
  attachWheelInput,
  connectInputToTextInput,
  connectSignal,
  createDisplayContainer,
  createGlCanvasElement,
  createGlRenderState,
  createGlyphAtlas,
  createInputManager,
  createMatrix,
  createRichText,
  createTextInputManager,
  createWebGlyphRasterizerBackend,
  defaultGlRichTextRenderer,
  enableGlTextInput,
  enableTextInput,
  focusTextInput,
  getGlyphAtlasSurface,
  getGlyphAtlasEntry,
  invalidateNodeLocalTransform,
  loadFontFromUrl,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  RichTextKind,
  setGlyphRasterizerBackend,
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
registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
enableGlTextInput();

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

// The displayed fields use RichText so they can retain TextField behavior, but this remains an FNT
// generation demo: rasterize the digits into the generated atlas before showing its backing surface.
for (const character of '0123456789') {
  getGlyphAtlasEntry(atlas, character.codePointAt(0)!);
}

const root = createDisplayContainer();
root.x = width / 2;
root.y = height / 2;
invalidateNodeLocalTransform(root);

const textFields: RichText[] = [];

for (let i = 0; i < 300; i++) {
  const size = Math.round(10 + Math.random() * 100);
  const tf = createRichText();
  tf.data.defaultTextFormat = {
    font: font.name,
    color: 0xff0000,
    size,
  };
  tf.data.text = '12345\n67890';
  tf.data.autoSize = 'right';
  tf.data.background = true;
  tf.data.border = true;
  tf.data.borderColor = 0xff0000;
  tf.data.multiline = true;
  tf.data.selectable = true;
  tf.x = (Math.random() - 0.5) * 1000 * (width / height);
  tf.y = (Math.random() - 0.5) * 1000;
  enableTextInput(tf);
  addNodeChild(root, tf);
  textFields.push(tf);
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
attachTextInput(input, canvas);
attachWheelInput(input, canvas);

const textInputManager = createTextInputManager();
connectInputToTextInput(input, textInputManager);

let focusIndex = -1;
connectSignal(input.onKeyDown, (data) => {
  if (data.key === 'Tab') {
    focusIndex = (focusIndex + 1) % textFields.length;
    focusTextInput(textInputManager, textFields[focusIndex]!);
  }
});

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
