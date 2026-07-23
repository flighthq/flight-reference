import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import type BitmapData from 'openfl/display/BitmapData';
import BlendMode from 'openfl/display/BlendMode';
import Loader from 'openfl/display/Loader';
import Event from 'openfl/events/Event';
import UrlRequest from 'openfl/net/URLRequest';
import TextField from 'openfl/text/TextField';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';

const WIDTH = 800;
const HEIGHT = 600;

const blendModes = [
  BlendMode.NORMAL,
  BlendMode.LAYER,
  BlendMode.MULTIPLY,
  BlendMode.SCREEN,
  BlendMode.LIGHTEN,
  BlendMode.DARKEN,
  BlendMode.DIFFERENCE,
  BlendMode.ADD,
  BlendMode.SUBTRACT,
  BlendMode.INVERT,
  BlendMode.ALPHA,
  BlendMode.ERASE,
  BlendMode.OVERLAY,
  BlendMode.HARDLIGHT,
];

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

function createOverlay(squareBd: BitmapData, circleBd: BitmapData, x: number, y: number, blendMode: BlendMode): void {
  const square = new Bitmap(squareBd);
  square.x = x - square.width / 2;
  square.y = y - square.height / 2;
  root.addChild(square);

  const circle = new Bitmap(circleBd);
  circle.x = x - 10;
  circle.y = y - 10;
  circle.blendMode = blendMode;
  root.addChild(circle);

  const textFormat = new TextFormat('_sans', 14, 0, true);
  textFormat.align = TextFormatAlign.CENTER;

  const text = new TextField();
  text.selectable = false;
  text.defaultTextFormat = textFormat;
  text.x = x - square.height / 2 - 30;
  text.y = y + square.height / 2 + 40;
  text.width = 200;
  text.height = 200;
  text.textColor = 0x222222;
  text.text = String(blendMode);
  root.addChild(text);
}

(async () => {
  const [squareBd, circleBd] = await Promise.all([
    loadBitmapData('openfl/assets/BlendSquare.png'),
    loadBitmapData('openfl/assets/BlendCircle.png'),
  ]);

  let rows = 1;
  while (rows * ((rows * 16) / 9) < blendModes.length) {
    rows++;
  }
  const columns = Math.trunc((rows * 16) / 9);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const index = y * columns + x;
      if (index >= blendModes.length) {
        continue;
      }
      const xpos = (WIDTH * x) / columns + WIDTH / (2 * columns);
      const ypos = (HEIGHT * y) / rows + HEIGHT / (2 * rows) - 20;
      createOverlay(squareBd, circleBd, xpos, ypos, blendModes[index]);
    }
  }
})();
