import { LoaderEvent, Vector3D, AssetLibrary, URLRequest, RequestAnimationFrame } from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { BitmapImage2D, ImageSampler, ImageUtils } from '@awayjs/stage';
import { ElementsType } from '@awayjs/graphics';
import {
  HoverController,
  Sprite,
  Scene,
  Camera,
  PrimitiveCubePrefab,
  PrimitivePlanePrefab,
  PrimitiveSpherePrefab,
  PrimitiveTorusPrefab,
  DisplayObjectContainer,
} from '@awayjs/scene';
import { MethodMaterial, DirectionalLight, StaticLightPicker, ImageTexture2D } from '@awayjs/materials';
import { View } from '@awayjs/view';

class Basic_Shading {
  private _scene: Scene;
  private _root: DisplayObjectContainer;
  private _view: View;
  private _camera: Camera;
  private _cameraController: HoverController;

  private _planeMaterial: MethodMaterial;
  private _sphereMaterial: MethodMaterial;
  private _cubeMaterial: MethodMaterial;
  private _torusMaterial: MethodMaterial;

  private _light1: DirectionalLight;
  private _light2: DirectionalLight;
  private _lightPicker: StaticLightPicker;

  private _plane: Sprite;
  private _sphere: Sprite;
  private _cube: Sprite;
  private _torus: Sprite;

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

    this._camera = new Camera();

    this._scene.camera = this._camera;

    this._root = this._scene.root;
    this._view = this._scene.view;

    this._cameraController = new HoverController(this._camera);
    this._cameraController.distance = 1000;
    this._cameraController.minTiltAngle = 0;
    this._cameraController.maxTiltAngle = 90;
    this._cameraController.panAngle = 45;
    this._cameraController.tiltAngle = 20;
  }

  private initLights(): void {
    this._light1 = new DirectionalLight();
    this._light1.direction = new Vector3D(0, -1, 0);
    this._light1.ambient = 0.1;
    this._light1.diffuse = 0.7;

    this._light2 = new DirectionalLight();
    this._light2.direction = new Vector3D(0, -1, 0);
    this._light2.color = 0x00ffff;
    this._light2.ambient = 0.1;
    this._light2.diffuse = 0.7;

    this._lightPicker = new StaticLightPicker([this._light1, this._light2]);
  }

  private initMaterials(): void {
    this._planeMaterial = new MethodMaterial(ImageUtils.getDefaultImage2D());
    this._planeMaterial.lightPicker = this._lightPicker;
    this._planeMaterial.style.sampler = new ImageSampler(true, true, true);

    this._sphereMaterial = new MethodMaterial(ImageUtils.getDefaultImage2D());
    this._sphereMaterial.lightPicker = this._lightPicker;

    this._cubeMaterial = new MethodMaterial(ImageUtils.getDefaultImage2D());
    this._cubeMaterial.lightPicker = this._lightPicker;
    this._cubeMaterial.style.sampler = new ImageSampler(true, true);

    this._torusMaterial = new MethodMaterial(ImageUtils.getDefaultImage2D());
    this._torusMaterial.lightPicker = this._lightPicker;
    this._torusMaterial.style.sampler = new ImageSampler(true, true, true);
  }

  private initObjects(): void {
    this._plane = <Sprite>(
      new PrimitivePlanePrefab(this._planeMaterial, ElementsType.TRIANGLE, 1000, 1000).getNewObject()
    );
    this._plane.graphics.scaleUV(2, 2);
    this._plane.y = -20;

    this._root.addChild(this._plane);

    this._sphere = <Sprite>(
      new PrimitiveSpherePrefab(this._sphereMaterial, ElementsType.TRIANGLE, 150, 40, 20).getNewObject()
    );
    this._sphere.x = 300;
    this._sphere.y = 160;
    this._sphere.z = 300;

    this._root.addChild(this._sphere);

    this._cube = <Sprite>(
      new PrimitiveCubePrefab(this._cubeMaterial, ElementsType.TRIANGLE, 200, 200, 200, 1, 1, 1, false).getNewObject()
    );
    this._cube.x = 300;
    this._cube.y = 160;
    this._cube.z = -250;

    this._root.addChild(this._cube);

    this._torus = <Sprite>(
      new PrimitiveTorusPrefab(this._torusMaterial, ElementsType.TRIANGLE, 150, 60, 40, 20).getNewObject()
    );
    this._torus.graphics.scaleUV(10, 5);
    this._torus.x = -250;
    this._torus.y = 160;
    this._torus.z = -250;

    this._root.addChild(this._torus);
  }

  private initListeners(): void {
    window.onresize = (event: UIEvent) => this.onResize(event);

    document.onmousedown = (event: MouseEvent) => this.onMouseDown(event);
    document.onmouseup = (event: MouseEvent) => this.onMouseUp(event);
    document.onmousemove = (event: MouseEvent) => this.onMouseMove(event);
    document.onwheel = (event: WheelEvent) => this.onMouseWheel(event);

    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();

    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onLoadComplete(event));

    AssetLibrary.load(new URLRequest('awayjs/assets/floor_diffuse.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/floor_normal.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/floor_specular.jpg'));

    AssetLibrary.load(new URLRequest('awayjs/assets/beachball_diffuse.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/beachball_specular.jpg'));

    AssetLibrary.load(new URLRequest('awayjs/assets/trinket_diffuse.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/trinket_normal.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/trinket_specular.jpg'));

    AssetLibrary.load(new URLRequest('awayjs/assets/weave_diffuse.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/weave_normal.jpg'));
  }

  private onEnterFrame(dt: number): void {
    this._time += dt;

    this._light1.direction = new Vector3D(
      Math.sin(this._time / 10000) * 150000,
      -1000,
      Math.cos(this._time / 10000) * 150000,
    );

    this._scene.render();
  }

  private onLoadComplete(event: LoaderEvent) {
    var assets: Array<IAsset> = event.assets;
    var length: number = assets.length;

    for (var c: number = 0; c < length; c++) {
      var asset: IAsset = assets[c];

      console.log(asset.name, event.url);

      switch (event.url) {
        case 'awayjs/assets/floor_diffuse.jpg':
          this._planeMaterial.style.image = <BitmapImage2D>asset;
          break;
        case 'awayjs/assets/floor_normal.jpg':
          this._planeMaterial.normalMethod.texture = new ImageTexture2D(<BitmapImage2D>asset);
          break;
        case 'awayjs/assets/floor_specular.jpg':
          this._planeMaterial.specularMethod.texture = new ImageTexture2D(<BitmapImage2D>asset);
          break;

        case 'awayjs/assets/beachball_diffuse.jpg':
          this._sphereMaterial.style.image = <BitmapImage2D>asset;
          break;
        case 'awayjs/assets/beachball_specular.jpg':
          this._sphereMaterial.specularMethod.texture = new ImageTexture2D(<BitmapImage2D>asset);
          break;

        case 'awayjs/assets/trinket_diffuse.jpg':
          this._cubeMaterial.style.image = <BitmapImage2D>asset;
          break;
        case 'awayjs/assets/trinket_normal.jpg':
          this._cubeMaterial.normalMethod.texture = new ImageTexture2D(<BitmapImage2D>asset);
          break;
        case 'awayjs/assets/trinket_specular.jpg':
          this._cubeMaterial.specularMethod.texture = new ImageTexture2D(<BitmapImage2D>asset);
          break;

        case 'awayjs/assets/weave_diffuse.jpg':
          this._torusMaterial.style.image = <BitmapImage2D>asset;
          break;
        case 'awayjs/assets/weave_normal.jpg':
          this._torusMaterial.normalMethod.texture = this._torusMaterial.specularMethod.texture = new ImageTexture2D(
            <BitmapImage2D>asset,
          );
          break;
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

  private onMouseUp(event: MouseEvent): void {
    this._move = false;
  }

  private onMouseMove(event: MouseEvent) {
    if (this._move) {
      this._cameraController.panAngle = 0.3 * (event.clientX - this._lastMouseX) + this._lastPanAngle;
      this._cameraController.tiltAngle = 0.3 * (event.clientY - this._lastMouseY) + this._lastTiltAngle;
    }
  }

  private onMouseWheel(event: WheelEvent) {
    this._cameraController.distance -= event.deltaY / 2;

    if (this._cameraController.distance < 100) this._cameraController.distance = 100;
    else if (this._cameraController.distance > 2000) this._cameraController.distance = 2000;
  }

  private onResize(event: UIEvent = null): void {
    this._view.y = 0;
    this._view.x = 0;
    this._view.width = window.innerWidth;
    this._view.height = window.innerHeight;
  }
}

new Basic_Shading();
