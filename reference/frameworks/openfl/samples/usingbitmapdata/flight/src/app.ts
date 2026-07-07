import { addNodeChild, createBitmap, createDisplayObject, loadImageResourceFromUrl } from '@flighthq/sdk';

import { render, scale } from './render';

const image = await loadImageResourceFromUrl('assets/openfl.png');
const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

function addImage(
  x: number,
  y: number,
  opts: { alpha?: number; rotation?: number; scaleX?: number; scaleY?: number } = {},
): void {
  const bitmap = createBitmap();
  bitmap.data.image = image;
  bitmap.data.smoothing = true;
  bitmap.x = x;
  bitmap.y = y;
  bitmap.alpha = opts.alpha ?? 1;
  bitmap.rotation = opts.rotation ?? 0;
  bitmap.scaleX = opts.scaleX ?? 1;
  bitmap.scaleY = opts.scaleY ?? 1;
  addNodeChild(root, bitmap);
}

addImage(20, 20);
addImage(130, 120, { rotation: -90 });
addImage(240, 20, { alpha: 0.55 });
addImage(350, 20, { scaleX: 0.5, scaleY: 0.5 });
addImage(460, 20, { alpha: 0.75 });
addImage(570, 20, { scaleX: 0.75, scaleY: 0.75 });
addImage(20, 140, { alpha: 0.9 });
addImage(130, 140, { alpha: 0.4, scaleX: 2 });
addImage(240, 140);
addImage(350, 140, { alpha: 0.35 });

function enterFrame(): void {
  render(root);
  requestAnimationFrame(enterFrame);
}

enterFrame();
