import type { Bitmap, DisplayObject, ImageResource, InteractionManager, RectangleLike, TextLabel } from '@flighthq/sdk';
import {
  addNodeChild,
  connectInteractionSignal,
  createBitmap,
  createDisplayContainer,
  createRectangle,
  createTextLabel,
  enableInteractionSignals,
  invalidateNodeAppearance,
  setTextLabelString,
} from '@flighthq/sdk';

type ButtonState = 'up' | 'over' | 'down' | 'disabled';

const TRANSITION_MS = 120;

export interface MenuButtonConfig {
  atlas: ImageResource;
  regions: Readonly<Record<ButtonState, RectangleLike>>;
  text: string;
  width: number;
  height: number;
  onTriggered?: () => void;
}

export interface MenuButton {
  root: DisplayObject;
  label: TextLabel;
  enabled: boolean;
  setText: (text: string) => void;
  connect: (interaction: InteractionManager<DisplayObject>) => void;
}

export function createMenuButton(config: MenuButtonConfig): MenuButton {
  const container = createDisplayContainer();

  const baseBmp = createBitmap();
  baseBmp.data.image = config.atlas;
  baseBmp.data.sourceRectangle = rectFrom(config.regions.up);
  baseBmp.data.smoothing = true;
  baseBmp.scaleX = config.width / config.regions.up.width;
  baseBmp.scaleY = config.height / config.regions.up.height;
  addNodeChild(container, baseBmp);

  const overlayBmp = createBitmap();
  overlayBmp.data.image = config.atlas;
  overlayBmp.data.sourceRectangle = rectFrom(config.regions.up);
  overlayBmp.data.smoothing = true;
  overlayBmp.scaleX = baseBmp.scaleX;
  overlayBmp.scaleY = baseBmp.scaleY;
  overlayBmp.alpha = 0;
  addNodeChild(container, overlayBmp);

  const fontSize = 12;
  const label = createTextLabel();
  label.data.textFormat = {
    font: 'DejaVu Sans, sans-serif',
    size: fontSize,
    color: 0x000000,
    align: 'center',
  };
  label.data.width = config.width;
  label.data.height = config.height;
  label.y = Math.round((config.height - fontSize) / 2) - 1;
  label.data.text = config.text;
  addNodeChild(container, label);

  let state: ButtonState = 'up';
  let enabled = true;
  let transitionStart = -1;
  let transitionFromAlpha = 0;

  function setState(next: ButtonState): void {
    if (next === state) return;
    const prev = state;
    state = next;

    baseBmp.data.sourceRectangle = rectFrom(config.regions[prev]);
    invalidateNodeAppearance(baseBmp);

    overlayBmp.data.sourceRectangle = rectFrom(config.regions[next]);
    transitionFromAlpha = overlayBmp.alpha;
    transitionStart = performance.now();
    invalidateNodeAppearance(overlayBmp);
  }

  function tick(): void {
    if (transitionStart < 0) return;
    const elapsed = performance.now() - transitionStart;
    const t = Math.min(1, elapsed / TRANSITION_MS);
    const alpha = transitionFromAlpha + (1 - transitionFromAlpha) * t;
    overlayBmp.alpha = alpha;
    invalidateNodeAppearance(overlayBmp);
    if (t >= 1) {
      baseBmp.data.sourceRectangle = rectFrom(config.regions[state]);
      invalidateNodeAppearance(baseBmp);
      overlayBmp.alpha = 0;
      invalidateNodeAppearance(overlayBmp);
      transitionStart = -1;
    }
  }

  function animationFrame(): void {
    tick();
    requestAnimationFrame(animationFrame);
  }
  requestAnimationFrame(animationFrame);

  const button: MenuButton = {
    root: container,
    label,
    get enabled() {
      return enabled;
    },
    set enabled(value: boolean) {
      enabled = value;
      setState(value ? 'up' : 'disabled');
    },
    setText(text: string) {
      setTextLabelString(label, text);
    },
    connect(interaction: InteractionManager<DisplayObject>) {
      enableInteractionSignals(container);
      connectInteractionSignal(interaction, container, 'onPointerRollOver', () => {
        if (enabled) setState('over');
      });
      connectInteractionSignal(interaction, container, 'onPointerRollOut', () => {
        if (enabled) setState('up');
      });
      connectInteractionSignal(interaction, container, 'onPointerDown', () => {
        if (enabled) setState('down');
      });
      connectInteractionSignal(interaction, container, 'onPointerUp', () => {
        if (enabled) setState('over');
      });
      connectInteractionSignal(interaction, container, 'onClick', () => {
        if (enabled) config.onTriggered?.();
      });
    },
  };

  return button;
}

function rectFrom(r: Readonly<RectangleLike>): ReturnType<typeof createRectangle> {
  return createRectangle(r.x, r.y, r.width, r.height);
}

export const BUTTON_REGIONS_1X: Record<ButtonState, RectangleLike> = {
  up: { x: 167, y: 227, width: 127, height: 32 },
  disabled: { x: 167, y: 260, width: 127, height: 32 },
  down: { x: 167, y: 293, width: 127, height: 32 },
  over: { x: 167, y: 326, width: 127, height: 32 },
};
