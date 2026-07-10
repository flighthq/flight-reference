import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import type BitmapData from 'openfl/display/BitmapData';
import Loader from 'openfl/display/Loader';
import Event from 'openfl/events/Event';
import DropShadowFilter from 'openfl/filters/DropShadowFilter';
import UrlRequest from 'openfl/net/URLRequest';

const WIDTH = 800;
const HEIGHT = 400;

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
  const bd = await loadBitmapData('assets/openfl.png');

  const bitmaps: Bitmap[] = [];
  const filters: DropShadowFilter[] = [];

  for (let i = 0; i < 6; i++) {
    bitmaps[i] = new Bitmap(bd);
    bitmaps[i].x = 50 + i * (bd.width + 50);
    bitmaps[i].y = 50;
    filters[i] = new DropShadowFilter(4, 45, 0x000000, 1.0, 4, 4, 1, 3, false, false, false);
    bitmaps[i].filters = [filters[i]];
    root.addChild(bitmaps[i]);
  }

  filters[1].inner = true;

  filters[2].knockout = true;

  filters[3].inner = true;
  filters[3].knockout = true;

  filters[4].hideObject = true;

  filters[5].inner = true;
  filters[5].hideObject = true;

  root.addEventListener(Event.ENTER_FRAME, () => {
    const sinT = Math.sin(performance.now() / 1000) * 0.5 + 0.5;
    const blur = 2 + sinT * 8;
    const angle = sinT * 360;
    for (let i = 0; i < 6; i++) {
      filters[i].blurX = blur;
      filters[i].blurY = blur;
      filters[i].angle = angle;
      bitmaps[i].filters = [filters[i]];
    }
  });
})();
