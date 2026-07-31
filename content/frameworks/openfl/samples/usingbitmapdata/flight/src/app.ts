import {
  addNodeChild,
  applyBitmapColorScaleBias,
  applyBitmapThreshold,
  copyBitmapChannel,
  copyBitmapPixels,
  createDisplayObject,
  createImageResourceFromBitmap,
  createBitmap,
  createBitmapFromCanvas,
  captureBitmapFromImageResource,
  createBitmapRegion,
  createSprite,
  createTexture,
  floodFillBitmap,
  ImageChannel,
  loadImageResourceFromUrl,
  setSpriteTexture,
} from '@flighthq/sdk';

import { render, scale } from './render';

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const image = await loadImageResourceFromUrl('openfl/images/openfl_icon.png');
const imageSurface = captureBitmapFromImageResource(image);
const imageRegion = createBitmapRegion(imageSurface);

function addImage(
  source: Readonly<typeof image>,
  x: number,
  y: number,
  opts: { alpha?: number; rotation?: number; scaleX?: number; scaleY?: number } = {},
): void {
  const sprite = createSprite();
  setSpriteTexture(sprite, createTexture({ source }));
  sprite.x = x;
  sprite.y = y;
  sprite.alpha = opts.alpha ?? 1;
  sprite.rotation = opts.rotation ?? 0;
  sprite.scaleX = opts.scaleX ?? 1;
  sprite.scaleY = opts.scaleY ?? 1;
  addNodeChild(root, sprite);
}

function addSurface(
  surface: ReturnType<typeof createBitmap>,
  x: number,
  y: number,
  opts: { alpha?: number; rotation?: number; scaleX?: number; scaleY?: number } = {},
): void {
  addImage(createImageResourceFromBitmap(surface), x, y, opts);
}

addImage(image, 20, 20);
addImage(image, 130, 120, { rotation: -90 });

const colorTransformed = captureBitmapFromImageResource(image);
applyBitmapColorScaleBias(createBitmapRegion(colorTransformed), imageRegion, {
  alphaScale: 0.5,
  alphaBias: 0,
  blueScale: 1,
  blueBias: 0,
  greenScale: 0,
  greenBias: 0,
  redScale: 0.5,
  redBias: 20 / 255,
});
addSurface(colorTransformed, 240, 20);

const tiled = createBitmap(image.width, image.height);
copyBitmapPixels(
  createBitmapRegion(tiled, -image.width / 2, -image.height / 2, image.width, image.height),
  imageRegion,
);
copyBitmapPixels(createBitmapRegion(tiled, -image.width / 2, image.height / 2, image.width, image.height), imageRegion);
copyBitmapPixels(createBitmapRegion(tiled, image.width / 2, -image.height / 2, image.width, image.height), imageRegion);
copyBitmapPixels(createBitmapRegion(tiled, image.width / 2, image.height / 2, image.width, image.height), imageRegion);
addSurface(tiled, 350, 20);

const composited = createBitmap(image.width, image.height, 0xeeeeeeff);
copyBitmapPixels(createBitmapRegion(composited), imageRegion, true);
addSurface(composited, 460, 20);

const copiedChannel = captureBitmapFromImageResource(image);
copyBitmapChannel(
  createBitmapRegion(copiedChannel, 20, 0, image.width, image.height),
  ImageChannel.Green,
  imageRegion,
  ImageChannel.Blue,
);
addSurface(copiedChannel, 570, 20);

const floodFilled = captureBitmapFromImageResource(image);
floodFillBitmap(floodFilled, 0, 0, 0xeeeeeeff);
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
const drawn = createBitmapFromCanvas(drawCanvas);
addSurface(drawn, 130, 140);

// OpenFL scroll(w/2, 0): shift right by half, exposed area retains original pixels.
// scrollBitmap clears the exposed region instead, so replicate OpenFL behavior manually:
// clone the image, then overwrite the right half with the original left half.
const scrolled = captureBitmapFromImageResource(image);
copyBitmapPixels(createBitmapRegion(scrolled, Math.floor(image.width / 2), 0, image.width, image.height), imageRegion);
addSurface(scrolled, 240, 140);

const thresholded = captureBitmapFromImageResource(image);
applyBitmapThreshold(
  createBitmapRegion(thresholded, 40, 0, image.width, image.height),
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
