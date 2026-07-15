import type { Shape } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeCurveTo,
  appendShapeEndFill,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  copyShapeCommands,
  createClipRegionFromCircle,
  createColorTransform,
  createDisplayContainer,
  createShape,
  enableGlColorAdjustment,
  invalidateNodeAppearance,
  invalidateNodeLocalTransform,
  prepareDisplayObjectRender,
  setDisplayObjectClip,
  ShapeKind,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const target = await createFunctionalTarget({
  width: window.innerWidth,
  height: window.innerHeight,
  background: 0x777777ff,
  kinds: [ShapeKind],
  clip: true,
});

const root = createDisplayContainer();

const batmanLogo = createShape();
appendShapeBeginFill(batmanLogo, 0xffffff, 1);
appendShapeLineStyle(batmanLogo, 5, 0xff0000, 1, false, null, 'round', 'miter', 1.8);
appendShapeMoveTo(batmanLogo, 50, 50);
appendShapeLineTo(batmanLogo, 50, 50);
appendShapeLineTo(batmanLogo, 50, 50);
appendShapeLineTo(batmanLogo, 290, 50);
appendShapeCurveTo(batmanLogo, 290, 150, 450, 150);
appendShapeLineTo(batmanLogo, 460, 60);
appendShapeLineTo(batmanLogo, 470, 100);
appendShapeLineTo(batmanLogo, 530, 100);
appendShapeLineTo(batmanLogo, 540, 60);
appendShapeLineTo(batmanLogo, 550, 150);
appendShapeCurveTo(batmanLogo, 710, 150, 710, 50);
appendShapeLineTo(batmanLogo, 950, 50);
appendShapeCurveTo(batmanLogo, 800, 120, 825, 250);
appendShapeCurveTo(batmanLogo, 630, 280, 500, 450);
appendShapeCurveTo(batmanLogo, 370, 280, 175, 250);
appendShapeEndFill(batmanLogo);

const logoWidth = 950 - 50;
const logoHeight = 450 - 50;
const logoPivotX = logoWidth / 2 + 50;
const logoPivotY = logoHeight / 2 + 50;

const numSpritesV = 5;
const numSpritesH = 5;

const gridScale = 0.1;
const maskRadius = 100;

const animShapes: Shape[] = [];
const animSpeeds: number[] = [];

if (target.kind === 'webgl') {
  enableGlColorAdjustment(target.state);
}

for (let i = 0; i < numSpritesV; i++) {
  for (let j = 0; j < numSpritesH; j++) {
    const container = createDisplayContainer();
    container.x = i * 50;
    container.y = j * 25;
    container.scaleX = gridScale;
    container.scaleY = gridScale;
    invalidateNodeLocalTransform(container);

    const sprite = createShape();
    copyShapeCommands(sprite, batmanLogo);
    sprite.pivotX = logoPivotX;
    sprite.pivotY = logoPivotY;
    sprite.colorTransform = createColorTransform({
      redMultiplier: i / numSpritesV,
      greenMultiplier: 1 - i / numSpritesV,
      blueMultiplier: 1 - j / numSpritesH,
      alphaMultiplier: 1,
    });
    invalidateNodeAppearance(sprite);
    invalidateNodeLocalTransform(sprite);

    setDisplayObjectClip(sprite, createClipRegionFromCircle(logoPivotX, logoPivotY, maskRadius));

    animShapes.push(sprite);
    animSpeeds.push(0);

    addNodeChild(container, sprite);
    addNodeChild(root, container);
  }
}

function frame(): void {
  for (let i = 0; i < animShapes.length; i++) {
    animShapes[i].rotation += animSpeeds[i] * (Math.PI / 180);
    animSpeeds[i] += 1 - 2 * Math.random();
    animSpeeds[i] *= 0.98;
    invalidateNodeLocalTransform(animShapes[i]);
  }

  prepareDisplayObjectRender(target.state, root);
  target.render(root);
  requestAnimationFrame(frame);
}

frame();
