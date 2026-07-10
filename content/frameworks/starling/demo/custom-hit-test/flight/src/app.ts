import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  BitmapKind,
  connectInputToInteraction,
  createBitmap,
  createDisplayContainer,
  createInteractionManager,
  createInputManager,
  createRectangle,
  createRichText,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  RichTextKind,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, TextLabelKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 12, align: 'center' };
infoText.x = 10;
infoText.y = 10;
infoText.data.width = 300;
infoText.data.height = 100;
infoText.data.wordWrap = true;
infoText.data.text =
  'Pushing the bird only works when the touch occurs within a circle. ' +
  "This can be accomplished by overriding the method 'hitTest'.";
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

registerDefaultHitTestPoints();

const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);

const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

const backBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Back',
  width: 88,
  height: 32,
  onTriggered: () => {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  },
});
backBtn.root.x = GameWidth / 2 - 88 / 2;
backBtn.root.y = GameHeight - 42 + 4;
backBtn.connect(interaction);
addNodeChild(root, backBtn.root);

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

  button.scaleX = 0.9;
  button.scaleY = 0.9;
  button.x = buttonX + (buttonWidth * 0.1) / 2;
  button.y = buttonY + (buttonHeight * 0.1) / 2;
  invalidateNodeLocalTransform(button);

  hitTimeoutId = setTimeout(() => {
    button.scaleX = 1;
    button.scaleY = 1;
    button.x = buttonX;
    button.y = buttonY;
    invalidateNodeLocalTransform(button);
    hitTimeoutId = undefined;
  }, 200);
}

function showMiss(): void {
  if (missTimeoutId !== undefined) clearTimeout(missTimeoutId);

  missText.alpha = 1;
  invalidateNodeAppearance(missText);

  missTimeoutId = setTimeout(() => {
    missText.alpha = 0;
    invalidateNodeAppearance(missText);
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

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();
