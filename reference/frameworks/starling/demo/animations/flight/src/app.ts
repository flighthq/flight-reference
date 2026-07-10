import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeRectangle,
  BitmapKind,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createRichText,
  createShape,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  loadImageResourceFromUrl,
  RichTextKind,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

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

const { render } = await createFunctionalTarget({
  width: GameWidth,
  height: GameHeight,
  background: 0xffffffff,
  kinds: [BitmapKind, RichTextKind, ShapeKind],
});

const root = createDisplayContainer();

const bgImage = await loadImageResourceFromUrl('starling/assets/textures/1x/background.jpg');
const bgBmp = createBitmap();
bgBmp.data.image = bgImage;
addNodeChild(root, bgBmp);

const atlas = await loadImageResourceFromUrl('starling/assets/textures/1x/atlas.png');

function createButton(
  y: number,
  text: string,
): { shape: ReturnType<typeof createShape>; label: ReturnType<typeof createRichText> } {
  const shape = createShape();
  appendShapeBeginFill(shape, 0x444488);
  appendShapeRectangle(shape, ButtonX, y, ButtonWidth, ButtonHeight);
  addNodeChild(root, shape);

  // `align: 'center'` on a RichText's defaultTextFormat produces no visible glyphs on the webgl
  // backend in this SDK snapshot, so the label is left-aligned with a small inset instead.
  const label = createRichText();
  label.data.defaultTextFormat = {
    font: 'DejaVu Sans, sans-serif',
    size: 14,
    color: 0xffffff,
    bold: true,
  };
  label.x = ButtonX + 12;
  label.y = y;
  label.data.width = ButtonWidth - 12;
  label.data.height = ButtonHeight;
  label.data.text = text;
  addNodeChild(root, label);

  return { shape, label };
}

function setButtonAlpha(
  button: { shape: ReturnType<typeof createShape>; label: ReturnType<typeof createRichText> },
  alpha: number,
): void {
  button.shape.alpha = alpha;
  button.label.alpha = alpha;
  invalidateNodeAppearance(button.shape);
  invalidateNodeAppearance(button.label);
}

const startButton = createButton(StartButtonY, 'Start animation');
const delayButton = createButton(DelayButtonY, 'Delayed call');

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
  setButtonAlpha(startButton, 0.5);

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
      setButtonAlpha(startButton, 1);
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
  setButtonAlpha(delayButton, 0.5);

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
    setButtonAlpha(delayButton, 1);
  }, 2000);
}

function hitTestButton(x: number, y: number, buttonY: number): boolean {
  return x >= ButtonX && x <= ButtonX + ButtonWidth && y >= buttonY && y <= buttonY + ButtonHeight;
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof HTMLCanvasElement)) return;

  const x = event.offsetX;
  const y = event.offsetY;

  if (hitTestButton(x, y, StartButtonY)) {
    onStartButtonClick();
  } else if (hitTestButton(x, y, DelayButtonY)) {
    onDelayButtonClick();
  }
});

function enterFrame(now: number): void {
  updateTweens(now);
  render(root);
  requestAnimationFrame(enterFrame);
}

requestAnimationFrame(enterFrame);
