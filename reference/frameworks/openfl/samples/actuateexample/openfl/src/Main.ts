import Actuate from 'motion/Actuate';
import Quad from 'motion/easing/Quad';
import Sprite from 'openfl/display/Sprite';
import Event from 'openfl/events/Event';

class Main extends Sprite {
  public constructor() {
    super();

    this.initialize();
    this.construct();
  }

  private animateCircle(circle: Sprite): void {
    const duration = 1.5 + Math.random() * 4.5;
    const targetX = Math.random() * this.stage.stageWidth;
    const targetY = Math.random() * this.stage.stageHeight;

    Actuate.tween(circle, duration, { x: targetX, y: targetY })
      .ease(Quad.easeOut)
      .onComplete(this.animateCircle, [circle]);
  }

  private construct(): void {
    for (let i = 0; i < 80; i++) {
      const creationDelay = Math.random() * 10;
      Actuate.timer(creationDelay).onComplete(this.createCircle);
    }
  }

  private createCircle = (): void => {
    const size = 5 + Math.random() * 35 + 20;
    const circle = new Sprite();

    circle.graphics.beginFill(Math.floor(Math.random() * 0xffffff));
    circle.graphics.drawCircle(0, 0, size);
    circle.alpha = 0.2 + Math.random() * 0.6;
    circle.x = Math.random() * this.stage.stageWidth;
    circle.y = Math.random() * this.stage.stageHeight;

    this.addChildAt(circle, 0);
    this.animateCircle(circle);
  };

  private initialize(): void {
    this.stage.addEventListener(Event.ACTIVATE, this.stage_onActivate);
    this.stage.addEventListener(Event.DEACTIVATE, this.stage_onDeactivate);
  }

  private stage_onActivate = (_event: Event): void => {
    Actuate.resumeAll();
  };

  private stage_onDeactivate = (_event: Event): void => {
    Actuate.pauseAll();
  };
}

export default Main;
