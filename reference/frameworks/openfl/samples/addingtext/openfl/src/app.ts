import Sprite from 'openfl/display/Sprite';
import Stage from 'openfl/display/Stage';
import TextField from 'openfl/text/TextField';
import TextFormat from 'openfl/text/TextFormat';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';

const declaredFontName = 'Katamotz Ikasi';
let loadedFontName = declaredFontName;

class App extends Sprite {
  public constructor() {
    super();

    var format = new TextFormat(loadedFontName, 30, 0x7a0026);
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
manifest.addFont('assets/KatamotzIkasi.ttf', declaredFontName);

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    const font = Assets.getFont(declaredFontName) ?? Assets.getFont('assets/KatamotzIkasi.ttf');
    if (font?.fontName) loadedFontName = font.fontName;

    Assets.loadFont(declaredFontName)
      .onComplete(async () => {
        if ('FontFace' in window && 'fonts' in document) {
          const fontFace = new FontFace(declaredFontName, 'url(assets/KatamotzIkasi.ttf)');
          await fontFace.load();
          document.fonts.add(fontFace);
          loadedFontName = declaredFontName;
          await Promise.allSettled([document.fonts.load(`30px "${loadedFontName}"`), document.fonts.ready]);
        }

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
