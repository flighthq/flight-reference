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
const CenterX = GameWidth / 2;

const ButtonWidth = 128;
const ButtonHeight = 32;
const ButtonX = CenterX - ButtonWidth / 2;
const StartButtonY = 20;
const DelayButtonY = 60;

const TransitionLabelY = 100;
const TransitionLabelHeight = 30;

const EggStartX = 20;
const EggStartY = 100;
const EggTargetX = 300;
const EggTargetY = 360;
const EggTargetScale = 0.5;
// Flight's rotation field is in degrees; the original Starling scene animates rotation to PI/2
// radians (a quarter turn), so that target is converted to degrees here.
const EggTargetRotation = radiansToDegrees(Math.PI / 2);
const EggTweenDuration = 2000;

interface Transition {
  name: string;
  ease: (t: number) => number;
}

const transitions: Transition[] = [
  { name: 'linear', ease: linear },
  { name: 'easeInOut', ease: easeInOut },
  { name: 'easeOutBack', ease: easeOutBack },
  { name: 'easeOutBounce', ease: easeOutBounce },
  { name: 'easeOutElastic', ease: easeOutElastic },
];
let transitionIndex = 0;

interface ActiveTween {
  startTime: number;
  duration: number;
  ease: (t: number) => number;
  update: (t: number) => void;
  onComplete?: () => void;
}

const activeTweens: ActiveTween[] = [];

function addTween(tween: ActiveTween): void {
  activeTweens.push(tween);
}

function updateTweens(now: number): void {
  for (let i = activeTweens.length - 1; i >= 0; i--) {
    const tween = activeTweens[i];
    const t = Math.min(1, (now - tween.startTime) / tween.duration);
    tween.update(tween.ease(t));

    if (t >= 1) {
      activeTweens.splice(i, 1);
      tween.onComplete?.();
    }
  }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function linear(t: number): number {
  return t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOutBack(t: number): number {
  const s = 1.70158;
  return (t - 1) * (t - 1) * ((s + 1) * (t - 1) + s) + 1;
}

function easeOutBounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;
    return 7.5625 * t2 * t2 + 0.75;
  } else if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;
    return 7.5625 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / 2.75;
    return 7.5625 * t2 * t2 + 0.984375;
  }
}

function easeOutElastic(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) + 1;
}

const target = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, TextLabelKind],
});

const root = createDisplayContainer();
root.scaleX = target.scale;
root.scaleY = target.scale;

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

registerDefaultHitTestPoints();
const input = createInputManager();
attachPointerInput(input, (target.state as { canvas: HTMLCanvasElement }).canvas);
const interaction = createInteractionManager<DisplayObject>(root);
connectInputToInteraction(input, interaction, target.scale);

const startBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Start animation',
  width: 128,
  height: 32,
  onTriggered: onStartButtonClick,
});
startBtn.root.x = ButtonX;
startBtn.root.y = StartButtonY;
startBtn.connect(interaction);
addNodeChild(root, startBtn.root);

const delayBtn = createMenuButton({
  atlas,
  regions: BUTTON_REGIONS_1X,
  text: 'Delayed call',
  width: 128,
  height: 32,
  onTriggered: onDelayButtonClick,
});
delayBtn.root.x = ButtonX;
delayBtn.root.y = DelayButtonY;
delayBtn.connect(interaction);
addNodeChild(root, delayBtn.root);

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

const egg = createBitmap();
egg.data.image = atlas;
egg.data.sourceRectangle = createRectangle(167, 359, 124, 170);
addNodeChild(root, egg);

function resetEgg(): void {
  egg.x = EggStartX;
  egg.y = EggStartY;
  egg.scaleX = 1;
  egg.scaleY = 1;
  egg.rotation = 0;
  egg.alpha = 1;
  invalidateNodeLocalTransform(egg);
  invalidateNodeAppearance(egg);
}
resetEgg();

// `align: 'center'` on a RichText's defaultTextFormat produces no visible glyphs on the webgl
// backend in this SDK snapshot, so the label is left-aligned with a small inset instead.
const transitionLabel = createRichText();
transitionLabel.data.defaultTextFormat = {
  font: 'DejaVu Sans, sans-serif',
  size: 20,
  color: 0x000000,
  bold: true,
};
transitionLabel.x = 12;
transitionLabel.y = TransitionLabelY;
transitionLabel.data.width = GameWidth - 12;
transitionLabel.data.height = TransitionLabelHeight;
transitionLabel.data.text = '';
transitionLabel.alpha = 0;
addNodeChild(root, transitionLabel);

let startBusy = false;
let delayBusy = false;

function onStartButtonClick(): void {
  if (startBusy) return;
  startBusy = true;
  startBtn.enabled = false;

  resetEgg();

  const transition = transitions[transitionIndex];
  transitionIndex = (transitionIndex + 1) % transitions.length;

  addTween({
    startTime: performance.now(),
    duration: EggTweenDuration,
    ease: transition.ease,
    update(t) {
      egg.x = lerp(EggStartX, EggTargetX, t);
      egg.y = lerp(EggStartY, EggTargetY, t);
      egg.scaleX = egg.scaleY = lerp(1, EggTargetScale, t);
      egg.rotation = lerp(0, EggTargetRotation, t);
      invalidateNodeLocalTransform(egg);
    },
    onComplete() {
      startBusy = false;
      startBtn.enabled = true;
    },
  });

  transitionLabel.data.text = transition.name;
  transitionLabel.alpha = 1;
  invalidateNodeAppearance(transitionLabel);

  addTween({
    startTime: performance.now(),
    duration: EggTweenDuration,
    ease: linear,
    update(t) {
      transitionLabel.alpha = lerp(1, 0, t);
      invalidateNodeAppearance(transitionLabel);
    },
  });
}

function onDelayButtonClick(): void {
  if (delayBusy) return;
  delayBusy = true;
  delayBtn.enabled = false;

  setTimeout(() => {
    egg.alpha = 0.5;
    invalidateNodeAppearance(egg);
  }, 1000);

  setTimeout(() => {
    egg.alpha = 1;
    invalidateNodeAppearance(egg);
  }, 2000);

  setTimeout(() => {
    delayBusy = false;
    delayBtn.enabled = true;
  }, 2000);
}

function enterFrame(now: number): void {
  updateTweens(now);
  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(enterFrame);
}
requestAnimationFrame(enterFrame);
