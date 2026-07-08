import Bitmap from 'openfl/display/Bitmap';
import BitmapData from 'openfl/display/BitmapData';
import Sprite from 'openfl/display/Sprite';
import Point from 'openfl/geom/Point';
import Rectangle from 'openfl/geom/Rectangle';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';
import Assets from 'openfl/utils/Assets';

class Main extends Sprite {
  private box!: Point;
  private buffer = 64;
  private field!: Point;
  private gutter = 2;
  private out!: TextField;

  public constructor() {
    super();

    this.box = new Point(354, 354);
    this.field = new Point(this.box.x - this.gutter * 2, this.box.y - this.gutter * 2);

    var offset = new Point(300, 100);
    var font = Assets.getFont('assets/LiberationSerif-Regular.ttf');
    var format = new TextFormat(
      font.fontName,
      120,
      0x000000,
      null,
      null,
      null,
      null,
      null,
      TextFormatAlign.CENTER,
      null,
      null,
      null,
      20,
    );
    var textField = new TextField();

    textField.defaultTextFormat = format;
    textField.embedFonts = true;
    textField.selectable = false;
    textField.border = true;
    textField.borderColor = 0x000000;
    textField.x = offset.x;
    textField.y = offset.y;
    textField.autoSize = TextFieldAutoSize.NONE;
    textField.multiline = true;
    textField.text = 'Wqx\nWqx';
    textField.width = this.field.x;
    textField.height = this.field.y;
    this.addChild(textField);

    var bitmap = new Bitmap(
      new BitmapData(this.box.x + this.buffer * 2, this.box.y + this.buffer * 2, true, 0xffe0e0e0),
    );
    bitmap.x = textField.x - this.buffer;
    bitmap.y = textField.y - this.buffer;
    this.addChild(bitmap);

    this.out = new TextField();
    this.out.width = 400;
    this.out.height = 1000;
    this.addChild(this.out);

    var white = new Bitmap(new BitmapData(200, 100, false, 0xffffff));
    this.addChild(white);
    white.x = 0;
    white.y = 250;

    var text2 = new TextField();
    text2.wordWrap = true;
    text2.width = 200;
    text2.y = 250;
    text2.text =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
    this.addChild(text2);

    this.traceLineMetrics(textField, this.out);
    this.drawLineMetrics(bitmap.bitmapData, textField);
  }

  private traceLineMetrics(text: TextField, out: TextField): void {
    var str = '';
    str += 'x/y = ' + text.x + ' / ' + text.y;
    str += '\n' + ('width/height = ' + text.width + ' / ' + text.height);
    str += '\n' + ('textWidth/textHeight = ' + text.textWidth + ' / ' + text.textHeight);

    for (var i = 0; i < text.numLines; i++) {
      var tlm = text.getLineMetrics(i);
      str += '\n' + ('line(' + i + ') x = ' + tlm.x);
      str += '\n' + ('line(' + i + ') width = ' + tlm.width);
      str += '\n' + ('line(' + i + ') height = ' + tlm.height);
      str += '\n' + ('line(' + i + ') ascent = ' + tlm.ascent);
      str += '\n' + ('line(' + i + ') descent = ' + tlm.descent);
      str += '\n' + ('line(' + i + ') leading = ' + tlm.leading);
    }

    out.text = str;
  }

  private drawLineMetrics(bmp: BitmapData, text: TextField): void {
    var tlm = text.getLineMetrics(0);
    var rect = new Rectangle();

    rect.x = 0;
    rect.y = 0;
    rect.width = bmp.width;
    rect.height = bmp.height;
    bmp.fillRect(rect, 0x00ffffff);

    var green = 0xff00ff00;
    var red = 0xffff0000;

    rect.x = this.buffer;
    rect.height = 1;

    rect.y = this.buffer / 2;
    rect.width = text.width;
    bmp.fillRect(rect, green);

    rect.y = 0;
    rect.width = 1;
    rect.height = bmp.height;
    bmp.fillRect(rect, red);

    rect.x = this.buffer + text.width;
    bmp.fillRect(rect, red);

    rect.x = this.buffer;
    rect.height = 1;

    rect.x = this.buffer + this.gutter + tlm.x;
    rect.y = bmp.height - this.buffer / 2;
    rect.width = text.textWidth;
    bmp.fillRect(rect, green);

    rect.y = 0;
    rect.width = 1;
    rect.height = bmp.height;
    bmp.fillRect(rect, red);

    rect.x = this.buffer + this.gutter + tlm.x + text.textWidth;
    bmp.fillRect(rect, red);

    rect.x = this.buffer + tlm.x;
    rect.height = 1;

    rect.x = this.buffer / 4;
    rect.y = this.buffer;
    rect.width = 1;
    rect.height = text.height;
    bmp.fillRect(rect, green);

    rect.width = bmp.width - this.gutter * 2;
    rect.height = 1;
    bmp.fillRect(rect, red);

    rect.y = rect.y + text.height;
    bmp.fillRect(rect, red);

    rect.width = 1;

    rect.x = this.buffer / 2;
    rect.y = this.buffer + this.gutter;
    rect.height = text.height - this.gutter * 2;
    bmp.fillRect(rect, green);

    rect.width = bmp.width - this.gutter * 2;
    rect.height = 1;
    bmp.fillRect(rect, red);

    rect.y = rect.y + text.height - this.gutter * 2;
    bmp.fillRect(rect, red);

    rect.width = 1;

    rect.x = (this.buffer * 3) / 4;
    rect.y = this.buffer + this.gutter;
    rect.height = tlm.height;
    bmp.fillRect(rect, green);

    rect.width = bmp.width - this.gutter * 2;
    rect.height = 1;
    bmp.fillRect(rect, red);

    rect.y = rect.y + tlm.height;
    bmp.fillRect(rect, red);

    rect.width = 1;

    rect.x = this.buffer / 8;
    rect.y = this.buffer + this.gutter;
    rect.height = text.textHeight;
    bmp.fillRect(rect, green);

    rect.width = bmp.width - this.gutter * 2;
    rect.height = 1;
    bmp.fillRect(rect, red);

    rect.y = rect.y + text.textHeight;
    bmp.fillRect(rect, red);

    rect.width = 1;

    rect.x = bmp.width - (this.buffer * 3) / 4;
    rect.y = this.buffer + this.gutter;
    rect.height = tlm.ascent;
    bmp.fillRect(rect, green);

    rect.x = (this.buffer * 3) / 4;
    rect.width = bmp.width - this.gutter * 2;
    rect.height = 1;
    bmp.fillRect(rect, red);

    rect.y = rect.y + tlm.ascent;
    bmp.fillRect(rect, red);

    rect.width = 1;

    rect.x = bmp.width - this.buffer / 2;
    rect.y = this.buffer + this.gutter + tlm.ascent;
    rect.height = tlm.descent;
    bmp.fillRect(rect, green);

    rect.x = (this.buffer * 3) / 4;
    rect.width = bmp.width - this.gutter * 2;
    rect.height = 1;
    bmp.fillRect(rect, red);

    rect.y = rect.y + tlm.descent;
    bmp.fillRect(rect, red);

    rect.width = 1;

    rect.x = bmp.width - this.buffer / 4;
    rect.y = this.buffer + this.gutter + tlm.height;
    rect.height = tlm.leading;
    bmp.fillRect(rect, green);

    rect.x = (this.buffer * 3) / 4;
    rect.width = bmp.width - this.gutter * 2;
    rect.height = 1;
    bmp.fillRect(rect, red);

    rect.y = rect.y + tlm.leading;
    bmp.fillRect(rect, red);

    rect.width = 1;

    rect.x = this.buffer + this.gutter + tlm.x + text.textWidth;
    rect.y = bmp.height - this.gutter - this.buffer * 2;
    rect.width = text.width - (this.gutter * 2 + tlm.x + text.textWidth);
    bmp.fillRect(rect, green);

    rect.y = this.buffer * 2;
    rect.height = bmp.height - this.buffer * 4;
    rect.width = 1;
    bmp.fillRect(rect, red);

    rect.x = rect.x + (text.width - (this.gutter * 2 + tlm.x + text.textWidth));
    bmp.fillRect(rect, red);

    rect.height = 1;
  }
}

export default Main;
