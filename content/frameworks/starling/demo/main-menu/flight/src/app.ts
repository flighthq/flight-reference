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
  loadImageResourceFromUrl,
  prepareScene2DRender,
  registerGlStandardMaterial,
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

const ButtonWidth = 128;
const ButtonHeight = 42;
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
registerGlStandardMaterial(state);
registerStandardGlTextureResolvers(state);
registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);

const root = createDisplayObject();

const bgImage = await loadImageResourceFromUrl('starling/textures/1x/background.jpg');
const bgSprite = createSprite();
bgSprite.data.texture = createTexture({ source: bgImage });
addNodeChild(root, bgSprite);

const atlas = await loadImageResourceFromUrl('starling/textures/1x/atlas.png');

const logoTexture = createTexture({ source: atlas });
setTextureUvFromPixelRect(logoTexture, 1, 1, 320, 143);
const logo = createSprite();
logo.data.texture = logoTexture;
logo.y = 0;
addNodeChild(root, logo);

registerDefaultHitTests();

const input = createInputManager();
attachPointerInput(input, canvas);

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

const infoText = createRichText();
infoText.data.defaultTextFormat = { font: 'DejaVu Sans, sans-serif', size: 10 };
infoText.x = 5;
infoText.y = 430;
infoText.data.width = 310;
infoText.data.height = 475 - 430;
infoText.data.textFormat.align = 'center';
infoText.data.wordWrap = true;

const infoGl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
if (infoGl) {
  const vendor = infoGl.getParameter(infoGl.VENDOR) as string;
  const version = infoGl.getParameter(infoGl.VERSION) as string;
  const renderer = infoGl.getParameter(infoGl.RENDERER) as string;
  const glsl = infoGl.getParameter(infoGl.SHADING_LANGUAGE_VERSION) as string;
  infoText.data.text = `OpenGL Vendor=${vendor} Version=${version} Renderer=${renderer} GLSL=${glsl}`;
} else {
  infoText.data.text = 'Flight SDK';
}
addNodeChild(root, infoText);

function frame(): void {
  prepareScene2DRender(state, root);
  renderGlBackground(state);
  renderGlScene2D(state, root);
  requestAnimationFrame(frame);
}
frame();
