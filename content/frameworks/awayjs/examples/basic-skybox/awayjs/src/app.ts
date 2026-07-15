import {
  LoaderEvent,
  Vector3D,
  AssetLibrary,
  LoaderContext,
  URLRequest,
  RequestAnimationFrame,
  PerspectiveProjection,
} from '@awayjs/core';
import { BitmapImageCube, ImageSampler } from '@awayjs/stage';
import { ElementsType } from '@awayjs/graphics';
import { Sprite, Skybox, PrimitiveTorusPrefab, Scene } from '@awayjs/scene';
import { MethodMaterial, ImageTextureCube, EffectEnvMapMethod } from '@awayjs/materials';

class BasicSkyBox {
  private _scene: Scene;
  private _cubeTexture: ImageTextureCube;
  private _torusMaterial: MethodMaterial;
  private _skyBox: Skybox;
  private _torus: Sprite;
  private _timer: RequestAnimationFrame;
  private _time: number = 0;
  private _mouseX: number;
  private _mouseY: number;

  constructor() {
    this.init();
  }

  private init(): void {
    this.initEngine();
    this.initMaterials();
    this.initObjects();
    this.initListeners();
  }

  private initEngine(): void {
    this._scene = new Scene();

    this._scene.camera.z = -600;
    this._scene.camera.y = 0;
    this._scene.camera.lookAt(new Vector3D());
    this._scene.camera.projection = new PerspectiveProjection(90);
    this._scene.view.backgroundColor = 0xffff00;
    this._mouseX = window.innerWidth / 2;
  }

  private initMaterials(): void {
    this._torusMaterial = new MethodMaterial(0xffffff, 1);
    this._torusMaterial.style.color = 0x111199;
    this._torusMaterial.style.sampler = new ImageSampler(false, true, true);
    this._torusMaterial.specularMethod.strength = 0.5;
    this._torusMaterial.ambientMethod.strength = 1;
  }

  private initObjects(): void {
    this._torus = <Sprite>(
      new PrimitiveTorusPrefab(this._torusMaterial, ElementsType.TRIANGLE, 150, 60, 40, 20).getNewObject()
    );
    this._torus.boundsVisible = true;
    this._scene.root.addChild(this._torus);
  }

  private initListeners(): void {
    document.onmousemove = (event: MouseEvent) => this.onMouseMove(event);
    window.onresize = () => this.onResize();
    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();

    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));

    var loaderContext = new LoaderContext();
    loaderContext.dependencyBaseUrl = 'awayjs/assets/skybox/';

    AssetLibrary.load(new URLRequest('awayjs/assets/skybox/snow_texture.cube'), loaderContext);
  }

  private onEnterFrame(_dt: number): void {
    this._torus.rotationX += 2;
    this._torus.rotationY += 1;

    this._scene.camera.transform.moveTo(0, 0, 0);
    this._scene.camera.rotationY += (0.5 * (this._mouseX - window.innerWidth / 2)) / 800;
    this._scene.camera.transform.moveBackward(600);
    this._scene.render();
  }

  private onResourceComplete(event: LoaderEvent): void {
    switch (event.url) {
      case 'awayjs/assets/skybox/snow_texture.cube':
        this._cubeTexture = new ImageTextureCube(<BitmapImageCube>event.assets[0]);

        this._skyBox = new Skybox(<BitmapImageCube>event.assets[0]);
        this._scene.root.addChild(this._skyBox);

        this._torusMaterial.addEffectMethod(new EffectEnvMapMethod(this._cubeTexture, 1));
        break;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this._mouseX = event.clientX;
    this._mouseY = event.clientY;
  }

  private onResize(): void {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }
}

new BasicSkyBox();
