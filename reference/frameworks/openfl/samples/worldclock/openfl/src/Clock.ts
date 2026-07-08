import Shape from 'openfl/display/Shape';
import Sprite from 'openfl/display/Sprite';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';

class Clock extends Sprite {
  private readonly radius = 50;
  private readonly label: TextField;
  private readonly hands: Shape;

  public constructor(location: string, color: number) {
    super();

    this.graphics.lineStyle(this.radius / 5, color);
    this.graphics.beginFill(color, 0.25);
    this.graphics.drawCircle(this.radius, this.radius, this.radius);
    this.graphics.endFill();

    this.label = new TextField();
    this.label.autoSize = TextFieldAutoSize.LEFT;
    this.label.defaultTextFormat = new TextFormat('_sans', 18, 0x000000);
    this.label.text = location;
    this.addChild(this.label);

    const rect = this.getBounds(this);
    this.label.x = rect.x + (rect.width - this.label.width) / 2;
    this.label.y = rect.bottom + 4;

    this.hands = new Shape();
    this.addChild(this.hands);
  }

  public updateTime(time: Date): void {
    const shortHandLength = this.radius / 2;
    const longHandsLength = (3 * this.radius) / 4;

    this.hands.graphics.clear();

    let hours12 = time.getHours();
    if (hours12 >= 12) {
      hours12 -= 12;
    }

    const hoursRadians = ((360 * (hours12 / 12) - 90) * Math.PI) / 180;
    this.hands.graphics.lineStyle(5, 0x000000);
    this.hands.graphics.moveTo(this.radius, this.radius);
    this.hands.graphics.lineTo(
      this.radius + Math.cos(hoursRadians) * shortHandLength,
      this.radius + Math.sin(hoursRadians) * shortHandLength,
    );

    const minutesRadians = ((360 * (time.getMinutes() / 60) - 90) * Math.PI) / 180;
    this.hands.graphics.lineStyle(4, 0x000000);
    this.hands.graphics.moveTo(this.radius, this.radius);
    this.hands.graphics.lineTo(
      this.radius + Math.cos(minutesRadians) * longHandsLength,
      this.radius + Math.sin(minutesRadians) * longHandsLength,
    );

    const secondsRadians = ((360 * (time.getSeconds() / 60) - 90) * Math.PI) / 180;
    this.hands.graphics.lineStyle(2, 0xff0000);
    this.hands.graphics.moveTo(this.radius, this.radius);
    this.hands.graphics.lineTo(
      this.radius + Math.cos(secondsRadians) * longHandsLength,
      this.radius + Math.sin(secondsRadians) * longHandsLength,
    );
    this.hands.graphics.lineStyle();
    this.hands.graphics.beginFill(0xff0000);
    this.hands.graphics.drawCircle(this.radius, this.radius, 4);
  }
}

export default Clock;
