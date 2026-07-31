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
  setTextureUvFromPixelRect,
  SpriteKind,
  TextLabelKind,
} from '@flighthq/sdk';

import { BUTTON_REGIONS_1X, createMenuButton } from './menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;
const CenterY = 240;

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
bgSprite.data.texture = createTexture({ source: bgImage });
addNodeChild(root, bgSprite);

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 12 };
infoText.x = 10;
infoText.y = 10;
infoText.data.width = 300;
infoText.data.height = 25;
infoText.data.text = '[use Ctrl/Cmd & Shift to simulate multi-touch]';
addNodeChild(root, infoText);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');

const sheetTexture = createTexture({ source: atlas });
setTextureUvFromPixelRect(sheetTexture, 579, 1, 228, 171);
const sheet = createSprite();
sheet.data.texture = sheetTexture;
sheet.pivotX = 114;
sheet.pivotY = 85.5;
sheet.x = CenterX;
sheet.y = CenterY;
sheet.rotation = 10;
addNodeChild(root, sheet);

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

let dragging = false;
let lastX = 0;
let lastY = 0;
let simulatingMultitouch = false;
let gestureCenterX = CenterX;
let gestureCenterY = CenterY;

function isMultitouchModifier(event: PointerEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

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
    simulatingMultitouch = isMultitouchModifier(e);
    gestureCenterX = CenterX;
    gestureCenterY = CenterY;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * GameWidth;
  const my = ((e.clientY - rect.top) / rect.height) * GameHeight;
  const dx = mx - lastX;
  const dy = my - lastY;
  const wantsMultitouch = isMultitouchModifier(e);

  if (wantsMultitouch && !simulatingMultitouch) {
    // Ctrl/Cmd was pressed during an existing drag. Starling begins the mirrored touch at the
    // current pointer position; keep this first movement as the original single-touch translation.
    sheet.x += dx;
    sheet.y += dy;
    gestureCenterX = CenterX;
    gestureCenterY = CenterY;
    simulatingMultitouch = true;
  } else if (wantsMultitouch) {
    const previousCenterX = gestureCenterX;
    const previousCenterY = gestureCenterY;
    if (e.shiftKey) {
      // Starling's Shift modifier moves the simulation center with the real pointer, translating both
      // the real and mirrored touches instead of changing their angle or separation.
      gestureCenterX += dx;
      gestureCenterY += dy;
    }

    const previousMockX = 2 * previousCenterX - lastX;
    const previousMockY = 2 * previousCenterY - lastY;
    const currentMockX = 2 * gestureCenterX - mx;
    const currentMockY = 2 * gestureCenterY - my;
    const previousVectorX = lastX - previousMockX;
    const previousVectorY = lastY - previousMockY;
    const currentVectorX = mx - currentMockX;
    const currentVectorY = my - currentMockY;
    const previousLength = Math.hypot(previousVectorX, previousVectorY);
    const currentLength = Math.hypot(currentVectorX, currentVectorY);

    if (previousLength > 0.0001 && currentLength > 0.0001) {
      const scale = currentLength / previousLength;
      const previousAngle = Math.atan2(previousVectorY, previousVectorX);
      const currentAngle = Math.atan2(currentVectorY, currentVectorX);
      const rawAngle = currentAngle - previousAngle;
      const angle = Math.atan2(Math.sin(rawAngle), Math.cos(rawAngle));
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const sheetOffsetX = sheet.x - previousCenterX;
      const sheetOffsetY = sheet.y - previousCenterY;

      sheet.x = gestureCenterX + (sheetOffsetX * cos - sheetOffsetY * sin) * scale;
      sheet.y = gestureCenterY + (sheetOffsetX * sin + sheetOffsetY * cos) * scale;
      sheet.rotation += (angle * 180) / Math.PI;
      sheet.scaleX *= scale;
      sheet.scaleY *= scale;
    }
  } else {
    sheet.x += dx;
    sheet.y += dy;
    simulatingMultitouch = false;
  }

  lastX = mx;
  lastY = my;
  invalidateNodeLocalTransform(sheet);
});

canvas.addEventListener('pointerup', () => {
  dragging = false;
  simulatingMultitouch = false;
});

canvas.addEventListener('pointercancel', () => {
  dragging = false;
  simulatingMultitouch = false;
});

function frame(): void {
  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(frame);
}
frame();
