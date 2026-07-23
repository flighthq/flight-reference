import { createReferenceStage } from '../../../../harness/stage';
import Sprite from 'openfl/display/Sprite';
import Event from 'openfl/events/Event';
import TextField from 'openfl/text/TextField';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';

const WIDTH = 800;
const HEIGHT = 600;

const COLORS = [
  0x3366ff, 0x6633ff, 0xcc33ff, 0xff33cc, 0x33ccff, 0x003df5, 0x002eb8, 0xff3366, 0x33ffcc, 0xb88a00, 0xf5b800,
  0xff6633, 0x33ff66, 0x66ff33, 0xccff33, 0xffcc33,
];
const CENTER_X = 320;
const CENTER_Y = 120;
const CHANGE_INTERVAL = 3;
const RADIUS = 120;
const RPM = 20;

function pos(i: number): number {
  return (i * HEIGHT) / 720;
}

const { root } = createReferenceStage(WIDTH, HEIGHT, 0x000000);

let angle = 0;
let cache = 1;
let frameCount = 0;
let totalTime = 0;
let lastTime = performance.now() / 1000;
let switchTime = lastTime + CHANGE_INTERVAL;

root.graphics.beginFill(0x000000);
root.graphics.drawRect(0, 0, WIDTH, HEIGHT);

let newRect: Sprite;

// Setup child 1
const child1 = new Sprite();
child1.graphics.beginFill(0xff0000);
child1.graphics.drawRect(pos(75), pos(25), pos(125), pos(125));

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[0]);
newRect.graphics.drawRect(0, 0, pos(100), pos(100));
child1.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[1]);
newRect.graphics.drawRect(pos(125), pos(10), pos(100), pos(100));
child1.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[2]);
newRect.graphics.drawRect(pos(125), pos(110), pos(100), pos(100));
child1.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[3]);
newRect.graphics.drawRect(0, pos(110), pos(100), pos(100));
child1.addChild(newRect);

// Setup child 2
const child2 = new Sprite();
child2.graphics.beginFill(0xff0000);
child2.graphics.drawRect(pos(415), pos(25), pos(125), pos(125));

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[4]);
newRect.graphics.drawRect(pos(340), 0, pos(100), pos(100));
child2.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[5]);
newRect.graphics.drawRect(pos(465), pos(10), pos(100), pos(100));
child2.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[6]);
newRect.graphics.drawRect(pos(465), pos(110), pos(100), pos(100));
child2.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[7]);
newRect.graphics.drawRect(pos(340), pos(110), pos(100), pos(100));
child2.addChild(newRect);

// Setup parent
const parent = new Sprite();
parent.graphics.beginFill(0xff0000);
parent.graphics.drawRect(0, 0, pos(640), pos(480));

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[8]);
newRect.graphics.drawRect(pos(207), pos(300), pos(100), pos(100));
parent.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[9]);
newRect.graphics.drawRect(pos(332), pos(310), pos(100), pos(100));
parent.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[10]);
newRect.graphics.drawRect(pos(332), pos(410), pos(100), pos(100));
parent.addChild(newRect);

newRect = new Sprite();
newRect.graphics.beginFill(COLORS[11]);
newRect.graphics.drawRect(pos(207), pos(410), pos(100), pos(100));
parent.addChild(newRect);

child2.x = pos(150);

parent.addChild(child1);
parent.addChild(child2);
root.addChild(parent);

const normalTextFormat = new TextFormat('_sans', Math.trunc(pos(32)), 0, false);
normalTextFormat.align = TextFormatAlign.LEFT;

const text = new TextField();
text.selectable = false;
text.defaultTextFormat = normalTextFormat;
text.x = pos(10);
text.y = pos(10);
text.width = pos(1270);
text.height = pos(40);
text.textColor = 0xffffffff;
updateText();
root.addChild(text);

function updateText(): void {
  text.text = 'cacheAsBitmap: Parent: ';

  if ((cache & 1) === 1) {
    parent.cacheAsBitmap = true;
    text.text += 'ON';
  } else {
    parent.cacheAsBitmap = false;
    text.text += 'OFF';
  }

  text.text += ' Child1: ';
  if ((cache & 2) === 2) {
    child1.cacheAsBitmap = true;
    text.text += 'ON';
  } else {
    child1.cacheAsBitmap = false;
    text.text += 'OFF';
  }

  text.text += ' Child2: ';
  if ((cache & 4) === 4) {
    child2.cacheAsBitmap = true;
    text.text += 'ON';
  } else {
    child2.cacheAsBitmap = false;
    text.text += 'OFF';
  }
}

root.addEventListener(Event.ENTER_FRAME, () => {
  const timeNow = performance.now() / 1000;
  const timeDiff = timeNow - lastTime;
  frameCount++;
  totalTime = totalTime + timeDiff;
  lastTime = timeNow;

  const secPerRev = 60.0 / RPM;
  const percent = timeDiff / secPerRev;
  const angleDiff = percent * 2 * Math.PI;

  angle = angle + angleDiff;

  const xOff = pos(RADIUS) * Math.cos(angle);
  const yOff = pos(RADIUS) * Math.sin(angle);

  parent.x = pos(CENTER_X) + xOff;
  parent.y = pos(CENTER_Y) + yOff;

  if (timeNow >= switchTime) {
    console.log('Average FPS: ' + frameCount / totalTime);
    totalTime = 0;
    frameCount = 0;

    cache = (cache + 1) % 8;

    console.log('cache: ' + cache);

    updateText();
    switchTime = timeNow + CHANGE_INTERVAL;
  }
});
