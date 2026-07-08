import Sprite from 'openfl/display/Sprite';
import TimerEvent from 'openfl/events/TimerEvent';
import Timer from 'openfl/utils/Timer';
import Clock from './Clock';

class Main extends Sprite {
  private readonly newYorkClock: Clock;
  private readonly londonClock: Clock;
  private readonly tokyoClock: Clock;

  public constructor() {
    super();

    this.newYorkClock = new Clock('New York', 0xcc0000);
    this.newYorkClock.x = 10;
    this.newYorkClock.y = 10;
    this.addChild(this.newYorkClock);

    this.londonClock = new Clock('London', 0x009900);
    this.londonClock.x = 130;
    this.londonClock.y = 10;
    this.addChild(this.londonClock);

    this.tokyoClock = new Clock('Tokyo', 0x0000cc);
    this.tokyoClock.x = 250;
    this.tokyoClock.y = 10;
    this.addChild(this.tokyoClock);

    this.updateClocks();

    const timer = new Timer(1000, 0);
    timer.addEventListener(TimerEvent.TIMER, () => {
      this.updateClocks();
    });
    timer.start();
  }

  private updateClocks(): void {
    const currentLocalTime = new Date();
    const newYorkTime = this.dateToTimeZoneOffset(currentLocalTime, -4);
    const londonTime = this.dateToTimeZoneOffset(currentLocalTime, 1);
    const tokyoTime = this.dateToTimeZoneOffset(currentLocalTime, 9);

    this.newYorkClock.updateTime(newYorkTime);
    this.londonClock.updateTime(londonTime);
    this.tokyoClock.updateTime(tokyoTime);
  }

  private dateToTimeZoneOffset(date: Date, targetOffset: number): Date {
    const utcHours = date.getUTCHours();
    const adjustedHours = utcHours + targetOffset;
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      adjustedHours,
      date.getMinutes(),
      date.getSeconds(),
    );
  }
}

export default Main;
