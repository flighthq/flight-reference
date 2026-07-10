import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import type BitmapData from 'openfl/display/BitmapData';
import Loader from 'openfl/display/Loader';
import Sprite from 'openfl/display/Sprite';
import Event from 'openfl/events/Event';
import ColorTransform from 'openfl/geom/ColorTransform';
import UrlRequest from 'openfl/net/URLRequest';
import AntiAliasType from 'openfl/text/AntiAliasType';
import GridFitType from 'openfl/text/GridFitType';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';

const WIDTH = 800;
const HEIGHT = 600;

const menuStrings = [
  'Lady and the Tramp',
  'The Adventures of Milo and Otis',
  'Mary Poppins',
  "Charlotte's Web",
  'The Secret World of Arrietty',
  'Babe',
  "It's a Wonderful Life",
  'Bringing Up Baby',
  'It Happened One Night',
];

function pos(i: number): number {
  return (i * HEIGHT) / 720;
}

const { root } = createReferenceStage(WIDTH, HEIGHT, 0x000000);

root.graphics.beginFill(0);
root.graphics.drawRect(0, 0, WIDTH, HEIGHT);
root.graphics.endFill();

function loadBitmapData(url: string): Promise<BitmapData> {
  return new Promise<BitmapData>((resolve) => {
    const loader = new Loader();
    loader.contentLoaderInfo.addEventListener(Event.COMPLETE, () => {
      resolve((loader.content as Bitmap).bitmapData!);
    });
    loader.load(new UrlRequest(url));
  });
}

(async () => {
  const bitmapData = await loadBitmapData('assets/openfl.png');

  const posters = new Sprite();

  const image1 = new Bitmap(bitmapData);
  image1.scaleX = pos(1.0);
  image1.scaleY = pos(1.0);
  posters.addChild(image1);

  const image2 = new Bitmap(bitmapData);
  image2.alpha = 0.5;
  image2.x = pos(125);
  image2.scaleX = pos(1.0);
  image2.scaleY = pos(1.0);
  posters.addChild(image2);

  const image3 = new Bitmap(bitmapData);
  image3.x = pos(250);
  image3.scaleX = pos(1.0);
  image3.scaleY = pos(1.0);
  image3.transform.colorTransform = new ColorTransform(1, 0, 1, 1);
  posters.addChild(image3);

  root.addChild(posters);

  const bigTextFormat = new TextFormat('_sans', Math.trunc(pos(44)), 0, false);
  bigTextFormat.align = TextFormatAlign.LEFT;

  const menuObject = new Sprite();

  menuObject.graphics.beginFill(0xff22ff);
  menuObject.graphics.drawRect(pos(109), pos(186), pos(1171), pos(572));

  const title = new TextField();
  title.antiAliasType = AntiAliasType.ADVANCED;
  title.gridFitType = GridFitType.SUBPIXEL;
  title.selectable = false;
  title.defaultTextFormat = bigTextFormat;
  title.x = pos(109);
  title.y = pos(186);
  title.autoSize = TextFieldAutoSize.LEFT;
  title.textColor = 0xe8c343;
  title.text = 'My Collection';
  menuObject.addChild(title);
  menuObject.cacheAsBitmap = true;

  const normalTextFormat = new TextFormat('_sans', Math.trunc(pos(28)), 0, false);
  normalTextFormat.align = TextFormatAlign.LEFT;

  let y = 291;
  for (const m of menuStrings) {
    const text = new TextField();
    text.selectable = false;
    text.defaultTextFormat = normalTextFormat;
    text.x = pos(109);
    text.y = pos(y);
    text.autoSize = TextFieldAutoSize.LEFT;
    text.textColor = 0xffffff;
    text.text = m;
    menuObject.addChild(text);
    y += 44;
  }

  root.addChild(menuObject);

  const status = new TextField();
  status.antiAliasType = AntiAliasType.ADVANCED;
  status.gridFitType = GridFitType.SUBPIXEL;
  status.selectable = false;
  status.defaultTextFormat = normalTextFormat;
  status.x = 0;
  status.y = 0;
  status.autoSize = TextFieldAutoSize.LEFT;
  status.textColor = 0xe8c343;
  status.text = 'CacheAsBitmap: ' + (menuObject.cacheAsBitmap ? 'TRUE' : 'FALSE');

  root.addChild(status);

  let lastTime = performance.now() / 1000;
  let menuX = 0;
  let menuXInc = 5;

  root.addEventListener(Event.ENTER_FRAME, () => {
    const timeNow = performance.now() / 1000;

    menuX += Math.trunc(pos(menuXInc));
    if (menuX <= 0 || menuX >= 640) {
      menuXInc = -menuXInc;
      lastTime = timeNow;
      menuObject.cacheAsBitmap = !menuObject.cacheAsBitmap;
      status.text = 'CacheAsBitmap: ' + (menuObject.cacheAsBitmap ? 'TRUE' : 'FALSE');
    }

    posters.x = menuX;
    menuObject.x = menuX;
    menuObject.alpha = (pos(640) - menuX) / pos(640);
    posters.alpha = menuObject.alpha;
  });
})();
