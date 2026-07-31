import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  connectInputToInteraction,
  createDisplayObject,
  createGlCanvasElement,
  createGlRenderState,
  createInputManager,
  createInteractionManager,
  createMatrix,
  createRichText,
  createSprite,
  createTexture,
  defaultGlSpriteRenderer,
  defaultGlRichTextRenderer,
  defaultGlTextLabelRenderer,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerStandardGlMaterial,
  registerStandardGlTextureResolvers,
  registerDefaultHitTests,
  registerRenderer,
  renderGlBackground,
  renderGlScene2D,
  RichTextKind,
  setSpriteTexture,
  setTextureUvFromPixelRect,
  SpriteKind,
  TextLabelKind,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from './menuButton';

const GameWidth = 320;
const GameHeight = 480;

const pixelRatio = window.devicePixelRatio || 1;
const canvas = createGlCanvasElement(GameWidth, GameHeight, pixelRatio);
document.body.appendChild(canvas);

const state = createGlRenderState(canvas, {
  pixelRatio,
  backgroundColor: 0xffffffff,
  contextAttributes: { alpha: false, preserveDrawingBuffer: false },
  sceneGraphSyncPolicy: 'refreshDerivedState',
});

state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
registerStandardGlMaterial(state);
registerStandardGlTextureResolvers(state);
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgSprite = createSprite();
setSpriteTexture(bgSprite, createTexture({ source: bgImage }));
addNodeChild(root, bgSprite);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 12, align: 'center' };
infoText.x = 10;
infoText.y = 10;
infoText.data.width = 300;
infoText.data.height = 100;
infoText.data.wordWrap = true;
infoText.data.text =
  'Pushing the bird only works when the touch occurs within a circle.' +
  " This can be accomplished by overriding the method 'hitTest'.";
addNodeChild(root, infoText);

const buttonWidth = 169;
const buttonHeight = 166;
const buttonX = 160 - 84;
const buttonY = 150;

const buttonTexture = createTexture({ source: atlas });
setTextureUvFromPixelRect(buttonTexture, 515, 316, buttonWidth, buttonHeight);
const button = createSprite();
setSpriteTexture(button, buttonTexture);
button.x = buttonX;
button.y = buttonY;
addNodeChild(root, button);

registerDefaultHitTests();

const input = createInputManager();
attachPointerInput(input, canvas);

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

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const y = ((e.clientY - rect.top) / rect.height) * GameHeight;

  if (!isInsideBoundingBox(x, y)) return;

  if (isInsideCircle(x, y)) {
    flashButton();
  }
});

function frame(): void {
  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(frame);
}
frame();
