import type { RichText } from '@flighthq/sdk';
import {
  addNodeChild,
  attachKeyboardInput,
  attachTextInput,
  attachWheelInput,
  connectInputToTextInput,
  connectSignal,
  createDisplayContainer,
  createInputManager,
  createRichText,
  createTextInputManager,
  enableTextInput,
  focusTextInput,
  invalidateNodeLocalTransform,
  loadFontFromUrl,
  prepareDisplayObjectRender,
  RichTextKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const width = window.innerWidth;
const height = window.innerHeight;

const target = await createFunctionalTarget({
  width,
  height,
  background: 0xccccccff,
  kinds: [RichTextKind],
});

const canvas = (target.state as { canvas: HTMLCanvasElement }).canvas;

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
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}

frame();
