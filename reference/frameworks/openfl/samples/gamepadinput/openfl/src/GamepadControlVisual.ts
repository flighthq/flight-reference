import Bitmap from 'openfl/display/Bitmap';
import BitmapData from 'openfl/display/BitmapData';
import Sprite from 'openfl/display/Sprite';
import TextField from 'openfl/text/TextField';

class GamepadControlVisual extends Sprite {
  public id = 0;
  public label = '';
  public type = '';

  private bmp!: Bitmap;
  private invBmp!: Bitmap;
  private valTxt!: TextField;
  private _value = 0;

  public constructor(size: number, type_: string, id_: number, label_: string) {
    super();

    this.type = type_;
    this.id = id_;
    this.label = label_;

    switch (this.type) {
      case 'button':
        this.make(size, 0xff00ff00);
        break;
      case 'axis':
        this.make(size, 0xff00ffff);
        break;
      case 'hat':
        this.make(size, 0xffff00ff);
        break;
      case 'ball':
        this.make(size, 0xffffff00);
        break;
    }

    this.value = 0;
  }

  public get value(): number {
    return this._value;
  }

  public set value(f: number) {
    this._value = f;

    if (this.valTxt != null) {
      this.valTxt.text = this.pretty(f);
    }

    var v = Math.abs(f);
    if (v > 1) {
      v = 1;
    }

    if (this.bmp != null) {
      this.bmp.alpha = v * 0.75 + 0.25;
    }
    if (this.invBmp != null) {
      this.invBmp.alpha = v * 0.75 + 0.25;
    }

    if (this.bmp != null) {
      this.bmp.visible = f >= 0;
    }
    if (this.invBmp != null) {
      this.invBmp.visible = f < 0;
    }
  }

  private pretty(f: number): string {
    var s = String(Math.trunc(f * 100) / 100);
    if (f > 0) {
      s = ' ' + s;
    }
    return s;
  }

  private make(size: number, color: number): void {
    this.bmp = new Bitmap(new BitmapData(1, 1, true, color));
    this.bmp.width = size;
    this.bmp.height = size;

    var col = 0x00ffffff & color;
    var r = (0xff0000 & col) >> 16;
    var g = (0x00ff00 & col) >> 8;
    var b = 0x0000ff & col;

    var ri = 0xff - r;
    var gi = 0xff - g;
    var bi = 0xff - b;
    var inverseColor = 0xff000000 | (ri << 16) | (gi << 8) | bi;

    this.invBmp = new Bitmap(new BitmapData(1, 1, true, inverseColor));
    this.invBmp.width = size;
    this.invBmp.height = size;

    var txt = new TextField();
    txt.width = this.bmp.width;
    txt.height = this.bmp.height;
    txt.text = this.label;

    this.valTxt = new TextField();
    this.valTxt.width = this.bmp.width;
    txt.height = this.bmp.height;
    this.valTxt.text = '?';

    this.addChild(this.bmp);
    this.addChild(this.invBmp);
    this.addChild(txt);
    this.addChild(this.valTxt);

    this.valTxt.y = txt.y + txt.textHeight;
    this.invBmp.visible = false;
  }
}

export default GamepadControlVisual;
