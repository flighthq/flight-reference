import { RequestAnimationFrame } from '@awayjs/core';
import { CapsStyle, JointStyle } from '@awayjs/graphics';
import { MouseEvent, Sprite } from '@awayjs/scene';

import { createGraphics2DScene } from '../../../_shared/awayjs/src/graphics2d';

const { scene, root } = createGraphics2DScene();

interface DrawingPathEntry {
  cmd: string;
  x: number;
  y: number;
  cx?: number;
  cy?: number;
}

const drawingPath: DrawingPathEntry[] = [];
let isMouseDown = false;

const shape = new Sprite(null);

const bgSprite = new Sprite(null);
bgSprite.graphics.beginFill(0xdddddd, 1);
bgSprite.graphics.drawRect(0, 0, window.innerWidth, window.innerHeight);
bgSprite.graphics.endFill();

const circleGraphic = new Sprite(null);
circleGraphic.graphics.beginFill(0xff0000, 1);
circleGraphic.graphics.drawCircle(0, 0, 30);
circleGraphic.graphics.endFill();

root.addChild(bgSprite);
root.addChild(shape);
root.addChild(circleGraphic);

function drawShape(): void {
  shape.graphics.clear();
  shape.graphics.beginFill(0xffffff, 1);
  shape.graphics.lineStyle(5, 0xff0000, 1, false, null, CapsStyle.ROUND, JointStyle.MITER, 1.8);

  if (drawingPath.length === 0) return;

  shape.graphics.moveTo(drawingPath[0].x, drawingPath[0].y);
  for (let i = 1; i < drawingPath.length; i++) {
    if (drawingPath[i].cmd === 'l') {
      shape.graphics.lineTo(drawingPath[i].x, drawingPath[i].y);
    } else if (drawingPath[i].cmd === 'c') {
      shape.graphics.curveTo(drawingPath[i].cx!, drawingPath[i].cy!, drawingPath[i].x, drawingPath[i].y);
    }
  }
  shape.graphics.endFill();
}

function updateNewPointForMousePosition(event: MouseEvent): void {
  if (isMouseDown) {
    const last = drawingPath[drawingPath.length - 1];
    const deltaX = event.scenePosition.x - last.x;
    const deltaY = event.scenePosition.y - last.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > 20) {
      last.cmd = 'c';
      last.cx = last.x - deltaX;
      last.cy = last.y - deltaY;
    } else {
      last.cmd = 'l';
    }
    drawShape();
  }
}

root.addEventListener(MouseEvent.MOUSE_DOWN, (event: MouseEvent) => {
  circleGraphic.x = event.scenePosition.x;
  circleGraphic.y = event.scenePosition.y;
  circleGraphic.alpha = 1;
  circleGraphic.scaleX = circleGraphic.scaleY = 1;

  drawingPath.push({
    cmd: 'l',
    x: event.scenePosition.x,
    y: event.scenePosition.y,
  });

  if (drawingPath.length !== 2) {
    drawShape();
  }
  isMouseDown = true;
});

root.addEventListener(MouseEvent.MOUSE_MOVE, (event: MouseEvent) => {
  updateNewPointForMousePosition(event);
});

root.addEventListener(MouseEvent.MOUSE_UP, (event: MouseEvent) => {
  updateNewPointForMousePosition(event);
  isMouseDown = false;
});

root.addEventListener(MouseEvent.MOUSE_UP_OUTSIDE, (event: MouseEvent) => {
  updateNewPointForMousePosition(event);
  isMouseDown = false;
});

function onEnterFrame(_dt: number): void {
  if (circleGraphic.alpha > 0) {
    circleGraphic.alpha -= 0.05;
  }
  if (circleGraphic.scaleX > 0.1) {
    circleGraphic.scaleX -= 0.05;
    circleGraphic.scaleY -= 0.05;
  }

  scene.render();
}

const timer = new RequestAnimationFrame(onEnterFrame, null);
timer.start();
