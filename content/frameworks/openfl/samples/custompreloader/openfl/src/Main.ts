import Bitmap from 'openfl/display/Bitmap';
import Sprite from 'openfl/display/Sprite';

class Main extends Sprite {
  public constructor(bitmap: Bitmap, stageWidth: number, stageHeight: number) {
    super();

    this.addChild(bitmap);

    bitmap.x = (stageWidth - bitmap.width) / 2;
    bitmap.y = (stageHeight - bitmap.height) / 2;
  }
}

export default Main;
