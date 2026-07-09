import type { ImageResource } from '@flighthq/sdk';
import {
  addNodeChild,
  createBitmap,
  createDisplayObject,
  createImageResourceFromSurface,
  createSurfaceFromImageResource,
  loadImageResourceFromUrl,
} from '@flighthq/sdk';
import { compareSurface } from '@flighthq/surface';

import { render, scale } from './render';

const SIZE = 32;
const SPACING = 10;
const CELL = SIZE + SPACING;
const HEADER_OFFSET = SIZE + 20;

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const sourceNames = [
  'checkers',
  'checkers_alpha',
  'noise1',
  'noise2',
  'red_ball',
  'red_ball_alpha',
  'red_ball_half_alpha',
  'yellow_ball',
  'rectangle',
  'rectangle2',
];

const [sourceImages, indicator0, indicatorNull, indicatorDisposed, indicatorError] = await Promise.all([
  Promise.all(sourceNames.map((name) => loadImageResourceFromUrl(`assets/${SIZE}/${name}.png`))),
  loadImageResourceFromUrl(`assets/${SIZE}/0.png`),
  loadImageResourceFromUrl(`assets/${SIZE}/null.png`),
  loadImageResourceFromUrl(`assets/${SIZE}/disposed.png`),
  loadImageResourceFromUrl(`assets/${SIZE}/error.png`),
]);

const sourceSurfaces = sourceImages.map((img) => createSurfaceFromImageResource(img));

const entries: ImageResource[] = [...sourceImages, indicatorNull, indicatorDisposed];
const count = entries.length;

function addImage(image: ImageResource, x: number, y: number): void {
  const bmp = createBitmap();
  bmp.data.image = image;
  bmp.x = x;
  bmp.y = y;
  addNodeChild(root, bmp);
}

function getSurface(index: number) {
  return index < sourceSurfaces.length ? sourceSurfaces[index] : null;
}

for (let col = 0; col < count; col++) {
  addImage(entries[col], HEADER_OFFSET + col * CELL, 10);
}

for (let row = 0; row < count; row++) {
  addImage(entries[row], 10, HEADER_OFFSET + row * CELL);
}

for (let row = 0; row < count; row++) {
  const rowSurface = getSurface(row);

  for (let col = 0; col < count; col++) {
    const x = HEADER_OFFSET + col * CELL;
    const y = HEADER_OFFSET + row * CELL;
    const colSurface = getSurface(col);

    if (rowSurface === null || colSurface === null) {
      addImage(indicatorError, x, y);
      continue;
    }

    const diff = compareSurface(rowSurface, colSurface);
    if (diff === null) {
      addImage(indicator0, x, y);
    } else {
      addImage(createImageResourceFromSurface(diff), x, y);
    }
  }
}

function enterFrame(): void {
  render(root);
  requestAnimationFrame(enterFrame);
}

enterFrame();
