import Sprite from 'openfl/display/Sprite';
import Stage from 'openfl/display/Stage';
import AssetLibrary from 'openfl/utils/AssetLibrary';

class App extends Sprite {
  constructor() {
    super();

    AssetLibrary.loadFromFile('assets/library.swf')
      .onComplete((library: AssetLibrary) => {
        const cat = library.getMovieClip('NyanCatAnimation');
        this.addChild(cat);
      })
      .onError((e) => console.error(e));
  }
}

const stage = new Stage(550, 400, 0xffffff, App);
document.body.appendChild(stage.element);
