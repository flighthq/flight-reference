import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import BitmapData from 'openfl/display/BitmapData';
import KeyboardEvent from 'openfl/events/KeyboardEvent';
import Rectangle from 'openfl/geom/Rectangle';
import AntiAliasType from 'openfl/text/AntiAliasType';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';
import Keyboard from 'openfl/ui/Keyboard';

const WIDTH = 800;
const HEIGHT = 600;

// Seeded random (same algorithm as fill test)
const RESIDUES = 4096;
const PHI = 0x9e3779b9 | 0;
let _c = 362436;
let _rotation = RESIDUES - 1;
const _Q: number[] = [Date.now() & 0x7fff_ffff];
_Q.push((_Q[0] + PHI) | 0);
_Q.push((_Q[1] + PHI) | 0);
for (let i = 3; i < RESIDUES; i++) _Q.push((_Q[i - 3] ^ _Q[i - 2] ^ PHI ^ i) | 0);
function rand(max: number): number {
  const a = 18782,
    r = 0xffff_fffe;
  _rotation = (_rotation + 1) & (RESIDUES - 1);
  const t = Math.imul(a, _Q[_rotation]) + _c;
  _c = (t / 0x1_0000_0000) | 0;
  let x = (t + _c) | 0;
  if (x < _c) {
    x = (x + 1) | 0;
    _c++;
  }
  _Q[_rotation] = (r - x) | 0;
  return (((_Q[_rotation] % max) + max) % max) | 0;
}

const children100: Bitmap[] = [];
const children500: Bitmap[] = [];
const children1000: Bitmap[] = [];

let nextX = 50;
let nextY = 50;

const { stage, root } = createReferenceStage(WIDTH, HEIGHT, 0x000000);

root.graphics.beginFill(0);
root.graphics.drawRect(0, 0, WIDTH, HEIGHT);
root.graphics.endFill();

const boldTextFormat = new TextFormat('_sans', 44, 0, true);
boldTextFormat.align = TextFormatAlign.LEFT;

const text = new TextField();
text.antiAliasType = AntiAliasType.ADVANCED;
text.selectable = false;
text.defaultTextFormat = boldTextFormat;
text.x = WIDTH / 2 - 100;
text.y = 50;
text.autoSize = TextFieldAutoSize.LEFT;
text.textColor = 0xffffff;
root.addChild(text);

text.text = '0x100, 0x500, 0x1000';

function addNewBitmap(child: Bitmap): void {
  child.x = nextX;
  child.y = nextY;

  const red = rand(255);
  const green = rand(255);
  const blue = rand(255);
  const alpha = rand(255);

  child.bitmapData.fillRect(
    new Rectangle(0, 0, child.width, child.height),
    (alpha << 24) | (red << 16) | (green << 8) | blue,
  );
  root.addChild(child);

  nextX += 10;
  nextY += 10;

  if (nextX >= WIDTH - 400 || nextY >= HEIGHT - 200) {
    nextX = 50;
    nextY = 50;
  } else {
    nextX += 20;
    nextY += 20;
  }
}

stage.addEventListener(KeyboardEvent.KEY_DOWN, (event: KeyboardEvent) => {
  switch (event.keyCode) {
    case Keyboard.UP: {
      const child = new Bitmap(new BitmapData(100, 100));
      children100.push(child);
      addNewBitmap(child);
      break;
    }
    case Keyboard.RIGHT: {
      const child = new Bitmap(new BitmapData(500, 500));
      children500.push(child);
      addNewBitmap(child);
      break;
    }
    case Keyboard.NUMBER_1: {
      const child = new Bitmap(new BitmapData(1000, 1000));
      children1000.push(child);
      addNewBitmap(child);
      break;
    }
    case Keyboard.DOWN:
      if (children100.length > 0) {
        root.removeChild(children100[0]);
      }
      children100.shift();
      break;
    case Keyboard.LEFT:
      if (children500.length > 0) {
        root.removeChild(children500[0]);
      }
      children500.shift();
      break;
    case Keyboard.NUMBER_4:
      if (children1000.length > 0) {
        root.removeChild(children1000[0]);
      }
      children1000.shift();
      break;
    case Keyboard.NUMBER_5:
      for (const child of children100) {
        root.removeChild(child);
      }
      for (const child of children500) {
        root.removeChild(child);
      }
      for (const child of children1000) {
        root.removeChild(child);
      }
      children100.length = 0;
      children500.length = 0;
      children1000.length = 0;
      break;
    default:
      return;
  }

  text.text = children100.length + 'x100, ' + children500.length + 'x500, ' + children1000.length + 'x1000';
});
