import {
  addNodeChild,
  applySurfaceColorTransform,
  applySurfaceThreshold,
  copySurfaceChannel,
  copySurfacePixels,
  createBitmap,
  createDisplayObject,
  createImageResourceFromSurface,
  createSurface,
  createSurfaceFromCanvas,
  createSurfaceFromImageResource,
  createSurfaceRegion,
  floodFillSurface,
  ImageChannel,
  loadImageResourceFromUrl,
  scrollSurface,
} from '@flighthq/sdk';

import { render, scale } from './render';

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const image = await loadImageResourceFromUrl('assets/openfl.png');
const imageSurface = createSurfaceFromImageResource(image);
const imageRegion = createSurfaceRegion(imageSurface);

function addImage(
  source: Readonly<typeof image>,
  x: number,
  y: number,
  opts: { alpha?: number; rotation?: number; scaleX?: number; scaleY?: number } = {},
): void {
  const bitmap = createBitmap();
  bitmap.data.image = source;
  bitmap.data.smoothing = true;
  bitmap.x = x;
  bitmap.y = y;
  bitmap.alpha = opts.alpha ?? 1;
  bitmap.rotation = opts.rotation ?? 0;
  bitmap.scaleX = opts.scaleX ?? 1;
  bitmap.scaleY = opts.scaleY ?? 1;
  addNodeChild(root, bitmap);
}

function addSurface(
  surface: ReturnType<typeof createSurface>,
  x: number,
  y: number,
  opts: { alpha?: number; rotation?: number; scaleX?: number; scaleY?: number } = {},
): void {
  addImage(createImageResourceFromSurface(surface), x, y, opts);
}

addImage(image, 20, 20);
addImage(image, 130, 120, { rotation: -90 });

const colorTransformed = createSurfaceFromImageResource(image);
applySurfaceColorTransform(createSurfaceRegion(colorTransformed), imageRegion, {
  alphaMultiplier: 0.5,
  alphaOffset: 0,
  blueMultiplier: 1,
  blueOffset: 0,
  greenMultiplier: 0,
  greenOffset: 0,
  redMultiplier: 0.5,
  redOffset: 20,
});
addSurface(colorTransformed, 240, 20);

const tiled = createSurface(image.width, image.height);
copySurfacePixels(
  createSurfaceRegion(tiled, -image.width / 2, -image.height / 2, image.width, image.height),
  imageRegion,
);
copySurfacePixels(
  createSurfaceRegion(tiled, -image.width / 2, image.height / 2, image.width, image.height),
  imageRegion,
);
copySurfacePixels(
  createSurfaceRegion(tiled, image.width / 2, -image.height / 2, image.width, image.height),
  imageRegion,
);
copySurfacePixels(
  createSurfaceRegion(tiled, image.width / 2, image.height / 2, image.width, image.height),
  imageRegion,
);
addSurface(tiled, 350, 20);

const composited = createSurface(image.width, image.height, 0xeeeeeeff);
copySurfacePixels(createSurfaceRegion(composited), imageRegion, true);
addSurface(composited, 460, 20);

const copiedChannel = createSurfaceFromImageResource(image);
copySurfaceChannel(
  createSurfaceRegion(copiedChannel, 20, 0, image.width, image.height),
  ImageChannel.Green,
  imageRegion,
  ImageChannel.Blue,
);
addSurface(copiedChannel, 570, 20);

const floodFilled = createSurfaceFromImageResource(image);
floodFillSurface(floodFilled, 0, 0, 0xeeeeeeff);
addSurface(floodFilled, 20, 140);

const drawCanvas = document.createElement('canvas');
drawCanvas.width = image.width;
drawCanvas.height = image.height;
const drawContext = drawCanvas.getContext('2d');
if (drawContext === null || image.source === null) {
  throw new Error('UsingBitmapData requires a 2D canvas context and image source');
}
drawContext.save();
drawContext.globalAlpha = 0.4;
drawContext.scale(2, 1);
drawContext.drawImage(image.source, 0, 0);
drawContext.restore();
const drawn = createSurfaceFromCanvas(drawCanvas);
addSurface(drawn, 130, 140);

const scrolled = createSurfaceFromImageResource(image);
scrollSurface(scrolled, image.width / 2, 0);
addSurface(scrolled, 240, 140);

const thresholded = createSurfaceFromImageResource(image);
applySurfaceThreshold(
  createSurfaceRegion(thresholded, 40, 0, image.width, image.height),
  imageRegion,
  '>',
  0x00000033,
  0x33333388,
  0x000000ff,
);
addSurface(thresholded, 350, 140);

function enterFrame(): void {
  render(root);
  requestAnimationFrame(enterFrame);
}

enterFrame();
