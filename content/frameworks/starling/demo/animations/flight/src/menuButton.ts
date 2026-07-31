import type { DisplayObject, Image, InteractionManager, RectangleLike, TextLabel, Texture2D } from '@flighthq/sdk';
import {
  addNodeChild,
  connectInteractionSignal,
  createDisplayObject,
  createRectangle,
  createSprite,
  createTextLabel,
  createTexture,
  enableInteractionSignals,
  invalidateNodeAppearance,
  setNodeHitArea,
  setNodeHitTestEnabled,
  setSpriteTexture,
  setTextureUvFromPixelRect,
  setTextLabelString,
} from '@flighthq/sdk';

type ButtonState = 'up' | 'over' | 'down' | 'disabled';

const TRANSITION_MS = 120;

export interface MenuButtonConfig {
  atlas: Image;
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
  const container = createDisplayObject();
  const textures = {
    up: createRegionTexture(config.atlas, config.regions.up),
    over: createRegionTexture(config.atlas, config.regions.over),
    down: createRegionTexture(config.atlas, config.regions.down),
    disabled: createRegionTexture(config.atlas, config.regions.disabled),
  };

  const baseSprite = createSprite();
  setSpriteTexture(baseSprite, textures.up);
  baseSprite.scaleX = config.width / config.regions.up.width;
  baseSprite.scaleY = config.height / config.regions.up.height;
  addNodeChild(container, baseSprite);

  const overlaySprite = createSprite();
  setSpriteTexture(overlaySprite, textures.up);
  overlaySprite.scaleX = baseSprite.scaleX;
  overlaySprite.scaleY = baseSprite.scaleY;
  overlaySprite.alpha = 0;
  addNodeChild(container, overlaySprite);

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

    setSpriteTexture(baseSprite, textures[prev]);

    setSpriteTexture(overlaySprite, textures[next]);
    transitionFromAlpha = overlaySprite.alpha;
    transitionStart = performance.now();
    invalidateNodeAppearance(overlaySprite);
  }

  function tick(): void {
    if (transitionStart < 0) return;
    const elapsed = performance.now() - transitionStart;
    const t = Math.min(1, elapsed / TRANSITION_MS);
    const alpha = transitionFromAlpha + (1 - transitionFromAlpha) * t;
    overlaySprite.alpha = alpha;
    invalidateNodeAppearance(overlaySprite);
    if (t >= 1) {
      setSpriteTexture(baseSprite, textures[state]);
      overlaySprite.alpha = 0;
      invalidateNodeAppearance(overlaySprite);
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
      setNodeHitTestEnabled(container, true);
      setNodeHitArea(container, createRectangle(0, 0, config.width, config.height));
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

function createRegionTexture(image: Image, region: Readonly<RectangleLike>): Texture2D {
  const texture = createTexture({ source: image });
  setTextureUvFromPixelRect(texture, region.x, region.y, region.width, region.height);
  return texture;
}

export const BUTTON_REGIONS_1X: Record<ButtonState, RectangleLike> = {
  up: { x: 167, y: 227, width: 127, height: 32 },
  disabled: { x: 167, y: 260, width: 127, height: 32 },
  down: { x: 167, y: 293, width: 127, height: 32 },
  over: { x: 167, y: 326, width: 127, height: 32 },
};
