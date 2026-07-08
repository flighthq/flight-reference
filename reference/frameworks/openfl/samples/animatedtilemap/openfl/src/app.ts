import Stage from 'openfl/display/Stage';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';
import Main from './Main';

const manifest = new AssetManifest();
manifest.addBitmapData('assets/tileset.png');

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    const stage = new Stage(550, 400, 0xffffff, Main);
    document.body.appendChild(stage.element);
  })
  .onError((error) => {
    console.error(error);
  });
