import type { Tween } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeLineStyle,
  appendShapeRectangle,
  attachPointerInput,
  cancelTween,
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
appendShapeLineStyle(destination, 1, 0xcccccc);
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
let activeTween: Tween | null = null;

function hitTestLogo(px: number, py: number): boolean {
  return px >= logo.x && px <= logo.x + image.width && py >= logo.y && py <= logo.y + image.height;
}

const input = createInputManager();
attachPointerInput(input, container);

connectSignal(input.onPointerDown, (data) => {
  const x = data.x / scale;
  const y = data.y / scale;
  if (!hitTestLogo(x, y)) return;
  if (activeTween !== null) {
    cancelTween(activeTween);
    activeTween = null;
  }
  dragging = true;
  offsetX = logo.x - x;
  offsetY = logo.y - y;
});

connectSignal(input.onPointerMove, (data) => {
  const x = data.x / scale;
  const y = data.y / scale;
  if (dragging) {
    logo.x = x + offsetX;
    logo.y = y + offsetY;
    invalidateNodeLocalTransform(logo);
  } else {
    container.style.cursor = hitTestLogo(x, y) ? 'pointer' : '';
  }
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
    activeTween = createTween(manager, logo, 1000, { x: destination.x + 5, y: destination.y + 5 });
    connectSignal(activeTween.onUpdate, () => invalidateNodeLocalTransform(logo));
    connectSignal(activeTween.onComplete, () => {
      activeTween = null;
    });
  }
});

const app = createApplication();
connectSignal(app.onUpdate, (delta) => updateTweens(manager, delta));
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
