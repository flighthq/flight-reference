import { createBlurEffect } from '@flighthq/effects';
import { addNodeChild, createBitmap, createDisplayContainer, loadImageResourceFromUrl } from '@flighthq/sdk';

import { applyBlurEffects, render, scale } from './render';

const root = createDisplayContainer();
root.scaleX = scale;
root.scaleY = scale;

const image = await loadImageResourceFromUrl('assets/openfl.png');

const blurred: {
  node: ReturnType<typeof createBitmap>;
  filter: { kind: 'BlurEffect'; blurX: number; blurY: number };
}[] = [];
for (let i = 0; i < 3; i++) {
  const bmp = createBitmap();
  bmp.data.image = image;
  bmp.data.smoothing = true;
  bmp.x = 50 + i * (image.width + 50);
  bmp.y = 50;
  const filter = createBlurEffect({ blurX: 2, blurY: 2 }) as { kind: 'BlurEffect'; blurX: number; blurY: number };
  blurred.push({ node: bmp, filter });
  addNodeChild(root, bmp);
}

applyBlurEffects(blurred);

function enterFrame() {
  const sinT = Math.sin((performance.now() / 1000) * 0.5);
  const amount = Math.abs(sinT) * 64;
  for (const entry of blurred) {
    entry.filter.blurX = amount;
    entry.filter.blurY = amount;
  }
  render(root);
  requestAnimationFrame(enterFrame);
}
enterFrame();
