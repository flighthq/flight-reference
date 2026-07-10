import { createReferenceStage } from '../../../../harness/stage';
import AntiAliasType from 'openfl/text/AntiAliasType';
import TextField from 'openfl/text/TextField';
import TextFormat from 'openfl/text/TextFormat';

const WIDTH = 1000;
const HEIGHT = 700;
const NUM_COLUMNS = 16;
const NUM_ROWS = 20;

const { root } = createReferenceStage(WIDTH, HEIGHT, 0xffffff);

root.graphics.beginFill(0xffffff, 1.0);
root.graphics.drawRect(0, 0, WIDTH, HEIGHT);
root.graphics.endFill();

let lineOffset = 0;
const rows: TextField[] = [];
const lines: TextField[][] = [];

const fmt = new TextFormat('Unifont', 18, 0, false);

function createTextField(format: TextFormat, x: number, y: number): TextField {
  const tf = new TextField();
  tf.antiAliasType = AntiAliasType.ADVANCED;
  tf.defaultTextFormat = format;
  tf.x = x;
  tf.y = y;
  return tf;
}

for (let x = 0; x < NUM_COLUMNS; x++) {
  const tf = createTextField(fmt, 200 + 50 * x, 20);
  tf.text = '' + x;
  root.addChild(tf);
}

for (let y = 0; y < NUM_ROWS; y++) {
  const tf = createTextField(fmt, 100, 75 + 30 * y);
  rows.push(tf);
  root.addChild(tf);
}

for (let y = 0; y < NUM_ROWS; y++) {
  const line: TextField[] = [];
  lines.push(line);
  for (let x = 0; x < NUM_COLUMNS; x++) {
    const tf = createTextField(fmt, 200 + 50 * x, 75 + 30 * y);
    root.addChild(tf);
    line.push(tf);
  }
}

function updateAllText(): void {
  for (let y = 0; y < NUM_ROWS; y++) {
    for (let x = 0; x < NUM_COLUMNS; x++) {
      const unicode = (y + lineOffset) * NUM_COLUMNS + x;
      if (unicode <= 0x10ffff) {
        lines[y][x].text = String.fromCharCode(unicode);
      }
    }
    const hex = ((y + lineOffset) * NUM_COLUMNS).toString(16);
    let text = '0x';
    for (let i = 0; i < 6 - hex.length; i++) {
      text += '0';
    }
    rows[y].text = text + hex;
  }
}

updateAllText();

document.addEventListener('keydown', (e) => {
  const maxLineOffset = Math.trunc(0x10ffff / NUM_COLUMNS);

  if (e.key === 'ArrowDown') {
    if (lineOffset < maxLineOffset) {
      lineOffset += 1;
      updateAllText();
    }
  } else if (e.key === 'ArrowRight') {
    let lo = lineOffset + 16;
    if (lo > maxLineOffset) {
      lo = maxLineOffset;
    }
    if (lo !== lineOffset) {
      lineOffset = lo;
      updateAllText();
    }
  } else if (e.key === 'ArrowUp') {
    if (lineOffset > 0) {
      lineOffset -= 1;
      updateAllText();
    }
  } else if (e.key === 'ArrowLeft') {
    let lo = lineOffset - 16;
    if (lo < 0) {
      lo = 0;
    }
    if (lo !== lineOffset) {
      lineOffset = lo;
      updateAllText();
    }
  }
});
