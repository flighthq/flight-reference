import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  attachPointerInput,
  connectSignal,
  createApplication,
  createBitmap,
  createDisplayObject,
  createInputManager,
  createShape,
  createTween,
  createTweenManager,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  startApplicationLoop,
  updateTweens,
} from '@flighthq/sdk';

import { container, render, scale } from './render';

const image = await loadImageResourceFromUrl('assets/openfl.png');
const manager = createTweenManager();
const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const destination = createShape();
appendShapeBeginFill(destination, 0xf5f5f5);
appendShapeRectangle(destination, 0, 0, image.width + 10, image.height + 10);
destination.x = 300;
destination.y = 95;
addNodeChild(root, destination);

const logo = createBitmap();
logo.data.image = image;
logo.data.smoothing = true;
logo.x = 100;
logo.y = 100;
addNodeChild(root, logo);

let dragging = false;
let offsetX = 0;
let offsetY = 0;
const input = createInputManager();
attachPointerInput(input, container);
connectSignal(input.onPointerDown, (data) => {
  const x = data.x / scale;
  const y = data.y / scale;
  if (x < logo.x || x > logo.x + image.width || y < logo.y || y > logo.y + image.height) return;
  dragging = true;
  offsetX = logo.x - x;
  offsetY = logo.y - y;
});
connectSignal(input.onPointerMove, (data) => {
  if (!dragging) return;
  logo.x = data.x / scale + offsetX;
  logo.y = data.y / scale + offsetY;
  invalidateNodeLocalTransform(logo);
});
connectSignal(input.onPointerUp, (data) => {
  dragging = false;
  const x = data.x / scale;
  const y = data.y / scale;
  const hit =
    x >= destination.x &&
    x <= destination.x + image.width + 10 &&
    y >= destination.y &&
    y <= destination.y + image.height + 10;
  if (hit) {
    const tween = createTween(manager, logo, 1000, { x: destination.x + 5, y: destination.y + 5 });
    connectSignal(tween.onUpdate, () => invalidateNodeLocalTransform(logo));
  }
});

const app = createApplication();
connectSignal(app.onUpdate, (delta) => updateTweens(manager, delta));
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
