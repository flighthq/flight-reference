import AntiAliasType from 'openfl/text/AntiAliasType';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';

import { createReferenceStage } from '../../../../harness/stage';

const WIDTH = 800;
const HEIGHT = 600;

const { root } = createReferenceStage(WIDTH, HEIGHT, 0xffffff);

function createTextField(fmt: TextFormat, x: number, y: number): TextField {
  const tf = new TextField();
  tf.autoSize = TextFieldAutoSize.LEFT;
  tf.antiAliasType = AntiAliasType.ADVANCED;
  tf.defaultTextFormat = fmt;
  tf.x = x;
  tf.y = y;
  return tf;
}

(async () => {
  const ff = new FontFace('Unifont', 'url(assets/unifont-8.0.01.ttf)');
  await ff.load();
  (document.fonts as any).add(ff);

  const utf8str = await (await fetch('assets/data.utf8')).text();

  root.graphics.beginFill(0xffffff, 1.0);
  root.graphics.drawRect(0, 0, WIDTH, HEIGHT);
  root.graphics.endFill();

  const fmt = new TextFormat('Unifont', 18, 0, false);

  // Display full string
  let tf = createTextField(fmt, 50, 50);
  tf.text = utf8str;
  root.addChild(tf);

  // Display length of the string
  tf = createTextField(fmt, 400, 50);
  tf.text = '' + utf8str.length;
  root.addChild(tf);

  // Draw the characters one by one
  for (let i = 0; i < utf8str.length; i++) {
    tf = createTextField(fmt, 450 + i * 30, 50);
    tf.text = utf8str.charAt(i);
    root.addChild(tf);
  }

  // Draw two-character substrings
  for (let i = 0; i < Math.trunc(utf8str.length / 2); i++) {
    tf = createTextField(fmt, 450 + i * 60, 100);
    tf.text = utf8str.substr(i * 2, 2);
    root.addChild(tf);
  }
})();
