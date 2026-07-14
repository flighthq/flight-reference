import { LoaderEvent, AssetLibrary, URLRequest, RequestAnimationFrame, CoordinateSystem } from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { Graphics, TextureAtlas, GradientFillStyle } from '@awayjs/graphics';
import { MethodMaterial } from '@awayjs/materials';
import { Font, TextField, TextFormat, TextFieldType, Scene, DisplayObjectContainer } from '@awayjs/scene';
import { FontParser } from '@awayjs/parsers/dist/lib/FontParser';

const colorMaterials: Record<string, MethodMaterial> = {};
const textureMaterials: Record<string, MethodMaterial> = {};

class BasicText {
  private _scene: Scene;
  private _timer: RequestAnimationFrame;

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

    this._scene = new Scene(new DisplayObjectContainer());
    (this._scene as any).renderer.renderableSorter = null;

    this._scene.view.projection.scale = 1;
    this._scene.view.projection.coordinateSystem = CoordinateSystem.RIGHT_HANDED;
    this._scene.view.backgroundColor = 0xcccccc;

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

  private onResourceComplete(event: LoaderEvent): void {
    const assets: Array<IAsset> = event.assets;
    const length: number = assets.length;

    for (let c = 0; c < length; c++) {
      const asset: IAsset = assets[c];

      console.log(asset.name, event.url);

      if (asset.isAsset(Font)) {
        console.log('loaded a font');
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
        textfield.text = '12345\n67890';
        textfield.selectable = true;
        textfield.type = TextFieldType.INPUT;

        for (let i = 0; i < 30; i++) {
          const tf = textfield.clone();
          tf.x = (Math.random() - 0.5) * 1000 * (window.innerWidth / window.innerHeight);
          tf.y = (Math.random() - 0.5) * 1000;
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

new BasicText();
