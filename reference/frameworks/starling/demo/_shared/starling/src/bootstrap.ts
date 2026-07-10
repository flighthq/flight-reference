import Bitmap from 'openfl/display/Bitmap';
import BitmapData from 'openfl/display/BitmapData';
import Sprite from 'openfl/display/Sprite';
import OpenFLStage from 'openfl/display/Stage';
import Context3DRenderMode from 'openfl/display3D/Context3DRenderMode';
import OpenFLEvent from 'openfl/events/Event';
import Capabilities from 'openfl/system/Capabilities';
import StageScaleMode from 'openfl/display/StageScaleMode';
import AssetLibrary from 'openfl/utils/AssetLibrary';
import AssetManifest from 'openfl/utils/AssetManifest';
import Assets from 'openfl/utils/Assets';
import ByteArray from 'openfl/utils/ByteArray';
import Rectangle from 'openfl/geom/Rectangle';

import Starling from 'starling/core/Starling';
import Event from 'starling/events/Event';
import BitmapFont from 'starling/text/BitmapFont';
import TextField from 'starling/text/TextField';
import Texture from 'starling/textures/Texture';
import TextureAtlas from 'starling/textures/TextureAtlas';
import AssetManager from 'starling/utils/AssetManager';
import Max from 'starling/utils/Max';
import RectangleUtil from 'starling/utils/RectangleUtil';

import ProgressBar from './utils/progressBar';
import Constants from './constants';

import Game from './game';

export function launchMenu(): void {
  launchScene(null!);
}

export function launchScene(SceneClass: new () => any): void {
  class SceneLauncher extends Sprite {
    private _starling: Starling;
    private _background: Bitmap;
    private _progressBar: ProgressBar;

    public constructor() {
      super();
      if (this.stage != null) this.start();
      else this.addEventListener(Event.ADDED_TO_STAGE, this.onAddedToStage);
    }

    private onAddedToStage = (event: OpenFLEvent): void => {
      this.removeEventListener(Event.ADDED_TO_STAGE, this.onAddedToStage);
      this.stage.scaleMode = StageScaleMode.NO_SCALE;
      this.start();
    };

    private start(): void {
      Starling.multitouchEnabled = true;

      this._starling = new Starling(Game, this.stage, null, null, Context3DRenderMode.AUTO, 'auto');
      this._starling.stage.stageWidth = Constants.GameWidth;
      this._starling.stage.stageHeight = Constants.GameHeight;
      this._starling.enableErrorChecking = Capabilities.isDebugger;
      this._starling.skipUnchangedFrames = true;
      this._starling.supportBrowserZoom = true;
      this._starling.supportHighResolutions = true;
      this._starling.simulateMultitouch = true;
      this._starling.addEventListener(Event.ROOT_CREATED, () => {
        this.loadAssets(this.startGame);
      });

      this.stage.addEventListener(Event.RESIZE, this.onResize, false, Max.INT_MAX_VALUE, true);

      this._starling.start();
      this.initElements();
    }

    private loadAssets(onComplete: (assets: AssetManager) => void): void {
      var assets: AssetManager = new AssetManager();

      assets.verbose = Capabilities.isDebugger;

      var manifest = new AssetManifest();
      manifest.addBitmapData('starling/assets/textures/1x/atlas.png');
      manifest.addText('starling/assets/textures/1x/atlas.xml');
      manifest.addBitmapData('starling/assets/fonts/1x/desyrel.png');
      manifest.addText('starling/assets/fonts/1x/desyrel.fnt');
      manifest.addBitmapData('starling/assets/textures/1x/background.jpg');
      manifest.addSound(['starling/assets/audio/wing_flap.ogg', 'starling/assets/audio/wing_flap.mp3']);
      manifest.addBytes('starling/assets/textures/1x/compressed_texture.atf');
      manifest.addFont('DejaVu Sans');
      manifest.addFont('Ubuntu');

      AssetLibrary.loadFromManifest(manifest)
        .onComplete(function (library) {
          Assets.registerLibrary('default', library);

          var atlasTexture: Texture = Texture.fromBitmapData(
            Assets.getBitmapData('starling/assets/textures/1x/atlas.png'),
            false,
          );
          var atlasXml: string = Assets.getText('starling/assets/textures/1x/atlas.xml');
          var desyrelTexture: Texture = Texture.fromBitmapData(
            Assets.getBitmapData('starling/assets/fonts/1x/desyrel.png'),
            false,
          );
          var desyrelXml: string = Assets.getText('starling/assets/fonts/1x/desyrel.fnt');
          var bitmapFont = new BitmapFont(desyrelTexture, desyrelXml);
          TextField.registerCompositor(bitmapFont, bitmapFont.name);
          assets.addTexture('atlas', atlasTexture);
          assets.addTextureAtlas('atlas', new TextureAtlas(atlasTexture, atlasXml));
          assets.addTexture(
            'background',
            Texture.fromBitmapData(Assets.getBitmapData('starling/assets/textures/1x/background.jpg'), false),
          );
          assets.addSound('wing_flap', Assets.getSound('starling/assets/audio/wing_flap.ogg'));
          var compressedTexture: ByteArray = Assets.getBytes('starling/assets/textures/1x/compressed_texture.atf');
          assets.addByteArray('compressed_texture', compressedTexture);

          onComplete(assets);
        })
        .onProgress((bytesLoaded, bytesTotal) => {
          if (this._progressBar != null && bytesTotal > 0) {
            this._progressBar.ratio = bytesLoaded / bytesTotal;
          }
        })
        .onError((e) => {
          console.error(e);
        });
    }

    private startGame = (assets: AssetManager): void => {
      var game: Game = this._starling.root as Game;
      if (SceneClass != null) {
        game.startScene(assets, SceneClass);
      } else {
        game.start(assets);
      }
      setTimeout(this.removeElements, 150);
    };

    private initElements(): void {
      BitmapData.loadFromFile('starling/assets/textures/1x/background.jpg').onComplete((bitmapData) => {
        this._background = new Bitmap(bitmapData);
        this._background.smoothing = true;
        this.addChild(this._background);

        this._progressBar = new ProgressBar(175, 20);
        this._progressBar.x = (this._background.width - this._progressBar.width) / 2;
        this._progressBar.y = this._background.height * 0.7;
        this.addChild(this._progressBar);
      });
    }

    private removeElements = (): void => {
      if (this._background != null) {
        this.removeChild(this._background);
        this._background = null;
      }

      if (this._progressBar != null) {
        this.removeChild(this._progressBar);
        this._progressBar = null;
      }
    };

    private onResize = (e: OpenFLEvent): void => {
      var viewPort: Rectangle = RectangleUtil.fit(
        new Rectangle(0, 0, Constants.GameWidth, Constants.GameHeight),
        new Rectangle(0, 0, this.stage.stageWidth, this.stage.stageHeight),
      );
      try {
        this._starling.viewPort = viewPort;
      } catch (error) {}
    };
  }

  var stage = new OpenFLStage(320, 480, 0xffffff, SceneLauncher);
  var content = document.getElementById('openfl-content');
  if (!content) {
    content = document.createElement('div');
    content.id = 'openfl-content';
    document.body.appendChild(content);
  }
  content.appendChild(stage.element);
}
