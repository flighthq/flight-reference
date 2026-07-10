import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import type BitmapData from 'openfl/display/BitmapData';
import Loader from 'openfl/display/Loader';
import Event from 'openfl/events/Event';
import GlowFilter from 'openfl/filters/GlowFilter';
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
  const bd = await loadBitmapData('assets/openfl.png');

  const bitmaps: Bitmap[] = [];
  const filters: GlowFilter[] = [];

  for (let i = 0; i < 4; i++) {
    bitmaps[i] = new Bitmap(bd);
    bitmaps[i].x = 50 + i * (bd.width + 50);
    bitmaps[i].y = 50;
    root.addChild(bitmaps[i]);
    filters[i] = new GlowFilter(0xff0000, 1.0, 6, 6, 2, 3, false, false);
    bitmaps[i].filters = [filters[i]];
  }

  filters[1].inner = true;

  filters[2].knockout = true;

  filters[3].inner = true;
  filters[3].knockout = true;

  root.addEventListener(Event.ENTER_FRAME, () => {
    const sinT = Math.sin(performance.now() / 1000) * 0.5 + 0.5;
    const blur = 2 + sinT * 8;
    for (let i = 0; i < 4; i++) {
      filters[i].blurX = filters[i].blurY = blur;
      bitmaps[i].filters = [filters[i]];
    }
  });
})();
