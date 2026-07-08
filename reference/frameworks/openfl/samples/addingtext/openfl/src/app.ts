import Sprite from 'openfl/display/Sprite';
import Stage from 'openfl/display/Stage';
import TextField from 'openfl/text/TextField';
import TextFormat from 'openfl/text/TextFormat';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';

class App extends Sprite {
  public constructor() {
    super();

    var format = new TextFormat('Katamotz Ikasi', 30, 0x7a0026);
    var textField = new TextField();

    textField.defaultTextFormat = format;
    textField.embedFonts = true;
    textField.selectable = false;

    textField.x = 50;
    textField.y = 50;
    textField.width = 200;

    textField.text = 'Hello World';

    this.addChild(textField);
  }
}

var manifest = new AssetManifest();
manifest.addFont('Katamotz Ikasi', 'assets/KatamotzIkasi.ttf');

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    Assets.loadFont('assets/KatamotzIkasi.ttf')
      .onComplete(() => {
        var stage = new Stage(550, 400, 0xffffff, App);
        document.body.appendChild(stage.element);
      })
      .onError((e) => {
        console.error(e);
      });
  })
  .onError((e) => {
    console.error(e);
  });
