import Stage from 'openfl/display/Stage';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';
import Main from './Main';

function loadFont(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Assets.loadFont(id)
      .onComplete(() => resolve())
      .onError((error) => reject(error));
  });
}

var manifest = new AssetManifest();
manifest.addFont('assets/LiberationSerif-Regular.ttf', 'Liberation Serif Regular');
manifest.addFont('assets/nokiafc22.ttf', 'Nokia Cellphone FC Small');

for (var renderer of ['flash', 'legacy', 'html5']) {
  for (var i = 0; i <= 5; i++) {
    manifest.addBitmapData('assets/img/' + renderer + i + '.png');
  }
}

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    Promise.all([loadFont('Liberation Serif Regular'), loadFont('Nokia Cellphone FC Small')])
      .then(async () => {
        if ('FontFace' in window && 'fonts' in document) {
          const liberation = new FontFace('Liberation Serif Regular', 'url(assets/LiberationSerif-Regular.ttf)');
          const nokia = new FontFace('Nokia Cellphone FC Small', 'url(assets/nokiafc22.ttf)');
          await Promise.all([liberation.load(), nokia.load()]);
          document.fonts.add(liberation);
          document.fonts.add(nokia);
          await Promise.allSettled([
            document.fonts.load('24px "Liberation Serif Regular"'),
            document.fonts.load('16px "Nokia Cellphone FC Small"'),
            document.fonts.ready,
          ]);
        }

        var stage = new Stage(800, 600, 0xa0a0a0, Main);
        document.body.appendChild(stage.element);
      })
      .catch((e) => {
        console.error(e);
      });
  })
  .onError((e) => {
    console.error(e);
  });
