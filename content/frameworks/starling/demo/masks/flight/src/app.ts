import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeCircle,
  appendShapeEndFill,
  attachPointerInput,
  BitmapKind,
  connectInputToInteraction,
  createBitmap,
  createClipRegionFromCircle,
  createDisplayContainer,
  createInputManager,
  createInteractionManager,
  createRectangle,
  createRichText,
  createShape,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  RichTextKind,
  setDisplayObjectClip,
  ShapeKind,
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
  clip: true,
  kinds: [BitmapKind, RichTextKind, ShapeKind, TextLabelKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const maskedContainer = createDisplayContainer();
addNodeChild(root, maskedContainer);

const birdImage = createBitmap();
birdImage.data.image = atlas;
birdImage.data.sourceRectangle = createRectangle(1, 145, 165, 163);
birdImage.x = (GameWidth - 165) / 2;
birdImage.y = 80;
addNodeChild(maskedContainer, birdImage);

const maskText = createRichText();
maskText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 20 };
maskText.x = (GameWidth - 256) / 2;
maskText.y = 260;
maskText.data.width = 256;
maskText.data.height = 128;
maskText.data.wordWrap = true;
maskText.data.text = 'Move the mouse (or a finger) over the screen to move the mask.';
addNodeChild(maskedContainer, maskText);

const maskRadius = 100;
const startX = GameWidth / 2;
const startY = 80 + 163 / 2;

setDisplayObjectClip(maskedContainer, createClipRegionFromCircle(startX, startY, maskRadius));

const indicator = createShape();
appendShapeBeginFill(indicator, 0xea8220);
appendShapeCircle(indicator, 0, 0, maskRadius);
appendShapeEndFill(indicator);
indicator.alpha = 0.1;
indicator.x = startX;
indicator.y = startY;
addNodeChild(root, indicator);

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

const canvas = document.querySelector('canvas')!;

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;

  setDisplayObjectClip(maskedContainer, createClipRegionFromCircle(mx, my, maskRadius));

  indicator.x = mx;
  indicator.y = my;
  invalidateNodeLocalTransform(indicator);
  invalidateNodeAppearance(maskedContainer);
});

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();
