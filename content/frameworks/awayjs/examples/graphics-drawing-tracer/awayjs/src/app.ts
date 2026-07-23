import { RequestAnimationFrame, Vector3D } from '@awayjs/core';
import { CapsStyle, JointStyle } from '@awayjs/graphics';
import { Sprite } from '@awayjs/scene';

import { createGraphics2DScene } from '../../../_shared/awayjs/src/graphics2d';

const { scene, root } = createGraphics2DScene();

interface PathPoint {
  x: number;
  y: number;
}

const drawingPath: PathPoint[][] = [[], [], [], []];

const shape = new Sprite(null);

const movingRect = new Sprite(null);
movingRect.x = window.innerWidth / 2;
movingRect.y = window.innerHeight / 2;

for (const [dx, dy] of [
  [-50, -50],
  [50, -50],
  [-50, 50],
  [50, 50],
]) {
  const c = new Sprite(null);
  c.graphics.beginFill(0xdddddd, 1);
  c.graphics.drawCircle(0, 0, 5);
  c.graphics.endFill();
  c.x = dx;
  c.y = dy;
  movingRect.addChild(c);
}

root.addChild(shape);
root.addChild(movingRect);

function drawTracerShape(): void {
  for (let i = 0; i < 4; i++) {
    const globalPos: Vector3D = movingRect.getChildAt(i).scenePosition;
    drawingPath[i].push({ x: globalPos.x, y: globalPos.y });
    if (drawingPath[i].length > 500) {
      drawingPath[i].shift();
    }
  }

  shape.graphics.clear();
  shape.graphics.lineStyle(2, 0x000000, 1, false, null, CapsStyle.ROUND, JointStyle.MITER, 1.8);

  if (drawingPath.length === 0) return;

  for (let p = 0; p < 4; p++) {
    if (drawingPath[p].length === 0) continue;

    let color = 0x000000;
    shape.graphics.lineStyle(1, color, 1, false, null, CapsStyle.ROUND, JointStyle.MITER, 1.8);
    shape.graphics.moveTo(drawingPath[p][0].x, drawingPath[p][0].y);

    for (let i = 1; i < drawingPath[p].length; i++) {
      if (i > drawingPath[p].length * 0.9) {
        if (color !== 0xffffff) {
          color = 0xffffff;
          shape.graphics.lineStyle(5, color, 1, false, null, CapsStyle.ROUND, JointStyle.MITER, 1.8);
        }
      } else if (i > drawingPath[p].length * 0.5) {
        if (color !== 0xcccccc) {
          color = 0xcccccc;
          shape.graphics.lineStyle(3, color, 1, false, null, CapsStyle.ROUND, JointStyle.MITER, 1.8);
        }
      }
      shape.graphics.lineTo(drawingPath[p][i].x, drawingPath[p][i].y);
    }
  }
  shape.graphics.endFill();
}

const dirVec = new Vector3D(0, 0, 0);
let rotation = 3;
let scale = 0;

function onEnterFrame(_dt: number): void {
  rotation += 0.1 - Math.random() * 0.2;
  scale = 0.005 - Math.random() * 0.01;
  dirVec.x += 0.1 - Math.random() * 0.2;
  dirVec.y += 0.1 - Math.random() * 0.2;

  if (movingRect.x <= -71 * movingRect.scaleX || movingRect.x >= window.innerWidth + 71 * movingRect.scaleX) {
    dirVec.x *= -1;
  }
  if (movingRect.y <= -71 * movingRect.scaleX || movingRect.y >= window.innerHeight + 71 * movingRect.scaleX) {
    dirVec.y *= -1;
  }

  movingRect.x += dirVec.x;
  movingRect.y += dirVec.y;
  movingRect.rotationZ += rotation;
  movingRect.scaleX += scale;
  movingRect.scaleY += scale;

  drawTracerShape();
  scene.render();
}

const timer = new RequestAnimationFrame(onEnterFrame, null);
timer.start();
