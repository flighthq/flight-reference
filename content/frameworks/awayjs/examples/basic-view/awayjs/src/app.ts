import { LoaderEvent, Vector3D, AssetLibrary, URLRequest, RequestAnimationFrame } from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { BitmapImage2D } from '@awayjs/stage';
import { BasicMaterial } from '@awayjs/materials';
import { Sprite, PrimitivePlanePrefab, Scene } from '@awayjs/scene';
import { ElementsType, ImageTexture2D } from '@awayjs/renderer';

class Basic_View {
  private _scene: Scene;
  private _planeMaterial: BasicMaterial;
  private _plane: Sprite;
  private _timer: RequestAnimationFrame;

  constructor() {
    this._scene = new Scene();

    this._scene.camera.z = -600;
    this._scene.camera.y = 500;
    this._scene.camera.lookAt(new Vector3D());

    this._planeMaterial = new BasicMaterial();

    this._plane = new PrimitivePlanePrefab(
      this._planeMaterial,
      ElementsType.TRIANGLE,
      700,
      700,
    ).getNewObject() as Sprite;
    this._scene.root.addChild(this._plane);

    window.onresize = () => this.onResize();

    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();

    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));

    AssetLibrary.load(new URLRequest('awayjs/assets/floor_diffuse.jpg'));
  }

  private onEnterFrame(_dt: number): void {
    this._plane.rotationY += 1;
    this._scene.render();
  }

  private onResourceComplete(event: LoaderEvent) {
    const assets: Array<IAsset> = event.assets;
    const length: number = assets.length;

    for (let c: number = 0; c < length; c++) {
      const asset: IAsset = assets[c];

      console.log(asset.name, event.url);

      switch (event.url) {
        case 'awayjs/assets/floor_diffuse.jpg':
          this._planeMaterial.texture = new ImageTexture2D(asset as BitmapImage2D);
          break;
      }
    }
  }

  private onResize(): void {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }
}

new Basic_View();
