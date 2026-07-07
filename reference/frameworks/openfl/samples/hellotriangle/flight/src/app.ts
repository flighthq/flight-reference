import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeLineTo,
  appendShapeMoveTo,
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

const triangle = createShape();
appendShapeBeginFill(triangle, 0xff4433);
appendShapeMoveTo(triangle, 0, -90);
appendShapeLineTo(triangle, 90, 70);
appendShapeLineTo(triangle, -90, 70);
appendShapeLineTo(triangle, 0, -90);
triangle.x = 275;
triangle.y = 200;
addNodeChild(root, triangle);

let angle = 0;
const app = createApplication();
connectSignal(app.onUpdate, (delta) => {
  angle += delta * 0.08;
  triangle.rotation = angle;
  invalidateNodeLocalTransform(triangle);
});
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
