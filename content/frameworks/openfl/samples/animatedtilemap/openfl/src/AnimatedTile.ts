import Tile from 'openfl/display/Tile';
import Lib from 'openfl/Lib';

class AnimatedTile extends Tile {
  private frameDuration = 0;
  private frames: number[];
  private loopDuration = 0;
  private startTime = 0;

  public constructor(frames: number[], frameRate: number = 7.5) {
    super();

    this.frames = frames;

    if (frames !== null && frames.length > 0) {
      this.id = frames[0]!;
      this.startTime = Lib.getTimer();
      this.loopDuration = Math.floor((frames.length / frameRate) * 1000);
      this.frameDuration = Math.round(this.loopDuration / frames.length);
    }
  }

  public update(): void {
    if (this.frames !== null && this.frames.length > 0) {
      const currentTime = Lib.getTimer();
      const timeElapsed = currentTime - this.startTime;
      const totalDuration = timeElapsed % this.loopDuration;
      const frameCount = Math.round(totalDuration / this.frameDuration);
      const frameIndex = frameCount % this.frames.length;

      this.id = this.frames[frameIndex]!;
    }
  }
}

export default AnimatedTile;
