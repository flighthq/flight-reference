import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  connectSignal,
  createApplication,
  createDisplayObject,
  createShape,
  invalidateNodeLocalTransform,
  startApplicationLoop,
} from '@flighthq/sdk';

import { render, scale } from './render';

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const square = createShape();
appendShapeBeginFill(square, 0x24afc4);
appendShapeRectangle(square, 0, 0, 100, 100);
square.y = 50;
addNodeChild(root, square);

let speed = 0.3;
const app = createApplication();
connectSignal(app.onUpdate, (delta) => {
  if (square.x + 100 >= 550 || square.x < 0) speed *= -1;
  square.x += speed * delta;
  invalidateNodeLocalTransform(square);
});
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
