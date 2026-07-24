import type { RichText } from '@flighthq/sdk';
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
  createInputManager,
  createMatrix,
  createRichText,
  createTextInputManager,
  defaultGlRichTextRenderer,
  enableTextInput,
  focusTextInput,
  invalidateNodeLocalTransform,
  loadFontFromUrl,
  prepareDisplayObjectRender,
  registerDefaultGlMaterial,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  RichTextKind,
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

const verifyFrame = createGlFrameVerifier(state);

const font = await loadFontFromUrl('awayjs/assets/georgia.ttf', 'Georgia');

const root = createDisplayContainer();
root.x = width / 2;
root.y = height / 2;
invalidateNodeLocalTransform(root);

const textFields: RichText[] = [];

for (let i = 0; i < 30; i++) {
  const tf = createRichText();
  tf.data.defaultTextFormat = {
    font: font.name,
    color: 0xff0000,
    size: 40,
  };
  tf.data.text = '12345\n67890';
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

let focusIndex = -1;

const input = createInputManager();
attachKeyboardInput(input, window);
attachTextInput(input, canvas);
attachWheelInput(input, canvas);

const textInputManager = createTextInputManager();
connectInputToTextInput(input, textInputManager);

connectSignal(input.onKeyDown, (data) => {
  if (data.key === 'Tab') {
    focusIndex = (focusIndex + 1) % textFields.length;
    focusTextInput(textInputManager, textFields[focusIndex]!);
  }
});

let cameraX = 0;
let cameraY = 0;
let cameraZ = -500;

function updateCamera(): void {
  const scale = 500 / Math.abs(cameraZ);
  root.scaleX = scale;
  root.scaleY = scale;
  root.x = width / 2 - cameraX * scale;
  root.y = height / 2 - cameraY * scale;
  invalidateNodeLocalTransform(root);
}

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
