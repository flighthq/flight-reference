import { createBlurFilter } from '@flighthq/filters';
import { addNodeChild, createBitmap, createDisplayContainer, loadImageResourceFromUrl } from '@flighthq/sdk';

import { applyBlurFilters, render } from './render';

const root = createDisplayContainer();

const image = await loadImageResourceFromUrl('assets/openfl.png');

const blurred: {
  node: ReturnType<typeof createBitmap>;
  filter: { kind: 'BlurFilter'; blurX: number; blurY: number };
}[] = [];
for (let i = 0; i < 3; i++) {
  const bmp = createBitmap();
  bmp.data.image = image;
  bmp.data.smoothing = true;
  bmp.x = 50 + i * (image.width + 50);
  bmp.y = 50;
  const filter = createBlurFilter({ blurX: 4, blurY: 4 }) as { kind: 'BlurFilter'; blurX: number; blurY: number };
  blurred.push({ node: bmp, filter });
  addNodeChild(root, bmp);
}

applyBlurFilters(blurred);

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
