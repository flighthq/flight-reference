import { createReferenceStage } from '../../../../harness/stage';
import Sprite from 'openfl/display/Sprite';
import Event from 'openfl/events/Event';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';

const WIDTH = 800;
const HEIGHT = 600;
const CENTER_X = 527;
const CENTER_Y = 255;
const CHANGE_INTERVAL = 2;
const COLORS = [0xff4cf0, 0xfff372, 0x85ff75, 0x59ddff];
const RADIUS = 200;
const RPM = 5;
const textCycle = ['Hello, World!', 'Hi', ''];

function pos(i: number): number {
  return (i * HEIGHT) / 720;
}

const { root } = createReferenceStage(WIDTH, HEIGHT, 0x000000);

root.graphics.beginFill(0x000000);
root.graphics.drawRect(0, 0, WIDTH, HEIGHT);
root.graphics.endFill();

root.graphics.beginFill(0x002288, 1.0);
root.graphics.drawRect(pos(500), pos(200), pos(200), pos(200));
root.graphics.endFill();
root.graphics.beginFill(0x002288, 0.5);
root.graphics.drawRect(pos(700), pos(200), pos(200), pos(200));
root.graphics.endFill();
root.graphics.beginFill(0x002288, 0.1);
root.graphics.drawRect(pos(500), pos(400), pos(200), pos(200));
root.graphics.endFill();
root.graphics.beginFill(0x002288, 0.0);
root.graphics.drawRect(pos(700), pos(400), pos(200), pos(200));
root.graphics.endFill();

const rect = new Sprite();
rect.graphics.beginFill(0xffff0000);
rect.graphics.drawRect(pos(75), pos(25), pos(125), pos(125));

let newRect: Sprite;

newRect = new Sprite();
newRect.alpha = 0.66;
newRect.graphics.beginFill(COLORS[0]);
newRect.graphics.drawRoundRect(0, 0, pos(100), pos(100), pos(100), pos(100));
rect.addChild(newRect);

newRect = new Sprite();
newRect.alpha = 0.66;
newRect.graphics.beginFill(COLORS[1]);
newRect.graphics.drawRoundRect(pos(125), pos(10), pos(100), pos(100), pos(20), pos(40));
rect.addChild(newRect);

newRect = new Sprite();
newRect.alpha = 0.66;
newRect.graphics.beginFill(COLORS[2]);
newRect.graphics.drawRoundRect(pos(125), pos(110), pos(100), pos(100), pos(40), pos(20));
rect.addChild(newRect);

newRect = new Sprite();
newRect.alpha = 0.66;
newRect.graphics.beginFill(COLORS[3]);
newRect.graphics.drawRoundRect(0, pos(110), pos(100), pos(100), pos(40), pos(40));
rect.addChild(newRect);

const normalTextFormat = new TextFormat('_sans', Math.trunc(pos(32)), 0, false);
normalTextFormat.align = TextFormatAlign.LEFT;

const rotatingText = new TextField();
rotatingText.defaultTextFormat = normalTextFormat;
rotatingText.textColor = 0xffffffff;
rotatingText.x = -pos(100);
rotatingText.y = -pos(75);
rotatingText.autoSize = TextFieldAutoSize.LEFT;
let textIndex = 0;
rotatingText.text = textCycle[textIndex];
rect.addChild(rotatingText);

const text = new TextField();
text.selectable = false;
text.defaultTextFormat = normalTextFormat;
text.x = pos(410);
text.y = pos(10);
text.width = pos(1270);
text.height = pos(40);
text.textColor = 0xffffffff;

let cache = true;
text.text = 'cacheAsBitmap: ' + cache;

rect.cacheAsBitmap = cache;
root.addChild(rect);
root.addChild(text);

let angle = 0;
let lastTime = performance.now() / 1000;
let switchTime = lastTime + CHANGE_INTERVAL;
let switchSwitch = false;

root.addEventListener(Event.ENTER_FRAME, () => {
  const timeNow = performance.now() / 1000;
  const timeDiff = timeNow - lastTime;
  lastTime = timeNow;

  const secPerRev = 60.0 / RPM;
  const percent = timeDiff / secPerRev;
  const angleDiff = percent * 2 * Math.PI;

  angle = angle + angleDiff;

  const xOff = pos(RADIUS) * Math.cos(angle);
  const yOff = pos(RADIUS) * Math.sin(angle);

  rect.x = pos(CENTER_X) + xOff;
  rect.y = pos(CENTER_Y) + yOff;

  if (timeNow >= switchTime) {
    textIndex += 1;
    if (textIndex >= textCycle.length) {
      textIndex = 0;
    }
    rotatingText.text = textCycle[textIndex];
    if (switchSwitch) {
      cache = !cache;
      text.text = 'cacheAsBitmap: ' + cache;
      rect.cacheAsBitmap = cache;
      switchSwitch = false;
    } else {
      switchSwitch = true;
    }
    switchTime = timeNow + CHANGE_INTERVAL;
  }
});
