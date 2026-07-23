import Stage from 'openfl/display/Stage';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';
import Main from './Main';

const manifest = new AssetManifest();
manifest.addBitmapData('openfl/assets/tileset.png');

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    const stage = new Stage(800, 400, 0xffffff, Main);
    stage.element.style.width = '800px';
    stage.element.style.height = '400px';
    document.getElementById('app')?.remove();
    document.body.appendChild(stage.element);
  })
  .onError((error) => {
    console.error(error);
  });
