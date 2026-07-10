// Requires: assets/openfl.png
// Port of the OpenFL clip-rect functional test. Tests rectangular clipping on bitmaps and rich text.
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createClipRegionFromRectangle,
  createDisplayContainer,
  createRichText,
  createShape,
  loadImageResourceFromUrl,
  RichTextKind,
  setDisplayObjectClip,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const { height, render, width } = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xff000000,
  clip: true,
  kinds: [BitmapKind, RichTextKind, ShapeKind],
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

// Background ghost bitmaps - two rows of 4
for (let i = 0; i < 8; i++) {
  const ghost = createBitmap();
  ghost.data.image = image;
  ghost.data.smoothing = true;
  ghost.x = (i % 4) * (W / 4) + W / 8 - iw / 2;
  ghost.y = i < 4 ? ih / 2 : H / 2 + ih / 2;
  ghost.alpha = 0.3;
  addNodeChild(root, ghost);
}

// Top row: 4 bitmaps with different scroll rect configurations
for (let i = 0; i < 4; i++) {
  const bmpX = i * (W / 4) + W / 8 - iw / 2;
  const bmpY = ih / 2;

  if (i === 2 || i === 3) {
    const container = createDisplayContainer();
    container.x = bmpX;
    container.y = bmpY;
    addNodeChild(root, container);

    const bmp = createBitmap();
    bmp.data.image = image;
    bmp.data.smoothing = true;
    addNodeChild(container, bmp);

    if (i === 2) {
      setDisplayObjectClip(container, createClipRegionFromRectangle({ x: 0, y: 0, width: iw / 2, height: ih / 2 }));
      bmp.x = -iw / 2;
      bmp.y = -ih / 2;
    } else {
      setDisplayObjectClip(container, createClipRegionFromRectangle({ x: 0, y: 0, width: W * 10, height: H * 10 }));
      bmp.x = -W * 2;
      bmp.y = -H * 2;
    }
  } else {
    const bmp = createBitmap();
    bmp.data.image = image;
    bmp.data.smoothing = true;
    bmp.x = bmpX;
    bmp.y = bmpY;
    addNodeChild(root, bmp);

    if (i === 1)
      setDisplayObjectClip(bmp, createClipRegionFromRectangle({ x: 0, y: 0, width: iw / 2, height: ih / 2 }));
  }
}

// Bottom row: 4 text fields with different scroll rect configurations
const textColors = [0xaa1100, 0x11aa00, 0x1100aa, 0x660066];
const textValues = ['Text Field 1', 'Text Field 2', 'Text Field 3', 'Text Field 4'];
for (let i = 0; i < 4; i++) {
  const tfX = i * (W / 4);
  const tfY = H / 2 + H / 4;

  if (i === 2 || i === 3) {
    const container = createDisplayContainer();
    container.x = tfX;
    container.y = tfY;
    addNodeChild(root, container);

    const tf = createRichText();
    tf.data.defaultTextFormat = { font: 'sans-serif', size: 32, color: textColors[i], align: 'center' };
    tf.data.width = 400;
    tf.data.height = 400;
    tf.data.text = textValues[i];
    addNodeChild(container, tf);

    if (i === 2) {
      setDisplayObjectClip(container, createClipRegionFromRectangle({ x: 0, y: 0, width: 200, height: 20 }));
      tf.x = 0;
      tf.y = -40;
    } else {
      setDisplayObjectClip(container, createClipRegionFromRectangle({ x: 0, y: 0, width: W * 10, height: H * 10 }));
      tf.x = -W * 2;
      tf.y = -H * 2;
    }
  } else {
    const tf = createRichText();
    tf.data.defaultTextFormat = { font: 'sans-serif', size: 32, color: textColors[i], align: 'center' };
    tf.x = tfX;
    tf.y = tfY;
    tf.data.width = 400;
    tf.data.height = 400;
    tf.data.text = textValues[i];
    addNodeChild(root, tf);

    if (i === 1) setDisplayObjectClip(tf, createClipRegionFromRectangle({ x: 0, y: 0, width: 200, height: 200 }));
  }
}

render(root);
