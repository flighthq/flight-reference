import Shape from 'openfl/display/Shape';
import Sprite from 'openfl/display/Sprite';
import Player from './Player';

class Tile extends Sprite {
  private shape: Shape;
  private _winner = false;
  private _player: Player | null = null;

  public constructor() {
    super();

    this.graphics.beginFill(0xff00ff, 0);
    this.graphics.drawRect(0, 0, 50, 50);
    this.graphics.endFill();

    this.shape = new Shape();
    this.addChild(this.shape);
  }

  public get winner(): boolean {
    return this._winner;
  }

  public set winner(value: boolean) {
    if (this._winner === value) return;
    this._winner = value;
    this.redrawShape();
  }

  public get player(): Player | null {
    return this._player;
  }

  public set player(value: Player | null) {
    if (this._player === value) return;
    this._player = value;
    this.redrawShape();
  }

  private redrawShape(): void {
    this.shape.graphics.clear();
    if (this._player === null) return;

    const color = this._winner ? 0xff9900 : this._player === Player.X ? 0x990000 : 0x000099;
    this.shape.graphics.lineStyle(12, color);

    if (this._player === Player.X) {
      this.shape.graphics.moveTo(11, 11);
      this.shape.graphics.lineTo(39, 39);
      this.shape.graphics.moveTo(11, 39);
      this.shape.graphics.lineTo(39, 11);
    } else {
      this.shape.graphics.drawCircle(25, 25, 14);
    }
  }
}

export default Tile;
