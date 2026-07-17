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
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTests,
  RichTextKind,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const CenterY = 240;

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

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 12 };
infoText.x = 10;
infoText.y = 10;
infoText.data.width = 300;
infoText.data.height = 25;
infoText.data.text = '[use Ctrl/Cmd & Shift to simulate multi-touch]';
addNodeChild(root, infoText);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const sheet = createBitmap();
sheet.data.image = atlas;
sheet.data.sourceRectangle = createRectangle(579, 1, 228, 171);
sheet.pivotX = 114;
sheet.pivotY = 85.5;
sheet.x = CenterX;
sheet.y = CenterY;
sheet.rotation = 10;
addNodeChild(root, sheet);

registerDefaultHitTests();

const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);

const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

const backBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Back',
  width: 88,
  height: 50,
  onTriggered: () => {
    window.parent.postMessage({ type: 'reference:navigate', caseId: 'starling/demo/main-menu' }, '*');
  },
});
backBtn.root.x = GameWidth / 2 - 88 / 2;
backBtn.root.y = GameHeight - 50 + 4;
backBtn.connect(interaction);
addNodeChild(root, backBtn.root);

let dragging = false;
let lastX = 0;
let lastY = 0;

const canvas = document.querySelector('canvas')!;

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  const sx = sheet.x - sheet.pivotX;
  const sy = sheet.y - sheet.pivotY;
  const sw = 228;
  const sh = 171;

  if (mx >= sx && mx <= sx + sw && my >= sy && my <= sy + sh) {
    dragging = true;
    lastX = mx;
    lastY = my;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  sheet.x += mx - lastX;
  sheet.y += my - lastY;
  lastX = mx;
  lastY = my;
  invalidateNodeLocalTransform(sheet);
});

canvas.addEventListener('pointerup', () => {
  dragging = false;
});

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();
