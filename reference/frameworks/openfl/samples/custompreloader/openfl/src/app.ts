import Bitmap from 'openfl/display/Bitmap';
import Loader from 'openfl/display/Loader';
import Stage from 'openfl/display/Stage';
import Event from 'openfl/events/Event';
import ProgressEvent from 'openfl/events/ProgressEvent';
import URLRequest from 'openfl/net/URLRequest';
import Main from './Main';
import Preloader from './Preloader';

var stage = new Stage(550, 400, 0xffffff);
document.body.appendChild(stage.element);

var preloader = new Preloader();
stage.addChild(preloader);

var loader = new Loader();
loader.contentLoaderInfo.addEventListener(ProgressEvent.PROGRESS, (event: ProgressEvent) => {
  preloader.this_onProgress(event);
});
loader.contentLoaderInfo.addEventListener(Event.COMPLETE, (event: Event) => {
  preloader.this_onComplete(event, () => {
    if (stage.contains(preloader)) {
      stage.removeChild(preloader);
    }

    stage.addChild(new Main(loader.content as Bitmap, stage.stageWidth, stage.stageHeight));
  });
});
loader.load(new URLRequest('assets/openfl.png'));
