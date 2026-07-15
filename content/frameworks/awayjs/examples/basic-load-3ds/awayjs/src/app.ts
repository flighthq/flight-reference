import {
  AssetEvent,
  LoaderEvent,
  Vector3D,
  AssetLibrary,
  LoaderContext,
  URLRequest,
  RequestAnimationFrame,
} from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { BitmapImage2D, ImageSampler } from '@awayjs/stage';
import { ElementsType } from '@awayjs/graphics';
import { HoverController, Sprite, LoaderContainer, PrimitivePlanePrefab, Scene } from '@awayjs/scene';
import {
  MethodMaterial,
  ShadowSoftMethod,
  ImageTexture2D,
  DirectionalLight,
  StaticLightPicker,
} from '@awayjs/materials';
import { Max3DSParser } from '@awayjs/parsers';

class Basic_Load3DS {
  private _scene: Scene;
  private _cameraController: HoverController;

  private _groundMaterial: MethodMaterial;

  private _light: DirectionalLight;
  private _lightPicker: StaticLightPicker;
  private _direction: Vector3D;

  private _loader: LoaderContainer;
  private _plane: PrimitivePlanePrefab;
  private _ground: Sprite;

  private _timer: RequestAnimationFrame;
  private _time: number = 0;
  private _move: boolean = false;
  private _lastPanAngle: number;
  private _lastTiltAngle: number;
  private _lastMouseX: number;
  private _lastMouseY: number;

  constructor() {
    this.init();
  }

  private init(): void {
    this.initEngine();
    this.initLights();
    this.initMaterials();
    this.initObjects();
    this.initListeners();
  }

  private initEngine(): void {
    this._scene = new Scene();
    this._scene.camera.projection.far = 2100;
    this._cameraController = new HoverController(this._scene.camera, null, 45, 20, 1000, 10);
  }

  private initLights(): void {
    this._light = new DirectionalLight(new Vector3D(-1, -1, 1));
    this._light.shadowMapper.epsilon = 0.2;
    this._direction = new Vector3D(-1, -1, 1);
    this._lightPicker = new StaticLightPicker([this._light]);
  }

  private initMaterials(): void {
    this._groundMaterial = new MethodMaterial();
    this._groundMaterial.ambientMethod.texture = new ImageTexture2D();
    this._groundMaterial.shadowMethod = new ShadowSoftMethod(this._light, 10, 5);
    this._groundMaterial.style.sampler = new ImageSampler(true, true, true);
    this._groundMaterial.style.addSamplerAt(new ImageSampler(true, true), this._light.shadowMapper.textureMap);
    this._groundMaterial.lightPicker = this._lightPicker;
    this._groundMaterial.specularMethod.strength = 0;
  }

  private initObjects(): void {
    this._loader = new LoaderContainer();
    this._loader.transform.scaleTo(300, 300, 300);
    this._loader.z = -200;
    this._scene.root.addChild(this._loader);

    this._plane = new PrimitivePlanePrefab(this._groundMaterial, ElementsType.TRIANGLE, 1000, 1000);
    this._ground = this._plane.getNewObject() as Sprite;
    this._ground.castsShadows = false;
    this._scene.root.addChild(this._ground);
  }

  private initListeners(): void {
    window.onresize = () => this.onResize();

    document.onmousedown = (event: MouseEvent) => this.onMouseDown(event);
    document.onmouseup = () => this.onMouseUp();
    document.onmousemove = (event: MouseEvent) => this.onMouseMove(event);

    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();

    const loaderContext = new LoaderContext();
    loaderContext.mapUrl('texture.jpg', 'awayjs/assets/soldier_ant.jpg');

    this._loader.addEventListener(AssetEvent.ASSET_COMPLETE, (event: AssetEvent) => this.onAssetComplete(event));
    this._loader.load(new URLRequest('awayjs/assets/soldier_ant.3ds'), loaderContext, null, new Max3DSParser(false));

    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));
    AssetLibrary.load(new URLRequest('awayjs/assets/CoarseRedSand.jpg'));
  }

  private onEnterFrame(dt: number): void {
    this._time += dt;

    this._direction.x = -Math.sin(this._time / 4000);
    this._direction.z = -Math.cos(this._time / 4000);
    this._light.direction = this._direction;

    this._scene.render();
  }

  private onAssetComplete(event: AssetEvent) {
    const asset: IAsset = event.asset;

    switch (asset.assetType) {
      case Sprite.assetType: {
        const sprite = event.asset as Sprite;
        sprite.castsShadows = true;
        break;
      }
      case MethodMaterial.assetType: {
        const material = event.asset as MethodMaterial;
        material.shadowMethod = new ShadowSoftMethod(this._light, 10, 5);
        material.lightPicker = this._lightPicker;
        material.specularMethod.gloss = 30;
        material.specularMethod.strength = 1;
        material.style.color = 0x303040;
        material.diffuseMethod.multiply = false;
        material.ambientMethod.strength = 1;
        break;
      }
    }
  }

  private onResourceComplete(event: LoaderEvent) {
    const assets: Array<IAsset> = event.assets;
    const length: number = assets.length;

    for (let c: number = 0; c < length; c++) {
      const asset: IAsset = assets[c];

      console.log(asset.name, event.url);

      switch (event.url) {
        case 'awayjs/assets/CoarseRedSand.jpg': {
          this._groundMaterial.style.image = asset as BitmapImage2D;
          break;
        }
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    this._lastPanAngle = this._cameraController.panAngle;
    this._lastTiltAngle = this._cameraController.tiltAngle;
    this._lastMouseX = event.clientX;
    this._lastMouseY = event.clientY;
    this._move = true;
  }

  private onMouseUp(): void {
    this._move = false;
  }

  private onMouseMove(event: MouseEvent) {
    if (this._move) {
      this._cameraController.panAngle = 0.3 * (event.clientX - this._lastMouseX) + this._lastPanAngle;
      this._cameraController.tiltAngle = 0.3 * (event.clientY - this._lastMouseY) + this._lastTiltAngle;
    }
  }

  private onResize(): void {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }
}

new Basic_Load3DS();
