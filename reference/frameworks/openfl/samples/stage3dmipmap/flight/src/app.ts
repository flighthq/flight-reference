import {
  addNodeChild,
  connectSignal,
  createApplication,
  createBitmap,
  createDisplayObject,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  startApplicationLoop,
} from '@flighthq/sdk';

import { render, scale } from './render';

const image = await loadImageResourceFromUrl('assets/checkers.png');
const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const layers = [0, 1, 2, 3].map((i) => {
  const bitmap = createBitmap();
  bitmap.data.image = image;
  bitmap.data.smoothing = true;
  bitmap.x = 80 + i * 120;
  bitmap.y = 70 + i * 30;
  bitmap.scaleX = 1.4 - i * 0.25;
  bitmap.scaleY = 1.4 - i * 0.25;
  bitmap.alpha = 1 - i * 0.15;
  addNodeChild(root, bitmap);
  return bitmap;
});

let time = 0;
const app = createApplication();
connectSignal(app.onUpdate, (delta) => {
  time += delta / 1000;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    layer.rotation = time * 20 * (i + 1);
    invalidateNodeLocalTransform(layer);
  }
});
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
