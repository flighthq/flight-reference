import Stage from 'openfl/display/Stage';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';
import Main from './Main';

var manifest = new AssetManifest();
manifest.addFont('assets/LiberationSerif-Regular.ttf', 'Liberation Serif Regular');

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    Assets.loadFont('Liberation Serif Regular')
      .onComplete(async () => {
        if ('FontFace' in window && 'fonts' in document) {
          const fontFace = new FontFace('Liberation Serif Regular', 'url(assets/LiberationSerif-Regular.ttf)');
          await fontFace.load();
          document.fonts.add(fontFace);
          await Promise.allSettled([document.fonts.load('120px "Liberation Serif Regular"'), document.fonts.ready]);
        }

        var stage = new Stage(800, 600, 0xa0a0a0, Main);
        stage.element.style.width = '800px';
        stage.element.style.height = '600px';
        document.getElementById('app')?.remove();
        document.body.appendChild(stage.element);
      })
      .onError((e) => {
        console.error(e);
      });
  })
  .onError((e) => {
    console.error(e);
  });
