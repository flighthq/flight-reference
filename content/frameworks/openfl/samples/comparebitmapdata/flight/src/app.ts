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

const [
  sourceImages,
  indicator0,
  indicatorMinus1,
  indicatorMinus2,
  indicatorMinus3,
  indicatorMinus4,
  indicatorNull,
  indicatorDisposed,
  indicatorError,
] = await Promise.all([
  Promise.all(sourceNames.map((name) => loadImageResourceFromUrl(`openfl/assets/${SIZE}/${name}.png`))),
  loadImageResourceFromUrl(`openfl/assets/${SIZE}/0.png`),
  loadImageResourceFromUrl(`openfl/assets/${SIZE}/minus1.png`),
  loadImageResourceFromUrl(`openfl/assets/${SIZE}/minus2.png`),
  loadImageResourceFromUrl(`openfl/assets/${SIZE}/minus3.png`),
  loadImageResourceFromUrl(`openfl/assets/${SIZE}/minus4.png`),
  loadImageResourceFromUrl(`openfl/assets/${SIZE}/null.png`),
  loadImageResourceFromUrl(`openfl/assets/${SIZE}/disposed.png`),
  loadImageResourceFromUrl(`openfl/assets/${SIZE}/error.png`),
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

function getSourceImage(index: number) {
  return index < sourceImages.length ? sourceImages[index] : null;
}

for (let col = 0; col < count; col++) {
  addImage(entries[col], HEADER_OFFSET + col * CELL, 10);
}

for (let row = 0; row < count; row++) {
  addImage(entries[row], 10, HEADER_OFFSET + row * CELL);
}

// OpenFL BitmapData.compare returns:
//   BitmapData (diff)  when same size and different pixels
//   0                  when identical
//  -1                  when other is not a BitmapData (null)
//  -2                  when other is disposed
//  -3                  when widths differ
//  -4                  when heights differ
for (let row = 0; row < count; row++) {
  const rowSurface = getSurface(row);

  for (let col = 0; col < count; col++) {
    const x = HEADER_OFFSET + col * CELL;
    const y = HEADER_OFFSET + row * CELL;
    const colSurface = getSurface(col);

    if (rowSurface === null && colSurface === null) {
      addImage(indicatorError, x, y);
      continue;
    }

    if (rowSurface === null || colSurface === null) {
      addImage(indicatorMinus1, x, y);
      continue;
    }

    const rowImg = getSourceImage(row)!;
    const colImg = getSourceImage(col)!;

    if (rowImg.width !== colImg.width) {
      addImage(indicatorMinus3, x, y);
      continue;
    }

    if (rowImg.height !== colImg.height) {
      addImage(indicatorMinus4, x, y);
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
