import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import BitmapData from 'openfl/display/BitmapData';
import Loader from 'openfl/display/Loader';
import Event from 'openfl/events/Event';
import Rectangle from 'openfl/geom/Rectangle';
import UrlRequest from 'openfl/net/URLRequest';

const WIDTH = 800;
const HEIGHT = 600;

const { root } = createReferenceStage(WIDTH, HEIGHT, 0xffffff);

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
  const bitmaps: Bitmap[] = [];
  const masks: Bitmap[] = [];
  const bgMasks: Bitmap[] = [];

  for (let i = 0; i < 4; i++) {
    const bgBitmap = new Bitmap(image.clone());
    root.addChild(bgBitmap);
    const bgMask = new Bitmap(image.clone());
    root.addChild(bgMask);
    const bitmap = new Bitmap(image.clone());
    root.addChild(bitmap);
    const mask = new Bitmap(image.clone());
    root.addChild(mask);

    bitmap.x = (i % 2) * (WIDTH / 3) + WIDTH / 6;
    if (i < 2) {
      bitmap.y = 0;
    } else {
      bitmap.y = HEIGHT / 2;
    }
    bitmap.x -= image.width / 2;
    bitmap.y += image.height / 2;
    bgBitmap.alpha = 0.3;
    bgBitmap.x = bitmap.x;
    bgBitmap.y = bitmap.y;
    bitmaps.push(bitmap);
    mask.x = bitmap.x;
    mask.y = bitmap.y;
    masks.push(mask);
    bgMask.alpha = 0.3;
    bgMask.x = mask.x;
    bgMask.y = mask.y;
    bgMasks.push(bgMask);
    bitmap.mask = mask;
  }

  // Alpha mask 1: gradient (fully opaque at top, transparent at bottom)
  const alphaMask1 = new BitmapData(image.width, image.height);
  for (let y = 0; y < image.height; y++) {
    const alpha = Math.trunc(((image.height - y) * 0xff) / image.height);
    const color = alpha << 24;
    alphaMask1.fillRect(new Rectangle(0, y, image.width, 1), color);
  }

  // Alpha mask 2: checkerboard with alternating alpha
  const alphaMask2 = new BitmapData(image.width, image.height);
  const blockWidth = Math.trunc(image.width / 8);
  const blockHeight = Math.trunc(image.height / 8);
  for (let y = 0; y < 8; y++) {
    let toggle = y % 2 === 0;
    for (let x = 0; x < 8; x++) {
      alphaMask2.fillRect(
        new Rectangle(x * blockWidth, y * blockHeight, blockWidth, blockHeight),
        toggle ? 0x22000000 : 0xcc000000,
      );
      toggle = !toggle;
    }
  }

  // Top-right: bitmap with gradient alpha mask
  let bitmap = new Bitmap(image.clone());
  root.addChild(bitmap);
  let mask = new Bitmap(alphaMask1);
  bitmap.cacheAsBitmap = true;
  mask.cacheAsBitmap = true;
  root.addChild(mask);
  bitmap.x = 2 * (WIDTH / 3) + WIDTH / 6;
  bitmap.y = 0;
  bitmap.x -= image.width / 2;
  bitmap.y += image.height / 2;
  bitmaps.push(bitmap);
  mask.x = bitmap.x;
  mask.y = bitmap.y;
  masks.push(mask);
  bitmap.mask = mask;

  // Bottom-right: bitmap with checkerboard alpha mask
  bitmap = new Bitmap(image.clone());
  root.addChild(bitmap);
  mask = new Bitmap(alphaMask2);
  bitmap.cacheAsBitmap = true;
  mask.cacheAsBitmap = true;
  root.addChild(mask);
  bitmap.x = 2 * (WIDTH / 3) + WIDTH / 6;
  bitmap.y = HEIGHT / 2;
  bitmap.x -= image.width / 2;
  bitmap.y += image.height / 2;
  bitmaps.push(bitmap);
  mask.x = bitmap.x;
  mask.y = bitmap.y;
  masks.push(mask);
  bitmap.mask = mask;

  // Adjust mask offsets
  masks[1].x -= 10;
  masks[1].y -= 10;
  bgMasks[1].x = masks[1].x;
  bgMasks[1].y = masks[1].y;

  masks[2].x += image.width / 4;
  masks[2].y += image.height / 4;
  bgMasks[2].x = masks[2].x;
  bgMasks[2].y = masks[2].y;

  masks[3].x += WIDTH * 10;
  masks[3].y += HEIGHT * 10;
  bgMasks[3].x = masks[3].x;
  bgMasks[3].y = masks[3].y;
})();
