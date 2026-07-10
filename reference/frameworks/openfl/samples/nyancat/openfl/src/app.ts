import Bitmap from 'openfl/display/Bitmap';
import BitmapData from 'openfl/display/BitmapData';
import Sprite from 'openfl/display/Sprite';
import Stage from 'openfl/display/Stage';
import Event from 'openfl/events/Event';
import Point from 'openfl/geom/Point';
import Rectangle from 'openfl/geom/Rectangle';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';

const FRAME_WIDTH = 220;
const FRAME_HEIGHT = 220;
const FRAME_MARGIN = 2;
const FRAME_GAP = 4;
const FRAMES_PER_ROW = [5, 4];
const FRAME_DURATION_MS = 100;
const STAGE_WIDTH = 400;
const STAGE_HEIGHT = 400;

class App extends Sprite {
  private frameBitmap: Bitmap;
  private frameData: BitmapData;
  private frames: Rectangle[] = [];
  private index = 0;
  private lastFrameAt = 0;
  private spriteSheet: BitmapData;

  public constructor() {
    super();

    this.spriteSheet = Assets.getBitmapData('assets/nyancat.png');
    this.frameData = new BitmapData(FRAME_WIDTH, FRAME_HEIGHT, true, 0x00000000);
    this.frameBitmap = new Bitmap(this.frameData);
    this.frameBitmap.x = (STAGE_WIDTH - FRAME_WIDTH) / 2;
    this.frameBitmap.y = (STAGE_HEIGHT - FRAME_HEIGHT) / 2;
    this.addChild(this.frameBitmap);

    for (let row = 0; row < FRAMES_PER_ROW.length; row++) {
      for (let col = 0; col < FRAMES_PER_ROW[row]; col++) {
        this.frames.push(
          new Rectangle(
            FRAME_MARGIN + col * (FRAME_WIDTH + FRAME_GAP),
            FRAME_MARGIN + row * (FRAME_HEIGHT + FRAME_GAP),
            FRAME_WIDTH,
            FRAME_HEIGHT,
          ),
        );
      }
    }

    this.drawFrame();
    this.addEventListener(Event.ENTER_FRAME, this.this_onEnterFrame);
  }

  private drawFrame(): void {
    this.frameData.fillRect(this.frameData.rect, 0x00000000);
    this.frameData.copyPixels(this.spriteSheet, this.frames[this.index], new Point(0, 0), null, null, true);
  }

  private this_onEnterFrame = (_event: Event): void => {
    const now = performance.now();
    if (now - this.lastFrameAt < FRAME_DURATION_MS) {
      return;
    }

    this.lastFrameAt = now;
    this.index = (this.index + 1) % this.frames.length;
    this.drawFrame();
  };
}

const manifest = new AssetManifest();
manifest.addBitmapData('assets/nyancat.png');

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    const stage = new Stage(STAGE_WIDTH, STAGE_HEIGHT, 0xffffff, App);
    stage.element.style.width = STAGE_WIDTH + 'px';
    stage.element.style.height = STAGE_HEIGHT + 'px';
    document.getElementById('app')?.remove();
    document.body.appendChild(stage.element);
  })
  .onError((error) => {
    console.error(error);
  });
