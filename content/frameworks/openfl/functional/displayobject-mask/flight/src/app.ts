import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createClipRegionFromRectangle,
  createDisplayContainer,
  createShape,
  loadImageResourceFromUrl,
  setDisplayObjectClip,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const { height, render, width } = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xffffffff,
  clip: true,
  kinds: [BitmapKind, ShapeKind],
});

const root = createDisplayContainer();
const W = width;
const H = height;

const bg = createShape();
appendShapeBeginFill(bg, 0xffffff);
appendShapeRectangle(bg, 0, 0, W, H);
appendShapeEndFill(bg);
addNodeChild(root, bg);

const image = await loadImageResourceFromUrl('assets/openfl.png');
const iw = image.width;
const ih = image.height;

const maskOffsets: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: 0 },
  { dx: -10, dy: -10 },
  { dx: iw / 4, dy: ih / 4 },
  { dx: W * 10, dy: H * 10 },
];

for (let i = 0; i < 4; i++) {
  const bx = (i % 2) * (W / 3) + W / 6 - iw / 2;
  const by = i < 2 ? ih / 2 : H / 2 + ih / 2;
  const { dx, dy } = maskOffsets[i];

  const bgBitmap = createBitmap();
  bgBitmap.data.image = image;
  bgBitmap.data.smoothing = true;
  bgBitmap.alpha = 0.3;
  bgBitmap.x = bx;
  bgBitmap.y = by;
  addNodeChild(root, bgBitmap);

  const bgMask = createBitmap();
  bgMask.data.image = image;
  bgMask.data.smoothing = true;
  bgMask.alpha = 0.3;
  bgMask.x = bx + dx;
  bgMask.y = by + dy;
  addNodeChild(root, bgMask);

  const bmp = createBitmap();
  bmp.data.image = image;
  bmp.data.smoothing = true;
  bmp.x = bx;
  bmp.y = by;
  addNodeChild(root, bmp);

  setDisplayObjectClip(bmp, createClipRegionFromRectangle({ x: dx, y: dy, width: iw, height: ih }));
}

const alphaX = 2 * (W / 3) + W / 6 - iw / 2;

const alphaTop = createBitmap();
alphaTop.data.image = image;
alphaTop.data.smoothing = true;
alphaTop.x = alphaX;
alphaTop.y = ih / 2;
addNodeChild(root, alphaTop);

const alphaBottom = createBitmap();
alphaBottom.data.image = image;
alphaBottom.data.smoothing = true;
alphaBottom.x = alphaX;
alphaBottom.y = H / 2 + ih / 2;
addNodeChild(root, alphaBottom);

render(root);
