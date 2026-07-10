import Bitmap from 'openfl/display/Bitmap';
import Sprite from 'openfl/display/Sprite';
import KeyboardEvent from 'openfl/events/KeyboardEvent';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';
import Assets from 'openfl/utils/Assets';

class Main extends Sprite {
  private static MAX_DEMO = 5;

  private alphaStep = 0.25;
  private comparison: Bitmap | null = null;
  private demo = 0;
  private label: TextField | null = null;

  public constructor() {
    super();

    this.stage.addEventListener(KeyboardEvent.KEY_DOWN, this.stage_onKeyDown);

    this.showDemo(this.demo);
  }

  private clear(): void {
    while (this.numChildren > 0) {
      this.removeChildAt(0);
    }
  }

  private getID(): string {
    return 'HTML5';
  }

  private identify(): void {
    var text = new TextField();
    text.text = this.getID();
    this.addChild(text);
    this.label = text;
  }

  private compare(str: string): void {
    if (this.label == null) {
      return;
    }

    this.label.text = this.getID() + ' vs ' + str;

    if (this.comparison == null) {
      this.comparison = new Bitmap();
    }

    var path = 'assets/img/' + str + this.demo + '.png';
    if (Assets.exists(path)) {
      this.comparison.bitmapData = Assets.getBitmapData(path);
      if (!this.contains(this.comparison)) {
        this.addChildAt(this.comparison, 0);
      }
    }
  }

  private changeAlpha(i: number): void {
    if (this.comparison == null) {
      return;
    }

    var alpha = this.comparison.alpha + this.alphaStep * i;
    if (alpha > 1.0) {
      alpha = 0.0;
    } else if (alpha < 0.0) {
      alpha = 1.0;
    }
    this.comparison.alpha = alpha;
  }

  private showDemo(i: number): void {
    this.clear();
    this.identify();

    switch (i) {
      case 0:
        this.demo0();
        break;
      case 1:
        this.demo1();
        break;
      case 2:
        this.demo2();
        break;
      case 3:
        this.demo3();
        break;
      case 4:
        this.demo4();
        break;
      case 5:
        this.demo5();
        break;
    }

    var text = new TextField();
    text.width = 800;
    text.y = 20;
    text.text =
      'Showing demo (' +
      i +
      '). Left/Right: Change demo; 1/2: Compare to Flash/Legacy; Up/Down: Change comparison alphas';
    this.addChild(text);
  }

  private demo0(): void {
    this.makeText(50, 50, TextFormatAlign.CENTER, 24);
    this.makeText(50, 175, TextFormatAlign.LEFT, 24);
    this.makeText(50, 300, TextFormatAlign.RIGHT, 24);
    this.makeText(50, 425, TextFormatAlign.JUSTIFY, 24);
  }

  private demo1(): void {
    var font = 'Liberation Serif Regular';
    this.makeText(50, 50, TextFormatAlign.CENTER, 24, font, true);
    this.makeText(50, 175, TextFormatAlign.LEFT, 24, font, true);
    this.makeText(50, 300, TextFormatAlign.RIGHT, 24, font, true);
    this.makeText(50, 425, TextFormatAlign.JUSTIFY, 24, font, true);
  }

  private demo2(): void {
    this.makeText(50, 50, TextFormatAlign.CENTER, 12);
    this.makeText(50, 175, TextFormatAlign.LEFT, 12);
    this.makeText(50, 300, TextFormatAlign.RIGHT, 12);
    this.makeText(50, 425, TextFormatAlign.JUSTIFY, 12);
  }

  private demo3(): void {
    var font = 'Liberation Serif Regular';
    this.makeText(50, 50, TextFormatAlign.CENTER, 12, font, true);
    this.makeText(50, 175, TextFormatAlign.LEFT, 12, font, true);
    this.makeText(50, 300, TextFormatAlign.RIGHT, 12, font, true);
    this.makeText(50, 425, TextFormatAlign.JUSTIFY, 12, font, true);
  }

  private demo4(): void {
    var font = 'Nokia Cellphone FC Small';
    this.makeText(50, 50, TextFormatAlign.CENTER, 8, font, true);
    this.makeText(50, 175, TextFormatAlign.LEFT, 8, font, true);
    this.makeText(50, 300, TextFormatAlign.RIGHT, 8, font, true);
    this.makeText(50, 425, TextFormatAlign.JUSTIFY, 8, font, true);
  }

  private demo5(): void {
    var font = 'Nokia Cellphone FC Small';
    this.makeText(50, 50, TextFormatAlign.CENTER, 16, font, true);
    this.makeText(50, 175, TextFormatAlign.LEFT, 16, font, true);
    this.makeText(50, 300, TextFormatAlign.RIGHT, 16, font, true);
    this.makeText(50, 425, TextFormatAlign.JUSTIFY, 16, font, true);
  }

  private makeText(x: number, y: number, align: string, size: number, font?: string, embed: boolean = false): void {
    var textField = new TextField();
    textField.embedFonts = embed;
    textField.defaultTextFormat = new TextFormat(
      font,
      size,
      0x000000,
      null,
      null,
      null,
      null,
      null,
      align,
      null,
      null,
      null,
      20,
    );

    textField.selectable = false;
    textField.border = true;
    textField.borderColor = 0x000000;

    textField.width = 700;
    textField.multiline = true;
    textField.wordWrap = true;
    textField.autoSize = TextFieldAutoSize.NONE;
    textField.x = x;
    textField.y = y;
    textField.text =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

    this.addChild(textField);
  }

  private stage_onKeyDown = (event: KeyboardEvent): void => {
    switch (event.keyCode) {
      case 39:
        this.demo++;
        if (this.demo > Main.MAX_DEMO) {
          this.demo = 0;
        }
        this.showDemo(this.demo);
        break;
      case 37:
        this.demo--;
        if (this.demo < 0) {
          this.demo = Main.MAX_DEMO;
        }
        this.showDemo(this.demo);
        break;
      case 49:
        this.compare('flash');
        break;
      case 50:
        this.compare('legacy');
        break;
      case 51:
        this.compare('html5');
        break;
      case 38:
        this.changeAlpha(-1);
        break;
      case 40:
        this.changeAlpha(1);
        break;
    }
  };
}

export default Main;
