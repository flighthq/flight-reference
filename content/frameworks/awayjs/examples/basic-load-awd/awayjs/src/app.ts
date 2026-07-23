import { AssetEvent, Vector3D, AssetLibrary, URLRequest, RequestAnimationFrame } from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { Sprite, Scene } from '@awayjs/scene';
import { MethodMaterial, DirectionalLight, StaticLightPicker } from '@awayjs/materials';
import { AWDParser } from '@awayjs/parsers';

class Basic_LoadAWD {
  private _scene: Scene;
  private _light: DirectionalLight;
  private _lightPicker: StaticLightPicker;
  private _suzanne: Sprite;
  private _timer: RequestAnimationFrame;
  private _time: number = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    this.initEngine();
    this.initLights();
    this.initListeners();
  }

  private initEngine(): void {
    this._scene = new Scene();
    this._scene.view.backgroundColor = 0x1e2125;
    this._scene.camera.z = -2000;
  }

  private initLights(): void {
    this._light = new DirectionalLight();
    this._light.color = 0x683019;
    this._light.direction = new Vector3D(1, 0, 0);
    this._light.ambient = 0.5;
    this._light.ambientColor = 0x30353b;
    this._light.diffuse = 2.8;
    this._light.specular = 1.8;

    this._lightPicker = new StaticLightPicker([this._light]);
  }

  private initListeners(): void {
    window.onresize = () => this.onResize();

    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();

    AssetLibrary.enableParser(AWDParser);

    AssetLibrary.addEventListener(AssetEvent.ASSET_COMPLETE, (event: AssetEvent) => this.onAssetComplete(event));
    AssetLibrary.load(new URLRequest('awayjs/assets/suzanne.awd'));
  }

  private onEnterFrame(dt: number): void {
    this._time += dt;

    if (this._suzanne) this._suzanne.rotationY += 1;

    this._scene.render();
  }

  private onAssetComplete(event: AssetEvent) {
    const asset: IAsset = event.asset;

    switch (asset.assetType) {
      case Sprite.assetType: {
        const sprite = asset as Sprite;
        sprite.y = -300;
        sprite.transform.scaleTo(900, 900, 900);

        this._suzanne = sprite;
        this._scene.root.addChild(sprite);
        break;
      }
      case MethodMaterial.assetType: {
        const material = asset as MethodMaterial;
        material.lightPicker = this._lightPicker;
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

new Basic_LoadAWD();
