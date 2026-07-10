import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createRichText,
  createShape,
  loadImageResourceFromUrl,
  RichTextKind,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const GameWidth = 320;
const GameHeight = 480;

const ButtonWidth = 128;
const ButtonHeight = 32;
const GridStartY = 155;
const GridColumnX = [10, 170];
const GridRowSpacing = 38;

interface MenuButton {
  readonly x: number;
  readonly y: number;
  readonly caseId: string;
}

const buttons: [string, string][] = [
  ['Textures', 'textures'],
  ['Blend Modes', 'blend-modes'],
  ['Movie Clip', 'movie-clip'],
  ['Animations', 'animations'],
  ['Custom Hit Test', 'custom-hit-test'],
  ['Filters', 'filters'],
  ['Masks', 'masks'],
  ['Benchmark', 'benchmark'],
  ['Multitouch', 'multitouch'],
  ['Sprite3D', 'sprite3d'],
  ['TextFields', 'textfields'],
  ['Render Texture', 'render-texture'],
];

const { render } = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, ShapeKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const logo = createBitmap();
logo.data.image = atlas;
logo.data.sourceRectangle = createRectangle(1, 1, 320, 143);
logo.x = 0;
logo.y = 5;
addNodeChild(root, logo);

const menuButtons: MenuButton[] = [];

buttons.forEach(([label, caseId], index) => {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const x = GridColumnX[column];
  const y = GridStartY + row * GridRowSpacing;

  const btnBg = createShape();
  appendShapeBeginFill(btnBg, 0x444488);
  appendShapeRectangle(btnBg, x, y, ButtonWidth, ButtonHeight);
  addNodeChild(root, btnBg);

  const btnLabel = createRichText();
  btnLabel.data.defaultTextFormat = {
    font: 'DejaVu Sans, sans-serif',
    size: 14,
    color: 0xffffff,
  };
  btnLabel.x = x;
  btnLabel.y = y;
  btnLabel.data.width = ButtonWidth;
  btnLabel.data.height = ButtonHeight;
  btnLabel.data.text = label;
  addNodeChild(root, btnLabel);

  menuButtons.push({ x, y, caseId });
});

render(root);

document.addEventListener('click', (e) => {
  const hit = menuButtons.find(
    (button) =>
      e.offsetX >= button.x &&
      e.offsetX <= button.x + ButtonWidth &&
      e.offsetY >= button.y &&
      e.offsetY <= button.y + ButtonHeight,
  );
  if (!hit) return;
  window.parent.postMessage({ type: 'reference:navigate', caseId: `starling/demo/${hit.caseId}` }, '*');
});
