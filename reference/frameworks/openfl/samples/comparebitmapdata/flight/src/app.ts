import {
  addNodeChild,
  createBitmap,
  createDisplayObject,
  createImageResourceFromSurface,
  createTextLabel,
  invalidateNodeLocalTransform,
  invalidateNodeRender,
} from '@flighthq/sdk';
import type { Surface } from '@flighthq/surface';
import { cloneSurface, compareSurface, createSurface, fillSurfaceRectangle, setSurfacePixel } from '@flighthq/surface';

import { render, scale } from './render';

const IMG_SIZE = 40;
const CELL_SIZE = IMG_SIZE + 4;
const LABEL_SIZE = 56;

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

function createCheckers(color1: number, color2: number, tileSize = 8): Surface {
  const img = createSurface(IMG_SIZE, IMG_SIZE, color1);
  for (let y = 0; y < IMG_SIZE; y++) {
    for (let x = 0; x < IMG_SIZE; x++) {
      if (((Math.floor(x / tileSize) + Math.floor(y / tileSize)) & 1) === 1) {
        setSurfacePixel(img, x, y, color2);
      }
    }
  }
  return img;
}

function createNoise(seed: number): Surface {
  const img = createSurface(IMG_SIZE, IMG_SIZE);
  let s = seed >>> 0;
  for (let i = 0; i < img.data.length; i++) {
    s = Math.imul(s, 1664525) + 1013904223;
    img.data[i] = s & 0xff;
  }
  return img;
}

function createBall(color: number, alpha = 255): Surface {
  const img = createSurface(IMG_SIZE, IMG_SIZE);
  const cx = IMG_SIZE / 2;
  const cy = IMG_SIZE / 2;
  const r = IMG_SIZE / 2 - 2;

  for (let y = 0; y < IMG_SIZE; y++) {
    for (let x = 0; x < IMG_SIZE; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) {
        setSurfacePixel(img, x, y, (((color & 0xffffff) << 8) | (alpha & 0xff)) >>> 0);
      }
    }
  }

  return img;
}

function createRect(color: number, inset = 4): Surface {
  const img = createSurface(IMG_SIZE, IMG_SIZE);
  fillSurfaceRectangle(
    { surface: img, x: inset, y: inset, width: IMG_SIZE - inset * 2, height: IMG_SIZE - inset * 2 },
    color,
  );
  return img;
}

function addSurface(surface: Surface, x: number, y: number): void {
  const bitmap = createBitmap();
  bitmap.data.image = createImageResourceFromSurface(surface);
  bitmap.x = x;
  bitmap.y = y;
  addNodeChild(root, bitmap);
  invalidateNodeLocalTransform(bitmap);
  invalidateNodeRender(bitmap);
}

function addLabel(
  text: string,
  x: number,
  y: number,
  options: {
    align?: 'center' | 'left' | 'right';
    color?: number;
    rotation?: number;
    size?: number;
    width?: number;
  } = {},
): void {
  const label = createTextLabel();
  label.data.text = text;
  label.data.width = options.width ?? 80;
  label.data.textFormat = {
    align: options.align ?? 'left',
    color: options.color ?? 0xaaaaaa,
    font: 'monospace',
    size: options.size ?? 9,
  };
  label.x = x;
  label.y = y;
  label.rotation = options.rotation ?? 0;
  addNodeChild(root, label);
  invalidateNodeLocalTransform(label);
  invalidateNodeRender(label);
}

function makeNullSurface(): Surface {
  return createSurface(IMG_SIZE, IMG_SIZE, 0x2a2a2aff);
}

function makeIncompatibleSurface(): Surface {
  return createSurface(IMG_SIZE, IMG_SIZE, 0x2a1a1aff);
}

function makeEqualSurface(): Surface {
  return createSurface(IMG_SIZE, IMG_SIZE, 0x1a4a1aff);
}

const sources: Array<{ label: string; img: Surface | null }> = [
  { label: 'Checkers', img: createCheckers(0xffffffff, 0x000000ff) },
  { label: 'Checkers2', img: createCheckers(0xffffffff, 0x808080ff) },
  { label: 'Noise 1', img: createNoise(0xdeadbeef) },
  { label: 'Noise 2', img: createNoise(0xcafebabe) },
  { label: 'Red Ball', img: createBall(0xff0000) },
  { label: 'Yellow Ball', img: createBall(0xffff00) },
  { label: 'Half Alpha', img: createBall(0xff0000, 128) },
  { label: 'Rect', img: createRect(0x0000ffff) },
  { label: 'Rect 2', img: createRect(0x00ffffff, 8) },
  { label: 'Clone', img: null },
  { label: 'Null', img: null },
];

sources[9].img = cloneSurface(sources[4].img!);

const nullSurface = makeNullSurface();
const incompatibleSurface = makeIncompatibleSurface();
const equalSurface = makeEqualSurface();
const count = sources.length;

for (let col = 0; col < count; col++) {
  const x = LABEL_SIZE + col * CELL_SIZE;
  const { label, img } = sources[col];

  addSurface(img ?? nullSurface, x + 2, 2);
  if (img === null) {
    addLabel('null', x + 2, 2 + IMG_SIZE / 2 - 5, {
      align: 'center',
      color: 0x888888,
      size: 10,
      width: IMG_SIZE,
    });
  }

  addLabel(label, x - 12, IMG_SIZE + 12, {
    align: 'center',
    color: 0xaaaaaa,
    rotation: -45,
    size: 9,
    width: 90,
  });
}

for (let row = 0; row < count; row++) {
  const y = LABEL_SIZE + row * CELL_SIZE;
  const { label, img } = sources[row];

  addSurface(img ?? nullSurface, 2, y + 2);
  if (img === null) {
    addLabel('null', 2, y + 2 + IMG_SIZE / 2 - 5, {
      align: 'center',
      color: 0x888888,
      size: 10,
      width: IMG_SIZE,
    });
  }

  addLabel(label, 2, y + IMG_SIZE + 14, {
    align: 'left',
    color: 0xaaaaaa,
    size: 9,
    width: LABEL_SIZE + IMG_SIZE,
  });

  for (let col = 0; col < count; col++) {
    const x = LABEL_SIZE + col * CELL_SIZE;
    const other = sources[col].img;

    if (img === null || other === null) {
      addSurface(nullSurface, x + 2, y + 2);
      continue;
    }

    if (img.width !== other.width || img.height !== other.height) {
      addSurface(incompatibleSurface, x + 2, y + 2);
      addLabel('≠', x + 2, y + 2 + IMG_SIZE / 2 - 5, {
        align: 'center',
        color: 0xff4444,
        size: 11,
        width: IMG_SIZE,
      });
      continue;
    }

    const result = compareSurface(img, other);
    if (result === null) {
      addSurface(equalSurface, x + 2, y + 2);
      addLabel('=', x + 2, y + 2 + IMG_SIZE / 2 - 5, {
        align: 'center',
        color: 0x4caf50,
        size: 11,
        width: IMG_SIZE,
      });
      continue;
    }

    addSurface(result, x + 2, y + 2);
  }
}

function enterFrame(): void {
  render(root);
  requestAnimationFrame(enterFrame);
}

enterFrame();
