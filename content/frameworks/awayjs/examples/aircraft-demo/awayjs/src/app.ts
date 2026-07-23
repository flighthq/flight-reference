import {
  LoaderEvent,
  Matrix,
  Vector3D,
  AssetLibrary,
  Loader,
  URLRequest,
  Debug,
  RequestAnimationFrame,
} from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { BitmapImage2D, BitmapImageCube, ImageSampler } from '@awayjs/stage';
import { Style } from '@awayjs/renderer';
import { ElementsType } from '@awayjs/graphics';
import { Sprite, Skybox, DisplayObjectContainer, PrimitivePlanePrefab, Scene } from '@awayjs/scene';
import {
  MethodMaterial,
  EffectEnvMapMethod,
  NormalSimpleWaterMethod,
  SpecularFresnelMethod,
  ImageTexture2D,
  ImageTextureCube,
  DirectionalLight,
  StaticLightPicker,
} from '@awayjs/materials';
import { OBJParser } from '@awayjs/parsers';

class AircraftDemo {
  private _maxStates: number = 2;
  private _cameraIncrement: number = 0;
  private _rollIncrement: number = 0;
  private _loopIncrement: number = 0;
  private _state: number = 0;
  private _appTime: number = 0;

  private _lightPicker: StaticLightPicker;
  private _scene: Scene;
  private _timer: RequestAnimationFrame;

  private _seaGeom: PrimitivePlanePrefab;
  private _seaSprite: Sprite;
  private _seaNormalImage: BitmapImage2D;
  private _seaInitialized: boolean = false;
  private _seaMaterial: MethodMaterial;

  private _f14Geom: DisplayObjectContainer;
  private _f14Initialized: boolean = false;

  private _waterMethod: NormalSimpleWaterMethod;
  private _skyboxImageCube: BitmapImageCube;
  private _skyboxInitialized: boolean = false;

  constructor() {
    Debug.LOG_PI_ERRORS = false;
    Debug.THROW_ERRORS = false;

    this.initScene();
    this.initLights();
    this.initAnimation();
    this.initParsers();
    this.loadAssets();

    window.onresize = () => this.onResize();
  }

  private loadAssets() {
    this.loadAsset('awayjs/assets/sea_normals.jpg');
    this.loadAsset('awayjs/assets/f14/f14d.obj');
    this.loadAsset('awayjs/assets/skybox/CubeTextureTest.cube');
  }

  private loadAsset(path: string) {
    const session: Loader = AssetLibrary.getLoader();
    session.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));
    session.load(new URLRequest(path));
  }

  private initParsers() {
    AssetLibrary.enableParser(OBJParser);
  }

  private initAnimation() {
    this._timer = new RequestAnimationFrame(this.render, this);
  }

  private initScene() {
    this._scene = new Scene();
    this._scene.camera.z = -500;
    this._scene.camera.y = 250;
    this._scene.camera.rotationX = 20;
    this._scene.camera.projection.near = 0.5;
    this._scene.camera.projection.far = 14000;
    this._scene.view.backgroundColor = 0x2c2c32;

    this.onResize();
  }

  private initializeScene() {
    if (this._skyboxImageCube && this._f14Geom && this._seaNormalImage) {
      this.initF14();
      this.initSea();
      this._timer.start();
    }
  }

  private initLights() {
    const light = new DirectionalLight();
    light.color = 0x974523;
    light.direction = new Vector3D(-300, -300, -5000);
    light.ambient = 1;
    light.ambientColor = 0x7196ac;
    light.diffuse = 1.2;
    light.specular = 1.1;

    this._lightPicker = new StaticLightPicker([light]);
  }

  private initF14() {
    this._f14Initialized = true;

    const f14Material = new MethodMaterial(this._seaNormalImage);
    f14Material.style.sampler = new ImageSampler(true, true, false);
    f14Material.lightPicker = this._lightPicker;

    this._scene.root.addChild(this._f14Geom);
    this._f14Geom.transform.scaleTo(20, 20, 20);
    this._f14Geom.rotationX = 90;
    this._f14Geom.y = 200;
    this._scene.camera.lookAt(this._f14Geom.transform.position);

    document.onmousedown = () => this.onMouseDown();
  }

  private initSea() {
    this._seaMaterial = new MethodMaterial(this._seaNormalImage);
    this._seaMaterial.style.sampler = new ImageSampler(true, true, false);
    this._waterMethod = new NormalSimpleWaterMethod(
      new ImageTexture2D(this._seaNormalImage),
      new ImageTexture2D(this._seaNormalImage),
    );
    const fresnelMethod = new SpecularFresnelMethod();
    fresnelMethod.normalReflectance = 0.3;
    fresnelMethod.gloss = 10;
    fresnelMethod.strength = 1;

    this._seaMaterial.alphaBlending = true;
    this._seaMaterial.lightPicker = this._lightPicker;
    this._seaMaterial.style.sampler = new ImageSampler(true);
    this._seaMaterial.animateUVs = true;
    this._seaMaterial.normalMethod = this._waterMethod;
    this._seaMaterial.addEffectMethod(new EffectEnvMapMethod(new ImageTextureCube(this._skyboxImageCube)));
    this._seaMaterial.specularMethod = fresnelMethod;

    this._seaGeom = new PrimitivePlanePrefab(this._seaMaterial, ElementsType.TRIANGLE, 50000, 50000, 1, 1, true, false);
    this._seaSprite = this._seaGeom.getNewObject() as Sprite;
    this._seaSprite.graphics.scaleUV(100, 100);
    this._seaSprite.style = new Style();
    this._seaSprite.style.uvMatrix = new Matrix();
    this._scene.root.addChild(new Skybox(this._skyboxImageCube));
    this._scene.root.addChild(this._seaSprite);
  }

  public onResourceComplete(event: LoaderEvent) {
    const loader: Loader = event.target;
    const numAssets: number = loader.baseDependency.assets.length;

    switch (event.url) {
      case 'awayjs/assets/sea_normals.jpg':
        this._seaNormalImage = loader.baseDependency.assets[0] as BitmapImage2D;
        break;
      case 'awayjs/assets/f14/f14d.obj':
        this._f14Geom = new DisplayObjectContainer();
        for (let i = 0; i < numAssets; ++i) {
          const asset: IAsset = loader.baseDependency.assets[i];
          switch (asset.assetType) {
            case Sprite.assetType: {
              const sprite = asset as Sprite;
              this._f14Geom.addChild(sprite);
              break;
            }
          }
        }
        break;
      case 'awayjs/assets/skybox/CubeTextureTest.cube':
        this._skyboxImageCube = loader.baseDependency.assets[0] as BitmapImageCube;
        break;
    }

    this.initializeScene();
  }

  private render(dt: number) {
    if (this._f14Geom) {
      this._rollIncrement += 0.02;

      switch (this._state) {
        case 0:
          this._f14Geom.rotationZ = Math.sin(this._rollIncrement) * 25;
          break;
        case 1:
          this._loopIncrement += 0.05;
          this._f14Geom.z += Math.cos(this._loopIncrement) * 20;
          this._f14Geom.y += Math.sin(this._loopIncrement) * 20;
          this._f14Geom.rotationX += -1 * ((Math.PI / 180) * Math.atan2(this._f14Geom.z, this._f14Geom.y));
          this._f14Geom.rotationZ = Math.sin(this._rollIncrement) * 25;

          if (this._loopIncrement > Math.PI * 2) {
            this._loopIncrement = 0;
            this._state = 0;
          }
          break;
      }
    }

    if (this._f14Geom) {
      this._scene.camera.lookAt(this._f14Geom.transform.position);
    }

    if (this._scene.camera) {
      this._cameraIncrement += 0.01;
      this._scene.camera.x = Math.cos(this._cameraIncrement) * 400;
      this._scene.camera.z = Math.sin(this._cameraIncrement) * 400;
    }

    if (this._f14Geom) {
      this._scene.camera.lookAt(this._f14Geom.transform.position);
    }

    if (this._seaMaterial) {
      this._seaSprite.style.uvMatrix.ty -= 0.04;
    }

    this._appTime += dt;
    this._scene.render();
  }

  public onResize(): void {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }

  private onMouseDown() {
    this._state++;

    if (this._state >= this._maxStates) this._state = 0;
  }
}

new AircraftDemo();
