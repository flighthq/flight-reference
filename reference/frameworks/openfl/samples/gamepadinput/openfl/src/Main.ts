import Sprite from 'openfl/display/Sprite';
import Event from 'openfl/events/Event';
import GameInputEvent from 'openfl/events/GameInputEvent';
import GameInput from 'openfl/ui/GameInput';
import GameInputControl from 'openfl/ui/GameInputControl';
import GameInputDevice from 'openfl/ui/GameInputDevice';
import GamepadVisual from './GamepadVisual';

class Main extends Sprite {
  private gameInput = new GameInput();
  private gamepads: GameInputDevice[] = [];
  private gamepadVisuals: GamepadVisual[] = [];

  public constructor() {
    super();

    this.gameInput = new GameInput();
    this.gameInput.addEventListener(GameInputEvent.DEVICE_ADDED, this.gameInput_onDeviceAdded);
    this.gameInput.addEventListener(GameInputEvent.DEVICE_REMOVED, this.gameInput_onDeviceRemoved);
    this.addEventListener(Event.ENTER_FRAME, this.this_onEnterFrame);
  }

  public addGamepadVisual(id: string): void {
    for (var visual of this.gamepadVisuals) {
      if (visual.id === id) {
        return;
      }
    }

    var visual = new GamepadVisual();
    for (var device of this.gamepads) {
      if (device.id === id) {
        visual.makeGamepad(device);
        this.gamepadVisuals.push(visual);
        break;
      }
    }

    this.addChild(visual);
    this.refresh();
  }

  public removeVisual(id: string, visuals: GamepadVisual[]): void {
    for (var i = 0; i < visuals.length; i++) {
      var visual = visuals[i];
      if (visual.id === id) {
        visuals.splice(i, 1);
        if (this.contains(visual)) {
          this.removeChild(visual);
        }
        visual.destroy();
        break;
      }
    }

    this.refresh();
  }

  public updateGamepadVisual(deviceId: string, type: string, id: number, value: number): void {
    for (var visual of this.gamepadVisuals) {
      if (visual.id === deviceId) {
        visual.update(type, id, value);
      }
    }
  }

  private refresh(): void {
    var lasty = 10;
    var lastx = 10;
    var space = 50;

    for (var i = 0; i < this.gamepadVisuals.length; i++) {
      this.gamepadVisuals[i].x = lastx;
      this.gamepadVisuals[i].y = lasty;
      lasty += space + 10;
    }
  }

  private gameInput_onDeviceAdded = (event: GameInputEvent): void => {
    var device = event.device;
    device.enabled = true;

    this.gamepads.push(device);
    this.addGamepadVisual(device.id);
  };

  private gameInput_onDeviceRemoved = (event: GameInputEvent): void => {
    var device = event.device;
    device.enabled = false;

    this.gamepads = this.gamepads.filter((candidate) => candidate !== device);
    this.removeVisual(device.id, this.gamepadVisuals);
  };

  private this_onEnterFrame = (_event: Event): void => {
    for (var device of this.gamepads) {
      for (var i = 0; i < device.numControls; i++) {
        var control: GameInputControl = device.getControlAt(i);
        var temp = control.id.split('_');
        var type = temp[0].toLowerCase();
        var id = parseInt(temp[1], 10);
        this.updateGamepadVisual(device.id, type, id, control.value);
      }
    }
  };
}

export default Main;
