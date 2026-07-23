import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import type BitmapData from 'openfl/display/BitmapData';
import Loader from 'openfl/display/Loader';
import Event from 'openfl/events/Event';
import Rectangle from 'openfl/geom/Rectangle';
import UrlRequest from 'openfl/net/URLRequest';
import TextField from 'openfl/text/TextField';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';

const WIDTH = 800;
const HEIGHT = 600;

const { root } = createReferenceStage(WIDTH, HEIGHT, 0xffffff);

root.graphics.beginFill(0xffffff);
root.graphics.drawRect(0, 0, WIDTH, HEIGHT);

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
  const image = await loadBitmapData('openfl/assets/openfl.png');
  const iw = image.width;
  const ih = image.height;

  // Background ghost bitmaps - two rows of 4
  for (let i = 0; i < 8; i++) {
    const bitmap = new Bitmap(image);
    bitmap.x = (i % 4) * (WIDTH / 4) + WIDTH / 8 - iw / 2;
    bitmap.y = i < 4 ? ih / 2 : HEIGHT / 2 + ih / 2;
    bitmap.alpha = 0.3;
    root.addChild(bitmap);
  }

  // Top row: 4 foreground bitmaps with scrollRect
  const bitmaps: Bitmap[] = [];
  for (let i = 0; i < 4; i++) {
    const bitmap = new Bitmap(image);
    bitmap.x = (i % 4) * (WIDTH / 4) + WIDTH / 8 - iw / 2;
    bitmap.y = ih / 2;
    root.addChild(bitmap);
    bitmaps.push(bitmap);
  }

  // First: no scroll rect
  // Second: scroll rect that just clips
  bitmaps[1].scrollRect = new Rectangle(0, 0, iw / 2, ih / 2);
  // Third: scroll rect that clips and translates
  bitmaps[2].scrollRect = new Rectangle(iw / 2, ih / 2, iw / 2, ih / 2);
  // Fourth: scroll rect that scrolls it entirely away
  bitmaps[3].scrollRect = new Rectangle(WIDTH * 2, HEIGHT * 2, WIDTH * 10, HEIGHT * 10);

  // Bottom row: 4 text fields with scrollRect
  const textFormat = new TextFormat('_sans', 32, 0, false);
  textFormat.align = TextFormatAlign.CENTER;
  const textFields: TextField[] = [];

  for (let i = 0; i < 4; i++) {
    const textField = new TextField();
    textField.selectable = false;
    textField.defaultTextFormat = textFormat;
    textField.x = (i % 4) * (WIDTH / 4);
    textField.y = HEIGHT / 2 + HEIGHT / 4;
    textField.width = 400;
    textField.height = 400;
    root.addChild(textField);
    textFields.push(textField);
  }

  // First: no scroll rect
  textFields[0].textColor = 0xaa1100;
  textFields[0].text = 'Text Field 1';

  // Second: scroll rect that just clips
  textFields[1].scrollRect = new Rectangle(0, 0, 200, 200);
  textFields[1].textColor = 0x11aa00;
  textFields[1].text = 'Text Field 2';

  // Third: scroll rect that clips and translates
  textFields[2].scrollRect = new Rectangle(0, 40, 200, 20);
  textFields[2].textColor = 0x1100aa;
  textFields[2].text = 'Text Field 3';

  // Fourth: scroll rect that scrolls it entirely away
  textFields[3].scrollRect = new Rectangle(WIDTH * 2, HEIGHT * 2, WIDTH * 10, HEIGHT * 10);
  textFields[3].textColor = 0x660066;
  textFields[3].text = 'Text Field 4';
})();
