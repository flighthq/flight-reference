import { RequestAnimationFrame, ColorTransform, Box, Vector3D } from '@awayjs/core';
import { CapsStyle, JointStyle } from '@awayjs/graphics';
import { Sprite } from '@awayjs/scene';
import { PickGroup } from '@awayjs/view';

import { createGraphics2DScene } from '../../../_shared/awayjs/src/graphics2d';

const { scene, view, root } = createGraphics2DScene();

const batmanLogo = new Sprite(null);
batmanLogo.graphics.beginFill(0xffffff, 1);
batmanLogo.graphics.lineStyle(5, 0xff0000, 1, false, null, CapsStyle.ROUND, JointStyle.MITER, 1.8);
batmanLogo.graphics.moveTo(50, 50);
batmanLogo.graphics.lineTo(50, 50);
batmanLogo.graphics.lineTo(50, 50);
batmanLogo.graphics.lineTo(290, 50);
batmanLogo.graphics.curveTo(290, 150, 450, 150);
batmanLogo.graphics.lineTo(460, 60);
batmanLogo.graphics.lineTo(470, 100);
batmanLogo.graphics.lineTo(530, 100);
batmanLogo.graphics.lineTo(540, 60);
batmanLogo.graphics.lineTo(550, 150);
batmanLogo.graphics.curveTo(710, 150, 710, 50);
batmanLogo.graphics.lineTo(950, 50);
batmanLogo.graphics.curveTo(800, 120, 825, 250);
batmanLogo.graphics.curveTo(630, 280, 500, 450);
batmanLogo.graphics.curveTo(370, 280, 175, 250);
batmanLogo.graphics.endFill();

const boxBounds: Box = PickGroup.getInstance(view).getAbstraction(batmanLogo).getBoxBounds(null, false, true);
batmanLogo.registrationPoint = new Vector3D(boxBounds.width / 2, boxBounds.height / 2);

const circle = new Sprite(null);
circle.graphics.beginFill(0x000000, 1);
circle.graphics.drawCircle(0, 0, 100);
circle.graphics.endFill();

const animSprites: Sprite[] = [];
const animSpeeds: number[] = [];

const numSpritesV = 5;
const numSpritesH = 5;

for (let i = 0; i < numSpritesV; i++) {
  for (let j = 0; j < numSpritesH; j++) {
    const container = new Sprite(null);
    const mask: Sprite = circle.clone();
    const sprite: Sprite = batmanLogo.clone();

    container.transform.moveTo(i * 50, j * 25, 0);
    container.transform.scaleTo(0.1, 0.1, 0.1);
    sprite.transform.colorTransform = new ColorTransform(i / numSpritesV, 1 - i / numSpritesV, 1 - j / numSpritesV, 1);

    animSprites.push(sprite);
    animSpeeds.push(0);
    sprite.masks = [mask];
    container.addChild(sprite);
    container.addChild(mask);
    root.addChild(container);
  }
}

function onEnterFrame(_dt: number): void {
  for (let i = 0; i < animSprites.length; i++) {
    animSprites[i].rotationZ += animSpeeds[i];
    animSpeeds[i] += 1 - 2 * Math.random();
    animSpeeds[i] *= 0.98;
  }

  scene.render();
}

const timer = new RequestAnimationFrame(onEnterFrame, null);
timer.start();
