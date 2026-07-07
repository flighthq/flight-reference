import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  createDisplayObject,
  createShape,
  createTextLabel,
  invalidateNodeRender,
} from '@flighthq/sdk';

import { render, scale } from './render';

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const background = createShape();
const header = createShape();
const column = createShape();
const label = createTextLabel();
label.data.text = 'SWF layout';
label.data.textFormat = { size: 26, color: 0xffffffff };
label.x = 24;
label.y = 18;

addNodeChild(root, background);
addNodeChild(root, header);
addNodeChild(root, column);
addNodeChild(root, label);

function resize(): void {
  const width = 550;
  const height = 400;
  appendShapeBeginFill(background, 0xf5f5f5);
  appendShapeRectangle(background, 0, 0, width, height);
  appendShapeBeginFill(header, 0x24afc4);
  appendShapeRectangle(header, 0, 0, width, 70);
  appendShapeBeginFill(column, 0xd8eef2);
  appendShapeRectangle(column, 360, 70, 170, height - 90);
  invalidateNodeRender(background);
  invalidateNodeRender(header);
  invalidateNodeRender(column);
}

resize();

function enterFrame(): void {
  render(root);
  requestAnimationFrame(enterFrame);
}

enterFrame();
