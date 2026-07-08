import Sprite from 'openfl/display/Sprite';
import ExternalInterface from 'openfl/external/ExternalInterface';
import TextField from 'openfl/text/TextField';
import TextFieldAutoSize from 'openfl/text/TextFieldAutoSize';
import TextFormat from 'openfl/text/TextFormat';

class Main extends Sprite {
  public constructor() {
    super();

    const label = new TextField();
    label.defaultTextFormat = new TextFormat('_sans', 18);
    label.autoSize = TextFieldAutoSize.LEFT;
    label.selectable = false;
    label.x = 4;
    label.y = 4;
    this.addChild(label);

    if (ExternalInterface.available) {
      ExternalInterface.addCallback('helloFromBrowser', (message: string) => {
        label.text = message;
      });

      (globalThis as Record<string, unknown>).helloFromOpenFL = (message: string) => {
        const hostElement = document.body.lastElementChild as Record<string, unknown> | null;
        const callback = hostElement?.helloFromBrowser;
        if (typeof callback === 'function') {
          callback(message);
        }
        return message;
      };

      ExternalInterface.call('helloFromOpenFL', 'Hello from OpenFL');
    } else {
      label.text = 'ExternalInterface not supported';
    }
  }
}

export default Main;
