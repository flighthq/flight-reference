import { createReferenceStage } from '../../../../harness/stage';
import Bitmap from 'openfl/display/Bitmap';
import type BitmapData from 'openfl/display/BitmapData';
import Loader from 'openfl/display/Loader';
import Event from 'openfl/events/Event';
import BlurFilter from 'openfl/filters/BlurFilter';
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
  const bitmapData = await loadBitmapData('assets/openfl.png');

  const bitmaps: Bitmap[] = [];
  const filters: BlurFilter[] = [];

  for (let i = 0; i < 3; i++) {
    bitmaps[i] = new Bitmap(bitmapData);
    bitmaps[i].x = 50 + i * (bitmapData.width + 50);
    bitmaps[i].y = 50;
    root.addChild(bitmaps[i]);
    filters[i] = new BlurFilter(4, 4, i + 1);
    bitmaps[i].filters = [filters[i]];
  }

  root.addEventListener(Event.ENTER_FRAME, () => {
    const sinT = Math.sin((performance.now() / 1000) * 0.5);
    const amount = Math.abs(sinT) * 64;
    for (let i = 0; i < 3; i++) {
      filters[i].blurX = filters[i].blurY = amount;
      bitmaps[i].filters = [filters[i]];
    }
  });
})();
