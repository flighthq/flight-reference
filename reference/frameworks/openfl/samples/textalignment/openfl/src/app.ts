import Stage from 'openfl/display/Stage';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';
import Main from './Main';

var manifest = new AssetManifest();
manifest.addFont('Liberation Serif Regular', 'assets/LiberationSerif-Regular.ttf');
manifest.addFont('Nokia Cellphone FC Small', 'assets/nokiafc22.ttf');

for (var renderer of ['flash', 'legacy', 'html5']) {
  for (var i = 0; i <= 5; i++) {
    manifest.addBitmapData('assets/img/' + renderer + i + '.png');
  }
}

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    var stage = new Stage(800, 600, 0xa0a0a0, Main);
    document.body.appendChild(stage.element);
  })
  .onError((e) => {
    console.error(e);
  });
