import Bitmap from 'openfl/display/Bitmap';
import BitmapData from 'openfl/display/BitmapData';
import Sprite from 'openfl/display/Sprite';
import Point from 'openfl/geom/Point';
import Assets from 'openfl/utils/Assets';

class Main extends Sprite {
  private size = 0;

  public constructor() {
    super();

    this.test(32);
  }

  private test(size: number): void {
    this.size = size;

    const checkers = Assets.getBitmapData(`assets/${size}/checkers.png`);
    const checkersAlpha = Assets.getBitmapData(`assets/${size}/checkers_alpha.png`);
    const noise1 = Assets.getBitmapData(`assets/${size}/noise1.png`);
    const noise2 = Assets.getBitmapData(`assets/${size}/noise2.png`);
    const redBall = Assets.getBitmapData(`assets/${size}/red_ball.png`);
    const redBallAlpha = Assets.getBitmapData(`assets/${size}/red_ball_alpha.png`);
    const redBallHalfAlpha = Assets.getBitmapData(`assets/${size}/red_ball_half_alpha.png`);
    const yellowBall = Assets.getBitmapData(`assets/${size}/yellow_ball.png`);
    const rectangle = Assets.getBitmapData(`assets/${size}/rectangle.png`);
    const rectangle2 = Assets.getBitmapData(`assets/${size}/rectangle2.png`);

    const nullBmp: BitmapData | null = null;
    const disposedBmp = checkers.clone();
    disposedBmp.dispose();

    const list = [
      checkers,
      checkersAlpha,
      noise1,
      noise2,
      redBall,
      redBallAlpha,
      redBallHalfAlpha,
      yellowBall,
      rectangle,
      rectangle2,
      nullBmp,
      disposedBmp,
    ];

    this.addColumn(10, checkers.height + 20, list);
    this.addRow(checkers.width + 20, 10, list);

    let xx = 20 + checkers.width;
    const yy = 20 + checkers.height;

    for (let i = 0; i < list.length; i++) {
      this.addColumn(xx, yy, this.compare(list[i], list));
      xx += checkers.width + 10;
    }
  }

  private compare(bmp: BitmapData | null, list: Array<BitmapData | null>): BitmapData[] {
    const resultBitmaps: BitmapData[] = [];

    for (const other of list) {
      let result: BitmapData | number = -5;

      if (bmp === null) {
        if (other !== null) {
          try {
            result = other.compare(bmp);
          } catch {
            result = -5;
          }
        } else {
          result = -5;
        }
      } else {
        try {
          result = bmp.compare(other);
        } catch {
          result = -5;
        }
      }

      if (result instanceof BitmapData) {
        resultBitmaps.push(result);
      } else if (typeof result === 'number') {
        resultBitmaps.push(this.resultBitmap(result));
      } else {
        resultBitmaps.push(Assets.getBitmapData(`assets/${this.size}/error.png`));
      }
    }

    return resultBitmaps;
  }

  private isDisposed(bmp: BitmapData | null): boolean {
    if (bmp === null) return false;
    return (bmp as BitmapData & { __isValid?: boolean }).__isValid === false;
  }

  private resultBitmap(result: number): BitmapData {
    switch (result) {
      case -1:
        return Assets.getBitmapData(`assets/${this.size}/minus1.png`);
      case -2:
        return Assets.getBitmapData(`assets/${this.size}/minus2.png`);
      case -3:
        return Assets.getBitmapData(`assets/${this.size}/minus3.png`);
      case -4:
        return Assets.getBitmapData(`assets/${this.size}/minus4.png`);
      case 0:
        return Assets.getBitmapData(`assets/${this.size}/0.png`);
      default:
        return Assets.getBitmapData(`assets/${this.size}/error.png`);
    }
  }

  private getBitmapDataForDisplay(bmp: BitmapData | null): BitmapData {
    if (bmp === null) return Assets.getBitmapData(`assets/${this.size}/null.png`);
    if (this.isDisposed(bmp)) return Assets.getBitmapData(`assets/${this.size}/disposed.png`);
    return bmp;
  }

  private addColumn(xx: number, yy: number, list: Array<BitmapData | null>): void {
    const itemHeight = this.getBitmapDataForDisplay(list[0]).height;

    for (const bmp of list) {
      const bitmap = new Bitmap(this.getBitmapDataForDisplay(bmp));
      bitmap.x = xx;
      bitmap.y = yy;
      yy += itemHeight + 10;
      this.addChild(bitmap);
    }
  }

  private addRow(xx: number, yy: number, list: Array<BitmapData | null>): void {
    const itemWidth = this.getBitmapDataForDisplay(list[0]).width;

    for (const bmp of list) {
      const bitmap = new Bitmap(this.getBitmapDataForDisplay(bmp));
      bitmap.x = xx;
      bitmap.y = yy;
      xx += itemWidth + 10;
      this.addChild(bitmap);
    }
  }
}

export default Main;
