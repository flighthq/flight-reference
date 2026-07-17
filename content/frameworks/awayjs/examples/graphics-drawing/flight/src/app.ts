import type { Shape } from '@flighthq/sdk';
import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeCurveTo,
  appendShapeEndFill,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  createClipRegionFromCircle,
  createDisplayContainer,
  createShape,
  invalidateNodeLocalTransform,
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

function packColor(r: number, g: number, b: number): number {
  return ((Math.round(r * 255) & 0xff) << 16) | ((Math.round(g * 255) & 0xff) << 8) | (Math.round(b * 255) & 0xff);
}

function buildBatmanLogo(fillColor: number, strokeColor: number): Shape {
  const shape = createShape();
  appendShapeBeginFill(shape, fillColor, 1);
  appendShapeLineStyle(shape, 5, strokeColor, 1, false, null, 'round', 'miter', 1.8);
  appendShapeMoveTo(shape, 50, 50);
  appendShapeLineTo(shape, 50, 50);
  appendShapeLineTo(shape, 50, 50);
  appendShapeLineTo(shape, 290, 50);
  appendShapeCurveTo(shape, 290, 150, 450, 150);
  appendShapeLineTo(shape, 460, 60);
  appendShapeLineTo(shape, 470, 100);
  appendShapeLineTo(shape, 530, 100);
  appendShapeLineTo(shape, 540, 60);
  appendShapeLineTo(shape, 550, 150);
  appendShapeCurveTo(shape, 710, 150, 710, 50);
  appendShapeLineTo(shape, 950, 50);
  appendShapeCurveTo(shape, 800, 120, 825, 250);
  appendShapeCurveTo(shape, 630, 280, 500, 450);
  appendShapeCurveTo(shape, 370, 280, 175, 250);
  appendShapeEndFill(shape);
  return shape;
}

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

for (let i = 0; i < numSpritesV; i++) {
  for (let j = 0; j < numSpritesH; j++) {
    const container = createDisplayContainer();
    container.x = i * 50;
    container.y = j * 25;
    container.scaleX = gridScale;
    container.scaleY = gridScale;
    invalidateNodeLocalTransform(container);

    const rMult = i / numSpritesV;
    const gMult = 1 - i / numSpritesV;
    const bMult = 1 - j / numSpritesH;

    const fillColor = packColor(rMult, gMult, bMult);
    const strokeColor = packColor(rMult, 0, 0);

    const sprite = buildBatmanLogo(fillColor, strokeColor);
    sprite.pivotX = logoPivotX;
    sprite.pivotY = logoPivotY;
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

  target.render(root);
  requestAnimationFrame(frame);
}

frame();
