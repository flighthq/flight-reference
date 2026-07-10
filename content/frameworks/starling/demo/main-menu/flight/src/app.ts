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
  loadImageResourceFromUrl,
  prepareDisplayObjectRender,
  registerDefaultHitTestPoints,
  TextLabelKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

import { BUTTON_REGIONS_1X, createMenuButton } from '../../../_shared/flight/src/menuButton';

const GameWidth = 320;
const GameHeight = 480;

const ButtonWidth = 128;
const ButtonHeight = 32;
const GridStartY = 155;
const GridColumnX = [28, 167];
const GridRowSpacing = 46;

const buttons: [string, string][] = [
  ['Textures', 'textures'],
  ['Multitouch', 'multitouch'],
  ['TextFields', 'textfields'],
  ['Animations', 'animations'],
  ['Custom hit-test', 'custom-hit-test'],
  ['Movie Clip', 'movie-clip'],
  ['Filters', 'filters'],
  ['Blend Modes', 'blend-modes'],
  ['Render Texture', 'render-texture'],
  ['Benchmark', 'benchmark'],
  ['Masks', 'masks'],
  ['Sprite 3D', 'sprite3d'],
];

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, TextLabelKind],
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
logo.y = 5;
addNodeChild(root, logo);

registerDefaultHitTestPoints();

const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);

const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, 1);

for (let i = 0; i < buttons.length; i++) {
  const [label, caseId] = buttons[i];
  const column = i % 2;
  const row = Math.floor(i / 2);

  const btn = createMenuButton({
    atlas,
    regions: BUTTON_REGIONS_1X,
    text: label,
    width: ButtonWidth,
    height: ButtonHeight,
    onTriggered: () => {
      window.parent.postMessage({ type: 'reference:navigate', caseId: `starling/demo/${caseId}` }, '*');
    },
  });

  btn.root.x = GridColumnX[column]!;
  btn.root.y = GridStartY + row * GridRowSpacing;
  btn.connect(interaction);
  addNodeChild(root, btn.root);
}

function frame(): void {
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}
frame();
