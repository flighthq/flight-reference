import Sprite from 'openfl/display/Sprite';
import TextField from 'openfl/text/TextField';
import GameInputControl from 'openfl/ui/GameInputControl';
import GameInputDevice from 'openfl/ui/GameInputDevice';
import GamepadControlVisual from './GamepadControlVisual';

interface ControlData {
  type: string;
  id: number;
  label: string;
}

class GamepadVisual extends Sprite {
  public id = '';

  private controls: GamepadControlVisual[] = [];

  public destroy(): void {
    this.controls = [];
    while (this.numChildren > 0) {
      this.removeChildAt(0);
    }
  }

  public update(type: string, id: number, value: number): void {
    for (var control of this.controls) {
      if (control.type === type && control.id === id) {
        control.value = value;
      }
    }
  }

  public makeJoystick(deviceId: string): void {
    this.id = deviceId;

    var arr: ControlData[] = [];
    for (var i = 0; i < 6; i++) {
      arr.push({ type: 'axis', id: i, label: 'axis' + i });
    }

    arr = arr.concat([
      { type: 'hat', id: 0, label: 'hat' },
      { type: 'ball', id: 0, label: 'ball.x' },
      { type: 'ball', id: 1, label: 'ball.y' },
    ]);

    for (var i = 0; i < 15; i++) {
      arr.push({ type: 'button', id: i, label: 'bn' + String(i) });
    }

    this.fromArray(30, 0, 0, 1, arr, 'Joystick #' + deviceId);
  }

  public makeGamepad(device: GameInputDevice): void {
    this.id = device.id;

    var arr: ControlData[] = [];
    for (var i = 0; i < device.numControls; i++) {
      var control: GameInputControl = device.getControlAt(i);
      var temp = control.id.split('_');
      var type = temp[0].toLowerCase();
      var id = parseInt(temp[1], 10);
      var label = type === 'axis' ? 'axis' : type === 'button' ? 'bn' : type;
      arr.push({ type, id, label: label + String(id) });
    }

    this.fromArray(30, 5, 5, 2, arr, 'Device #' + device.id + ' = ' + device.name);
  }

  private fromArray(size: number, offx: number, offy: number, spacex: number, arr: ControlData[], name: string): void {
    var label = new TextField();
    label.text = name;
    this.addChild(label);

    this.controls = [];
    var lastx = offx;
    var lasty = 18;

    for (var thing of arr) {
      var control = new GamepadControlVisual(size, thing.type, thing.id, thing.label);
      control.x = lastx;
      control.y = lasty + offy;
      lastx += control.width + spacex;
      this.addChild(control);
      this.controls.push(control);
    }

    label.width = this.width;
    label.height = 18;
  }
}

export default GamepadVisual;
