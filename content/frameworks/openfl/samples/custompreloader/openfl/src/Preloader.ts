import Sprite from 'openfl/display/Sprite';
import Event from 'openfl/events/Event';
import ProgressEvent from 'openfl/events/ProgressEvent';

class Preloader extends Sprite {
  public update(percent: number): void {
    this.graphics.clear();
    this.graphics.beginFill(0x1f9db2);
    this.graphics.drawRect(0, 0, this.stage.stageWidth * percent, this.stage.stageHeight);
  }

  public this_onComplete(_event: Event, callback: () => void): void {
    this.update(1);
    window.setTimeout(callback, 2000);
  }

  public this_onProgress(event: ProgressEvent): void {
    if (event.bytesTotal <= 0) {
      this.update(0);
    } else {
      this.update(event.bytesLoaded / event.bytesTotal);
    }
  }
}

export default Preloader;
