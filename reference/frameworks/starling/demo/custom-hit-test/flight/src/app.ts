import {
  addNodeChild,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createRichText,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  RichTextKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const GameWidth = 320;
const GameHeight = 480;

const { render } = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 19, color: 0xffffff, align: 'center' };
infoText.x = 10;
infoText.y = 10;
infoText.data.width = 300;
infoText.data.height = 100;
infoText.data.text = 'Pushing the bird button below will only work when the touch is within a circle.';
addNodeChild(root, infoText);

const buttonWidth = 169;
const buttonHeight = 166;
const buttonX = 160 - 84;
const buttonY = 150;

const button = createBitmap();
button.data.image = atlas;
button.data.sourceRectangle = createRectangle(515, 316, buttonWidth, buttonHeight);
button.x = buttonX;
button.y = buttonY;
addNodeChild(root, button);

const missText = createRichText();
missText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 19, color: 0xff3333, align: 'center' };
missText.x = 10;
missText.y = buttonY + buttonHeight + 12;
missText.data.width = 300;
missText.data.height = 30;
missText.data.text = 'Outside circle!';
missText.alpha = 0;
addNodeChild(root, missText);

render(root);

const centerX = buttonX + buttonWidth / 2;
const centerY = buttonY + buttonHeight / 2;
const radius = buttonWidth / 2 - 8;

function isInsideBoundingBox(x: number, y: number): boolean {
  return x >= buttonX && x <= buttonX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight;
}

function isInsideCircle(x: number, y: number): boolean {
  const dx = x - centerX;
  const dy = y - centerY;
  return dx * dx + dy * dy < radius * radius;
}

let hitTimeoutId: ReturnType<typeof setTimeout> | undefined;
let missTimeoutId: ReturnType<typeof setTimeout> | undefined;

function flashButton(): void {
  if (hitTimeoutId !== undefined) clearTimeout(hitTimeoutId);

  button.alpha = 0.7;
  invalidateNodeAppearance(button);
  render(root);

  hitTimeoutId = setTimeout(() => {
    button.alpha = 1;
    invalidateNodeAppearance(button);
    render(root);
    hitTimeoutId = undefined;
  }, 200);
}

function showMiss(): void {
  if (missTimeoutId !== undefined) clearTimeout(missTimeoutId);

  missText.alpha = 1;
  invalidateNodeAppearance(missText);
  render(root);

  missTimeoutId = setTimeout(() => {
    missText.alpha = 0;
    invalidateNodeAppearance(missText);
    render(root);
    missTimeoutId = undefined;
  }, 400);
}

const canvas = document.querySelector('canvas')!;

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const y = ((e.clientY - rect.top) / rect.height) * GameHeight;

  if (!isInsideBoundingBox(x, y)) return;

  if (isInsideCircle(x, y)) {
    flashButton();
  } else {
    showMiss();
  }
});
