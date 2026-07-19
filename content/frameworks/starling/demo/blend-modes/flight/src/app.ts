import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  attachPointerInput,
  BitmapKind,
  BlendMode,
  connectInputToInteraction,
  createBitmap,
  createDisplayContainer,
  createInteractionManager,
  createInputManager,
  createRectangle,
  createShape,
  createTextLabel,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTests,
  setTextLabelString,
  ShapeKind,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;
const CenterX = 160;

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  blend: true,
  kinds: [BitmapKind, ShapeKind, TextLabelKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

// Starling's "none" blend mode (Copy/source-only) is now a CompositeOperator, not a BlendMode.
// To match the Starling reference visually, "none" uses Normal blending over a white backdrop.
const blendModes: [string, string][] = [
  [BlendMode.Normal, 'normal'],
  [BlendMode.Multiply, 'multiply'],
  [BlendMode.Screen, 'screen'],
  [BlendMode.Add, 'add'],
  [BlendMode.Darken, 'darken'],
  [BlendMode.Normal, 'none'],
];

let modeIndex = 0;

const rocketWidth = 256;
const rocketHeight = 142;
const rocketX = CenterX - 128;
const rocketY = 170;

const noneBackdrop = createShape();
appendShapeBeginFill(noneBackdrop, 0xffffff);
appendShapeRectangle(noneBackdrop, rocketX, rocketY, rocketWidth, rocketHeight);
noneBackdrop.visible = false;
addNodeChild(root, noneBackdrop);

const rocket = createBitmap();
rocket.data.image = atlas;
rocket.data.sourceRectangle = createRectangle(322, 1, 256, 142);
rocket.x = rocketX;
rocket.y = rocketY;
rocket.blendMode = blendModes[0][0];
addNodeChild(root, rocket);

const infoText = createTextLabel();
infoText.data.textFormat = { font: 'DejaVu Sans, sans-serif', size: 19, align: 'center' };
infoText.x = 10;
infoText.y = 330;
infoText.data.width = 300;
infoText.data.height = 32;
infoText.data.text = blendModes[0][1];
infoText.blendMode = BlendMode.Normal;
addNodeChild(root, infoText);

registerDefaultHitTests();

const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);

const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

const switchBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Switch Mode',
  width: 128,
  height: 32,
  onTriggered: () => {
    modeIndex = (modeIndex + 1) % blendModes.length;
    const [mode, name] = blendModes[modeIndex];
    rocket.blendMode = mode;
    noneBackdrop.visible = name === 'none';
    invalidateNodeAppearance(noneBackdrop);
    setTextLabelString(infoText, name);
    invalidateNodeAppearance(rocket);
  },
});
switchBtn.root.x = CenterX - 64;
switchBtn.root.y = 15;
switchBtn.connect(interaction);
addNodeChild(root, switchBtn.root);

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

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();
