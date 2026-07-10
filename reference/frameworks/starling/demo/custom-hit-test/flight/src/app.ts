import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeEndFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createRichText,
  createShape,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  RichTextKind,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const GameWidth = 320;
const GameHeight = 480;

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

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 19, color: 0xffffff };
infoText.x = 10;
infoText.y = 10;
infoText.data.width = 300;
infoText.data.height = 100;
infoText.data.multiline = true;
infoText.data.wordWrap = true;
infoText.data.text = 'Pushing the bird button below\nwill only work when the touch\nis within a circle.';
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
missText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 19, color: 0xff3333 };
missText.x = 10;
missText.y = buttonY + buttonHeight + 12;
missText.data.width = 300;
missText.data.height = 30;
missText.data.multiline = true;
missText.data.wordWrap = true;
missText.data.text = 'Outside circle!';
missText.alpha = 0;
addNodeChild(root, missText);

const backBtnW = 88;
const backBtnH = 42;
const backBtnX = GameWidth / 2 - backBtnW / 2;
const backBtnY = GameHeight - backBtnH + 4;

const backBtnBg = createShape();
appendShapeBeginFill(backBtnBg, 0x444488);
appendShapeRectangle(backBtnBg, backBtnX, backBtnY, backBtnW, backBtnH);
appendShapeEndFill(backBtnBg);
addNodeChild(root, backBtnBg);

const backBtnLabel = createRichText();
backBtnLabel.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 14, color: 0xffffff };
backBtnLabel.x = backBtnX;
backBtnLabel.y = backBtnY + 4;
backBtnLabel.data.width = backBtnW;
backBtnLabel.data.height = backBtnH;
backBtnLabel.data.text = 'Back';
addNodeChild(root, backBtnLabel);

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

  if (x >= backBtnX && x <= backBtnX + backBtnW && y >= backBtnY && y <= backBtnY + backBtnH) {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
    return;
  }

  if (!isInsideBoundingBox(x, y)) return;

  if (isInsideCircle(x, y)) {
    flashButton();
  } else {
    showMiss();
  }
});
