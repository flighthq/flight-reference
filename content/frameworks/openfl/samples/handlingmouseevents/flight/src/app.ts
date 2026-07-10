import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeLineStyle,
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
let tweening = false;
let offsetX = 0;
let offsetY = 0;

function hitTestLogo(px: number, py: number): boolean {
  return px >= logo.x && px <= logo.x + image.width && py >= logo.y && py <= logo.y + image.height;
}

const input = createInputManager();
attachPointerInput(input, container);

connectSignal(input.onPointerDown, (data) => {
  if (tweening) return;
  if (!hitTestLogo(data.x, data.y)) return;
  dragging = true;
  offsetX = logo.x - data.x;
  offsetY = logo.y - data.y;
});

connectSignal(input.onPointerMove, (data) => {
  if (dragging) {
    logo.x = data.x + offsetX;
    logo.y = data.y + offsetY;
    invalidateNodeLocalTransform(logo);
  } else if (!tweening) {
    container.style.cursor = hitTestLogo(data.x, data.y) ? 'pointer' : '';
  }
});

connectSignal(input.onPointerUp, (data) => {
  dragging = false;
  const hit =
    data.x >= destination.x &&
    data.x <= destination.x + image.width + 10 &&
    data.y >= destination.y &&
    data.y <= destination.y + image.height + 10;
  if (hit) {
    tweening = true;
    const tween = createTween(manager, logo, 1000, { x: destination.x + 5, y: destination.y + 5 });
    connectSignal(tween.onUpdate, () => invalidateNodeLocalTransform(logo));
    connectSignal(tween.onComplete, () => {
      tweening = false;
    });
  }
});

const app = createApplication();
connectSignal(app.onUpdate, (delta) => updateTweens(manager, delta));
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
