import { LoaderEvent, AssetLibrary, URLRequest, RequestAnimationFrame, CoordinateSystem } from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { BitmapImage2D } from '@awayjs/stage';
import { Graphics, TextureAtlas, GradientFillStyle } from '@awayjs/graphics';
import { MethodMaterial } from '@awayjs/materials';
import {
  Font,
  FNTGenerator,
  TextField,
  TextFormat,
  TextFieldType,
  TextFieldAutoSize,
  Scene,
  SceneGraphPartition,
  DisplayObjectContainer,
} from '@awayjs/scene';
import { Parsers, FontParser } from '@awayjs/parsers';

const colorMaterials: Record<string, MethodMaterial> = {};
const textureMaterials: Record<string, MethodMaterial> = {};

class BasicGenerateFNT {
  private _scene: Scene;
  private _timer: RequestAnimationFrame;
  private _fntRenderer: FNTGenerator;

  constructor() {
    Graphics.get_material_for_color = function (color: number, alpha: number = 1): any {
      if (color === 0) color = 0x000001;
      const texObj: any = TextureAtlas.getTextureForColor(color, alpha);
      if (colorMaterials[texObj.bitmap.id]) {
        texObj.material = colorMaterials[texObj.bitmap.id];
        return texObj;
      }
      const mat = new MethodMaterial(texObj.bitmap);
      mat.alphaBlending = true;
      mat.useColorTransform = true;
      mat.bothSides = true;
      colorMaterials[texObj.bitmap.id] = mat;
      texObj.material = mat;
      return texObj;
    };

    Graphics.get_material_for_gradient = function (gradient: GradientFillStyle): any {
      const texObj: any = TextureAtlas.getTextureForGradient(gradient);
      const lookupId: string = texObj.bitmap.id + gradient.type;
      if (textureMaterials[lookupId]) {
        texObj.material = textureMaterials[lookupId];
        return texObj;
      }
      const mat = new MethodMaterial(texObj.bitmap);
      mat.useColorTransform = true;
      mat.alphaBlending = true;
      mat.bothSides = true;
      textureMaterials[lookupId] = mat;
      texObj.material = mat;
      return texObj;
    };

    Parsers.enableAllBundled();
    this._scene = new Scene(new SceneGraphPartition(new DisplayObjectContainer()));
    (this._scene as any).renderer.renderableSorter = null;

    this._scene.view.projection.scale = 1;
    this._scene.view.projection.coordinateSystem = CoordinateSystem.RIGHT_HANDED;
    this._scene.view.backgroundColor = 0xcccccc;

    this._fntRenderer = new FNTGenerator(this._scene.renderer.stage);

    window.onwheel = (event: WheelEvent) => this.onMouseWheel(event);
    window.onresize = () => this.onResize();
    window.addEventListener('keydown', (event: KeyboardEvent) => this.onKeyDown(event));

    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();

    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));
    AssetLibrary.load(new URLRequest('awayjs/assets/georgia.ttf'), null, null, new FontParser(true));
  }

  private onEnterFrame(_dt: number): void {
    this._scene.render();
  }

  private showGeneratedBitmaps(bitmaps: BitmapImage2D[], pixelRatio: number): void {
    for (let b = 0; b < bitmaps.length; b++) {
      const htmlWrapper = document.createElement('div');
      const bitmap = bitmaps[b];
      const htmlImage = document.createElement('canvas');
      htmlImage.width = bitmap.width;
      htmlImage.height = bitmap.height;
      htmlImage.style.transform = 'scaleY(-1)';
      htmlImage.style.width = bitmap.width / pixelRatio + 'px';
      htmlImage.style.height = bitmap.height / pixelRatio + 'px';

      const context = htmlImage.getContext('2d')!;
      const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
      imageData.data.set(bitmap.data);
      context.putImageData(imageData, 0, 0);
      htmlWrapper.appendChild(htmlImage);
      document.body.appendChild(htmlWrapper);

      for (let m = 0; m < bitmap.mipLevels.length; m++) {
        const mipBitmap = bitmap.mipLevels[m];
        const mipCanvas = document.createElement('canvas');
        mipCanvas.width = mipBitmap.width;
        mipCanvas.height = mipBitmap.height;
        mipCanvas.style.transform = 'scaleY(-1)';
        mipCanvas.style.width = mipBitmap.width / pixelRatio + 'px';
        mipCanvas.style.height = mipBitmap.height / pixelRatio + 'px';

        const mipContext = mipCanvas.getContext('2d')!;
        const mipImageData = mipContext.getImageData(0, 0, mipBitmap.width, mipBitmap.height);
        mipImageData.data.set(mipBitmap.data);
        mipContext.putImageData(mipImageData, 0, 0);
        htmlWrapper.appendChild(mipCanvas);
      }
    }
  }

  private onResourceComplete(event: LoaderEvent): void {
    const assets: Array<IAsset> = event.assets;
    const length: number = assets.length;

    for (let c = 0; c < length; c++) {
      const asset: IAsset = assets[c];

      console.log(asset.name, event.url);

      if (asset.isAsset(Font)) {
        this._fntRenderer.generate(asset as Font, 2048, 128, 5);

        const textFormat = new TextFormat();
        textFormat.font = asset as Font;
        textFormat.color = 0xff0000;
        textFormat.size = 40;

        const textfield = new TextField();
        textfield.textFormat = textFormat;
        textfield.background = true;
        textfield.border = true;
        textfield.borderColor = 0xff0000;
        textfield.multiline = true;
        textfield.selectable = true;
        textfield.type = TextFieldType.INPUT;
        textfield.autoSize = TextFieldAutoSize.RIGHT;

        for (let i = 0; i < 300; i++) {
          const tf = textfield.clone();
          const tfclone = textFormat.clone();
          tfclone.size = Math.round(10 + Math.random() * 100);
          tf.textFormat = tfclone;
          tf.x = (Math.random() - 0.5) * 1000 * (window.innerWidth / window.innerHeight);
          tf.y = (Math.random() - 0.5) * 1000;
          tf.text = '12345\n67890';
          this._scene.root.addChild(tf);
        }
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this._scene.mouseManager.focusNextTab();
    }
  }

  private onResize(): void {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }

  private onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.ctrlKey) {
      this._scene.camera.z -= event.deltaY;

      if (this._scene.camera.z > -100) this._scene.camera.z = -100;
      else if (this._scene.camera.z < -2000) this._scene.camera.z = -2000;
    } else {
      this._scene.camera.x += event.deltaX;
      this._scene.camera.y += event.deltaY;
    }
  }
}

new BasicGenerateFNT();
