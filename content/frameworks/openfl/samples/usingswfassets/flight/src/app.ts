import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  attachWindowResize,
  clearShapeCommands,
  connectSignal,
  createApplicationWindow,
  createDisplayObject,
  createShape,
  createTextLabel,
  invalidateNodeRender,
} from '@flighthq/sdk';

import { container, render, scale, setSize } from './render';

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

const columnOffsetHeight = -90;
const headerOffsetWidth = 0;

function drawRect(
  shape: ReturnType<typeof createShape>,
  color: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  clearShapeCommands(shape);
  appendShapeBeginFill(shape, color);
  appendShapeRectangle(shape, x, y, w, h);
  invalidateNodeRender(shape);
}

function resize(width: number, height: number): void {
  setSize(width, height);
  drawRect(background, 0xf5f5f5, 0, 0, width, height);
  drawRect(header, 0x24afc4, 0, 0, Math.max(width + headerOffsetWidth, 0), 70);
  drawRect(column, 0xd8eef2, 360, 70, 170, Math.max(height + columnOffsetHeight, 0));
  render(root);
}

const win = createApplicationWindow();
connectSignal(win.onResize, () => resize(win.width, win.height));
attachWindowResize(win, container);
resize(window.innerWidth, window.innerHeight);
