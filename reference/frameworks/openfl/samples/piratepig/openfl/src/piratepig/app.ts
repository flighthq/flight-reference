import Sprite from 'openfl/display/Sprite';
import Stage from 'openfl/display/Stage';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';
import PiratePig from './PiratePig';

class Main extends Sprite {
  public constructor() {
    super();

    var manifest = new AssetManifest();

    for (var image of [
      'background_tile.png',
      'center_bottom.png',
      'cursor_highlight.png',
      'cursor.png',
      'game_bear.png',
      'game_bunny_02.png',
      'game_carrot.png',
      'game_lemon.png',
      'game_panda.png',
      'game_piratePig.png',
      'logo.png',
    ]) {
      manifest.addBitmapData('images/' + image);
    }

    for (var sound of ['3', '4', '5', 'theme']) {
      var id = 'sound' + sound.charAt(0).toUpperCase() + sound.substr(1);
      manifest.addSound(['sounds/' + sound + '.ogg', 'sounds/' + sound + '.mp3', 'sounds/' + sound + '.wav'], id);
    }

    manifest.addFont('fonts/FreebooterUpdated.ttf', 'Freebooter');

    AssetLibrary.loadFromManifest(manifest)
      .onComplete((library) => {
        Assets.registerLibrary('default', library);
        Assets.loadFont('Freebooter')
          .onComplete(async () => {
            if ('FontFace' in window && 'fonts' in document) {
              const fontFace = new FontFace('Freebooter', 'url(fonts/FreebooterUpdated.ttf)');
              await fontFace.load();
              document.fonts.add(fontFace);
              await Promise.allSettled([document.fonts.load('60px "Freebooter"'), document.fonts.ready]);
            }

            this.addChild(new PiratePig());
          })
          .onError((e) => {
            console.error(e);
          });
      })
      .onError((e) => {
        console.error(e);
      });
  }
}

var stage = new Stage();
document.body.appendChild(stage.element);
stage.addChild(new Main());
