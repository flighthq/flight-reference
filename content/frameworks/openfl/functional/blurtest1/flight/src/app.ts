import type { BlurEffect } from '@flighthq/sdk';
import { createBlurEffect } from '@flighthq/effects';
import {
  addNodeChild,
  createDisplayObject,
  createSprite,
  createTexture,
  loadImageResourceFromUrl,
} from '@flighthq/sdk';

import { applyBlurEffects, render, scale } from './render';

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const image = await loadImageResourceFromUrl('openfl/images/openfl_icon.png');
const iconTexture = createTexture({ source: image });

const blurred: { node: ReturnType<typeof createSprite>; filter: BlurEffect }[] = [];
for (let i = 0; i < 3; i++) {
  const sprite = createSprite();
  sprite.data.texture = iconTexture;
  sprite.x = 50 + i * (image.width + 50);
  sprite.y = 50;
  blurred.push({ node: sprite, filter: createBlurEffect({ blurX: 2, blurY: 2 }) });
  addNodeChild(root, sprite);
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
