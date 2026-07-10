import Sprite from 'openfl/display/Sprite';
import Tilemap from 'openfl/display/Tilemap';
import Tileset from 'openfl/display/Tileset';
import Event from 'openfl/events/Event';
import Rectangle from 'openfl/geom/Rectangle';
import Assets from 'openfl/utils/Assets';
import AnimatedTile from './AnimatedTile';

class Main extends Sprite {
  private blobAnimation: number[] = [];
  private bugAnimation: number[] = [];
  private owlAnimation: number[] = [];
  private snailAnimation: number[] = [];
  private tiles: AnimatedTile[] = [];
  private tilemap!: Tilemap;
  private tileset!: Tileset;

  public constructor() {
    super();

    this.buildTileset();

    this.tilemap = new Tilemap(176, 32, this.tileset);
    this.tilemap.tileColorTransformEnabled = false;
    this.tilemap.smoothing = false;
    this.tilemap.scaleX = 4;
    this.tilemap.scaleY = 4;
    this.tilemap.y = (this.stage.stageHeight - this.tilemap.height) / 2;
    this.tilemap.x = (this.stage.stageWidth - this.tilemap.width) / 2;
    this.addChild(this.tilemap);

    const snail = new AnimatedTile(this.snailAnimation);
    const blob = new AnimatedTile(this.blobAnimation);
    const owl = new AnimatedTile(this.owlAnimation);
    const bug = new AnimatedTile(this.bugAnimation);

    this.tiles = [snail, blob, owl, bug];

    for (let i = 0; i < this.tiles.length; i++) {
      this.tiles[i]!.x = 48 * i;
      this.tilemap.addTile(this.tiles[i]!);
    }

    this.addEventListener(Event.ENTER_FRAME, this.this_onEnterFrame);
  }

  private buildTileset(): void {
    const bitmapData = Assets.getBitmapData('assets/tileset.png');

    this.tileset = new Tileset(bitmapData);
    this.snailAnimation = [];
    this.blobAnimation = [];
    this.owlAnimation = [];
    this.bugAnimation = [];

    const rect = new Rectangle(0, 0, 32, 32);

    for (let i = 0; i < 4; i++) {
      rect.x = 32 * i;

      rect.y = 32;
      this.snailAnimation.push(this.tileset.addRect(rect));

      rect.y = 32 * 4;
      this.blobAnimation.push(this.tileset.addRect(rect));

      rect.y = 32 * 5;
      this.owlAnimation.push(this.tileset.addRect(rect));

      rect.y = 32 * 6;
      this.bugAnimation.push(this.tileset.addRect(rect));
    }
  }

  private this_onEnterFrame = (_event: Event): void => {
    for (const tile of this.tiles) {
      tile.update();
    }
  };
}

export default Main;
