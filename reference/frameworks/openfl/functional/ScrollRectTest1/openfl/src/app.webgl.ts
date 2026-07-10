import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import type BitmapData from 'openfl/display/BitmapData';
import Loader from 'openfl/display/Loader';
import Sprite from 'openfl/display/Sprite';
import Event from 'openfl/events/Event';
import Rectangle from 'openfl/geom/Rectangle';
import UrlRequest from 'openfl/net/URLRequest';
import AntiAliasType from 'openfl/text/AntiAliasType';
import GridFitType from 'openfl/text/GridFitType';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';

const WIDTH = 1280;
const HEIGHT = 720;
const FRAMES_PER_ROTATION = 200;
const RADIUS = 120;

const { root } = createReferenceStage(WIDTH, HEIGHT, 0x000000);

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
  const owlData = await loadBitmapData('assets/OwlAlpha.png');

  const owlSprite = new Sprite();
  owlSprite.graphics.beginBitmapFill(owlData);
  owlSprite.graphics.drawRect(0, 0, owlData.width, owlData.height);
  owlSprite.graphics.endFill();

  const owlRect = new Rectangle(0, 300, 200, 250);

  const normalTextFormat = new TextFormat('_sans', 28, 0, false);
  normalTextFormat.align = TextFormatAlign.LEFT;

  const textField = new TextField();
  textField.antiAliasType = AntiAliasType.ADVANCED;
  textField.gridFitType = GridFitType.SUBPIXEL;
  textField.defaultTextFormat = normalTextFormat;
  textField.width = 1280;
  textField.height = 2000;
  textField.textColor = 0xe8c343;
  textField.selectable = false;
  textField.multiline = true;
  textField.wordWrap = false;
  textField.text =
    'The Shawshank Redemption (1994)\n' +
    'The Godfather (1972)\n' +
    'The Godfather: Part II (1974)\n' +
    'Pulp Fiction (1994)\n' +
    'The Good, the Bad and the Ugly (1966)\n' +
    'The Dark Knight (2008)\n' +
    '12 Angry Men (1957)\n' +
    "Schindler's List (1993)\n" +
    'The Lord of the Rings: The Return of the Kind (2003)\n' +
    'Fight Club (1999)\n' +
    'Star Wars: Episode V - The Empire Strikes Back (1980)\n' +
    'The Lord of the Rings: The Fellowship of the Ring (2001)\n' +
    "One Flew Over the Cuckoo's Next (1975)\n" +
    'Goodfellas (1990)\n' +
    'Seven Samurai (1954)\n' +
    'Inception (2010)\n' +
    'Star Wars: Episode IV - A New Hope (1977)\n' +
    'Forrest Gump (1994)\n' +
    'The Matrix (1999)\n' +
    'The Lord of the Rings: The Two Towers (2002)';

  const textSprite = new Sprite();
  textSprite.addChild(textField);
  owlSprite.x = 100;
  owlSprite.y = 630;
  textSprite.addChild(owlSprite);

  textSprite.x = 300;
  textSprite.y = 350;
  const textRect = new Rectangle(0, 0, 400, 300);
  textSprite.scrollRect = textRect;

  const outerSprite = new Sprite();
  outerSprite.graphics.beginFill(0xe8c343);
  outerSprite.graphics.drawRect(textSprite.x - 2, textSprite.y - 2, textRect.width + 4, 2);
  outerSprite.graphics.endFill();
  outerSprite.graphics.beginFill(0xe8c343);
  outerSprite.graphics.drawRect(textSprite.x - 2, textSprite.y - 2, 2, textRect.height + 4);
  outerSprite.graphics.endFill();
  outerSprite.graphics.beginFill(0xe8c343);
  outerSprite.graphics.drawRect(textSprite.x + textRect.width, textSprite.y - 2, 2, textRect.height + 4);
  outerSprite.graphics.endFill();
  outerSprite.graphics.beginFill(0xe8c343);
  outerSprite.graphics.drawRect(textSprite.x - 2, textSprite.y + textRect.height, textRect.width + 4, 2);
  outerSprite.graphics.endFill();

  outerSprite.addChild(textSprite);
  root.addChild(outerSprite);

  const outerRect = new Rectangle(0, 0, WIDTH, HEIGHT);
  outerSprite.scrollRect = outerRect;

  const status = new TextField();
  status.antiAliasType = AntiAliasType.ADVANCED;
  status.gridFitType = GridFitType.SUBPIXEL;
  status.selectable = false;
  status.defaultTextFormat = normalTextFormat;
  status.x = 0;
  status.y = 0;
  status.autoSize = TextFieldAutoSize.LEFT;
  status.textColor = 0xe8c343;

  textSprite.cacheAsBitmap = true;
  status.text = 'CacheAsBitmap: TRUE';
  root.addChild(status);

  let inc = 5;
  let outerAngle = 0;
  const outerInc = (2 * Math.PI) / FRAMES_PER_ROTATION;

  root.addEventListener(Event.ENTER_FRAME, () => {
    textRect.y += inc;

    if (textRect.y >= 550) {
      inc = -5;
      textSprite.cacheAsBitmap = false;
      status.text = 'CacheAsBitmap: FALSE';
    } else if (textRect.y <= 0) {
      inc = 5;
      textSprite.cacheAsBitmap = true;
      status.text = 'CacheAsBitmap: TRUE';
    }

    textSprite.scrollRect = textRect;

    owlRect.x += inc;
    owlSprite.scrollRect = owlRect;

    outerAngle += outerInc;
    if (outerAngle > 2 * Math.PI) {
      outerAngle -= 2 * Math.PI;
    }
    outerRect.x = RADIUS + RADIUS * Math.cos(outerAngle);
    outerRect.y = RADIUS + RADIUS * Math.sin(outerAngle) + (720 - HEIGHT) / 2;
    outerSprite.scrollRect = outerRect;
  });
})();
