import { RequestAnimationFrame, ColorUtils } from '@awayjs/core';
import { CapsStyle, JointStyle } from '@awayjs/graphics';
import { MouseEvent, Sprite } from '@awayjs/scene';

import { createGraphics2DScene } from '../../../_shared/awayjs/src/graphics2d';

const { scene, root } = createGraphics2DScene();

let activeStar: Sprite | null = null;

function addBackground(): void {
  const bgSprite = new Sprite(null);
  bgSprite.graphics.beginFill(0xdddddd, 1);
  bgSprite.graphics.drawRect(0, 0, window.innerWidth, window.innerHeight);
  bgSprite.graphics.endFill();
  root.addChild(bgSprite);
}

addBackground();

function drawStar(star: Sprite, radiusOuter: number): void {
  const radiusInner = radiusOuter / 2 + Math.random() * (radiusOuter / 2);
  const spikes = Math.round(2 + Math.random() * 100);

  const r = Math.random() * 255;
  const g = Math.random() * 255;
  const b = Math.random() * 255;
  const fillColor = ColorUtils.ARGBtoFloat32(255, r, g, b);
  const strokeColor = ColorUtils.ARGBtoFloat32(255, 255 - r, 255 - g, 255 - b);
  const thickness = 1 + Math.random() * 3;
  const alpha = 0.5 + Math.random() * 0.5;

  star.graphics.clear();
  star.graphics.beginFill(fillColor, alpha);
  star.graphics.lineStyle(thickness, strokeColor, alpha, false, null, CapsStyle.ROUND, JointStyle.MITER, 1.8);
  star.graphics.moveTo(radiusOuter * Math.cos(0), radiusOuter * Math.sin(0));

  const aDelta = (360 / spikes) * 0.5;
  let a = 0;
  for (let i = 0; i < spikes; i++) {
    a += aDelta;
    star.graphics.lineTo(radiusInner * Math.cos(a * (Math.PI / 180)), radiusInner * Math.sin(a * (Math.PI / 180)));
    a += aDelta;
    star.graphics.lineTo(radiusOuter * Math.cos(a * (Math.PI / 180)), radiusOuter * Math.sin(a * (Math.PI / 180)));
  }
  star.graphics.endFill();
}

root.addEventListener(MouseEvent.MOUSE_DOWN, (event: MouseEvent) => {
  activeStar = new Sprite(null);
  activeStar.x = event.scenePosition.x;
  activeStar.y = event.scenePosition.y;
  drawStar(activeStar, 10);
  root.addChild(activeStar);
});

root.addEventListener(MouseEvent.MOUSE_MOVE, (event: MouseEvent) => {
  if (activeStar) {
    const deltaX = event.scenePosition.x - activeStar.x;
    const deltaY = event.scenePosition.y - activeStar.y;
    let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < 10) distance = 10;
    drawStar(activeStar, distance);
  }
});

root.addEventListener(MouseEvent.MOUSE_UP, () => {
  activeStar = null;
});

root.addEventListener(MouseEvent.MOUSE_UP_OUTSIDE, () => {
  activeStar = null;
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'c') {
    root.removeChildren(0, root.numChildren);
    addBackground();
  }
});

function onEnterFrame(_dt: number): void {
  scene.render();
}

const timer = new RequestAnimationFrame(onEnterFrame, null);
timer.start();
