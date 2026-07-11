import type { DisplayObject } from '@flighthq/sdk';
import {
  addNodeChild,
  attachPointerInput,
  BitmapKind,
  BlendMode,
  connectInputToInteraction,
  createBitmap,
  createDisplayContainer,
  createInteractionManager,
  createInputManager,
  createRectangle,
  createTextLabel,
  invalidateNodeAppearance,
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  registerGlBlendMode,
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
  contextAttributes: { alpha: true },
  blend: true,
  kinds: [BitmapKind, TextLabelKind],
});

const canvas = (target.state as { canvas: HTMLCanvasElement }).canvas;
canvas.style.backgroundColor = '#fff';

if (target.kind === 'webgl') {
  registerGlBlendMode(target.state, 'None', { src: 'ONE', dst: 'ZERO' });
}

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

const blendModes: [string, string][] = [
  [BlendMode.Normal, 'normal'],
  [BlendMode.Multiply, 'multiply'],
  [BlendMode.Screen, 'screen'],
  [BlendMode.Add, 'add'],
  [BlendMode.Erase, 'erase'],
  ['None', 'none'],
];

let modeIndex = 0;

const rocket = createBitmap();
rocket.data.image = atlas;
rocket.data.sourceRectangle = createRectangle(322, 1, 256, 142);
rocket.x = CenterX - 128;
rocket.y = 170;
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

registerDefaultHitTestPoints();

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
    infoText.data.text = name;
    invalidateNodeAppearance(rocket);
    invalidateNodeAppearance(infoText);
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
