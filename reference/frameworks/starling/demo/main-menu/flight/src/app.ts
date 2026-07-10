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
const GridColumnX = [10, 170];
const GridRowSpacing = 38;

const buttons: [string, string][] = [
  ['Textures', 'textures'],
  ['Blend Modes', 'blend-modes'],
  ['Movie Clip', 'movie-clip'],
  ['Animations', 'animations'],
  ['Custom Hit Test', 'custom-hit-test'],
  ['Filters', 'filters'],
  ['Masks', 'masks'],
  ['Benchmark', 'benchmark'],
  ['Multitouch', 'multitouch'],
  ['Sprite3D', 'sprite3d'],
  ['TextFields', 'textfields'],
  ['Render Texture', 'render-texture'],
];

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, TextLabelKind],
});

const root = createDisplayContainer();
root.scaleX = target.scale;
root.scaleY = target.scale;

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
connectInputToInteraction(input, interaction, target.scale);

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
