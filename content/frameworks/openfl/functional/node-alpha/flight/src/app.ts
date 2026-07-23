import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  createDisplayContainer,
  createShape,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const { height, render, width } = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xffffffff,
  kinds: [ShapeKind],
});

const ROWS = 9;
const root = createDisplayContainer();

const W = width;
const H = height;
const cellW = W / 4;
const cellH = H / ROWS;

for (let y = 0; y < ROWS; y++) {
  const alpha = 1 - y / 8;
  const frag = Math.trunc(alpha * 255);
  const solidColor = (frag << 16) | (frag << 8) | frag;

  const ref = createShape();
  appendShapeBeginFill(ref, solidColor);
  appendShapeRectangle(ref, 0, y * cellH, cellW, cellH);
  appendShapeEndFill(ref);
  addNodeChild(root, ref);

  for (const col of [1, 2]) {
    const base = createShape();
    appendShapeBeginFill(base, 0xffffff);
    appendShapeRectangle(base, col * cellW, y * cellH, cellW, cellH);
    appendShapeEndFill(base);
    addNodeChild(root, base);

    const overlay = createShape();
    appendShapeBeginFill(overlay, 0x000000, 1 - alpha);
    appendShapeRectangle(overlay, col * cellW, y * cellH, cellW, cellH);
    appendShapeEndFill(overlay);
    addNodeChild(root, overlay);
  }

  const base3 = createShape();
  appendShapeBeginFill(base3, 0xffffff);
  appendShapeRectangle(base3, 3 * cellW, y * cellH, cellW, cellH);
  appendShapeEndFill(base3);
  addNodeChild(root, base3);

  const overlay3 = createShape();
  appendShapeBeginFill(overlay3, frag << 24, 1.0);
  appendShapeRectangle(overlay3, 3 * cellW, y * cellH, cellW, cellH);
  appendShapeEndFill(overlay3);
  addNodeChild(root, overlay3);
}

render(root);
