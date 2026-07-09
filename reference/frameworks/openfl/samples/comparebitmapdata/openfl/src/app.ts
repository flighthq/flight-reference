import Stage from 'openfl/display/Stage';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';
import Main from './Main';

const manifest = new AssetManifest();

for (const size of [32, 64]) {
  for (const name of [
    '0.png',
    'checkers.png',
    'checkers_alpha.png',
    'disposed.png',
    'error.png',
    'minus1.png',
    'minus2.png',
    'minus3.png',
    'minus4.png',
    'noise1.png',
    'noise2.png',
    'null.png',
    'rectangle.png',
    'rectangle2.png',
    'red_ball.png',
    'red_ball_alpha.png',
    'red_ball_half_alpha.png',
    'yellow_ball.png',
  ]) {
    manifest.addBitmapData(`assets/${size}/${name}`);
  }
}

AssetLibrary.loadFromManifest(manifest)
  .onComplete((library) => {
    Assets.registerLibrary('default', library);

    const stage = new Stage(800, 600, 0x808080, Main);
    stage.element.style.width = '800px';
    stage.element.style.height = '600px';
    document.body.appendChild(stage.element);
  })
  .onError((error) => {
    console.error(error);
  });
