import Sprite from 'openfl/display/Sprite';

import { createReferenceStage } from '../../../../harness/stage';

const WIDTH = 800;
const HEIGHT = 600;

const { root } = createReferenceStage(WIDTH, HEIGHT, 0xffffff);

const ROWS = 9;
const cellW = WIDTH / 4;
const cellH = HEIGHT / ROWS;

function createCell(color: number, alpha: number, x: number, y: number, cab: boolean): void {
  const sprite = new Sprite();
  sprite.cacheAsBitmap = cab;
  sprite.graphics.beginFill(color, alpha);
  sprite.graphics.drawRect(0, 0, cellW, cellH);
  sprite.graphics.endFill();
  sprite.x = x * cellW;
  sprite.y = y * cellH;
  root.addChild(sprite);
}

for (let y = 0; y < ROWS; y++) {
  const alpha = 1.0 - y / 8.0;
  const frag = Math.trunc(alpha * 255);
  const color = (frag << 16) | (frag << 8) | frag;

  createCell(color, 1.0, 0, y, false);

  createCell(0xffffff, 1.0, 1, y, false);
  createCell(0x000000, 1.0 - alpha, 1, y, false);

  createCell(0xffffff, 1.0, 2, y, true);
  createCell(0x000000, 1.0 - alpha, 2, y, true);

  createCell(0xffffff, 1.0, 3, y, false);
  createCell(frag << 24, 1.0, 3, y, false);
}
