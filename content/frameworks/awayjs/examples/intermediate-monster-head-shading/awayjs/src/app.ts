import {
  AssetEvent,
  LoaderEvent,
  URLLoaderEvent,
  Vector3D,
  AssetLibrary,
  LoaderContext,
  URLRequest,
  URLLoader,
  URLLoaderDataFormat,
  RequestAnimationFrame,
  ParserUtils,
} from '@awayjs/core';
import { SpecularImage2D, ImageSampler, ImageUtils } from '@awayjs/stage';
import { HoverController, Sprite, Scene } from '@awayjs/scene';
import type { Camera, DisplayObjectContainer } from '@awayjs/scene';
import {
  ImageTexture2D,
  MethodMaterial,
  SpecularFresnelMethod,
  ShadowSoftMethod,
  PointLight,
  DirectionalLight,
  StaticLightPicker,
} from '@awayjs/materials';
import type { DirectionalShadowMapper } from '@awayjs/materials';
import { AWDParser } from '@awayjs/parsers';
import type { View } from '@awayjs/view';

class Intermediate_MonsterHeadShading {
  private _textureStrings: string[] = [
    'monsterhead_diffuse.jpg',
    'monsterhead_specular.jpg',
    'monsterhead_normals.jpg',
  ];
  private _textureDictionary: Record<string, ImageTexture2D> = {};

  private _scene: Scene;
  private _camera: Camera;
  private _view: View;
  private _root: DisplayObjectContainer;
  private _cameraController: HoverController;

  private _headMaterial: MethodMaterial;
  private _softShadowMethod: ShadowSoftMethod;
  private _fresnelMethod: SpecularFresnelMethod;

  private _blueLight: PointLight;
  private _redLight: PointLight;
  private _directionalLight: DirectionalLight;
  private _lightPicker: StaticLightPicker;
  private _headModel: Sprite;
  private _advancedMethod: boolean = true;

  private _numTextures: number = 0;
  private _currentTexture: number = 0;
  private _n: number = 0;
  private _loadingText: string;

  private _assetsRoot: string = 'awayjs/assets/monsterhead/';

  private _move: boolean = false;
  private _lastPanAngle: number;
  private _lastTiltAngle: number;
  private _lastMouseX: number;
  private _lastMouseY: number;
  private timer: RequestAnimationFrame;
  private time: number = 0;

  private parseAWDDelegate: (event: URLLoaderEvent) => void;
  private parseBitmapDelegate: (event: URLLoaderEvent) => void;
  private loadProgressDelegate: (event: URLLoaderEvent) => void;
  private onBitmapCompleteDelegate: (event: Event) => void;
  private onAssetCompleteDelegate: (event: AssetEvent) => void;
  private onResourceCompleteDelegate: (event: LoaderEvent) => void;

  private _shadowRange: number = 3;
  private _lightDirection: number = (120 * Math.PI) / 180;
  private _lightElevation: number = (30 * Math.PI) / 180;

  constructor() {
    this.init();
  }

  private init(): void {
    this.initEngine();
    this.initLights();
    this.initListeners();

    this._n = 0;
    this._numTextures = this._textureStrings.length;
    this.load(this._textureStrings[this._n]);
  }

  private initEngine(): void {
    this._scene = new Scene();

    this._camera = this._scene.camera;
    this._camera.projection.near = 20;
    this._camera.projection.far = 1000;

    this._cameraController = new HoverController(this._camera, null, 225, 10, 800);
    this._cameraController.yFactor = 1;

    this._view = this._scene.view;
    this._root = this._scene.root;
  }

  private initLights(): void {
    const x: number = Math.sin(this._lightElevation) * Math.cos(this._lightDirection);
    const y: number = -Math.cos(this._lightElevation);
    const z: number = Math.sin(this._lightElevation) * Math.sin(this._lightDirection);

    this._directionalLight = new DirectionalLight(new Vector3D(x, y, z));
    this._directionalLight.color = 0xffeedd;
    this._directionalLight.ambient = 1;
    this._directionalLight.specular = 0.3;
    this._directionalLight.ambientColor = 0x101025;
    this._directionalLight.shadowsEnabled = true;
    this._directionalLight.shadowMapper.epsilon = 0.2;
    (this._directionalLight.shadowMapper as DirectionalShadowMapper).lightOffset = 1000;

    this._blueLight = new PointLight();
    this._blueLight.color = 0x4080ff;
    this._blueLight.x = 3000;
    this._blueLight.z = 700;
    this._blueLight.y = 20;

    this._redLight = new PointLight();
    this._redLight.color = 0x802010;
    this._redLight.x = -2000;
    this._redLight.z = 800;
    this._redLight.y = -400;

    this._lightPicker = new StaticLightPicker([this._directionalLight, this._blueLight, this._redLight]);
  }

  private initListeners(): void {
    window.onresize = () => this.onResize();

    document.onmousedown = (event: MouseEvent) => this.onMouseDown(event);
    document.onmouseup = (event: MouseEvent) => this.onMouseUp(event);
    document.onmousemove = (event: MouseEvent) => this.onMouseMove(event);

    this.onResize();

    this.parseAWDDelegate = (event: URLLoaderEvent) => this.parseAWD(event);
    this.parseBitmapDelegate = (event: URLLoaderEvent) => this.parseBitmap(event);
    this.loadProgressDelegate = (event: URLLoaderEvent) => this.loadProgress(event);
    this.onBitmapCompleteDelegate = (event: Event) => this.onBitmapComplete(event);
    this.onAssetCompleteDelegate = (event: AssetEvent) => this.onAssetComplete(event);
    this.onResourceCompleteDelegate = (event: LoaderEvent) => this.onResourceComplete(event);

    this.timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this.timer.start();
  }

  private updateDirection(): void {
    this._directionalLight.direction = new Vector3D(
      Math.sin(this._lightElevation) * Math.cos(this._lightDirection),
      -Math.cos(this._lightElevation),
      Math.sin(this._lightElevation) * Math.sin(this._lightDirection),
    );
  }

  private updateRange(): void {
    this._softShadowMethod.range = this._shadowRange;
  }

  private load(url: string): void {
    const loader: URLLoader = new URLLoader();
    switch (url.substring(url.length - 3)) {
      case 'AWD':
      case 'awd':
        loader.dataFormat = URLLoaderDataFormat.ARRAY_BUFFER;
        this._loadingText = 'Loading Model';
        loader.addEventListener(URLLoaderEvent.LOAD_COMPLETE, this.parseAWDDelegate);
        break;
      case 'png':
      case 'jpg':
        loader.dataFormat = URLLoaderDataFormat.BLOB;
        this._currentTexture++;
        this._loadingText = 'Loading Textures';
        loader.addEventListener(URLLoaderEvent.LOAD_COMPLETE, this.parseBitmapDelegate);
        break;
    }

    loader.addEventListener(URLLoaderEvent.LOAD_PROGRESS, this.loadProgressDelegate);
    loader.load(new URLRequest(this._assetsRoot + url));
  }

  private loadProgress(event: URLLoaderEvent): void {
    const P: number = Math.floor((event['bytesLoaded'] / event['bytesTotal']) * 100);
    if (P != 100) {
      console.log(
        this._loadingText +
          '\n' +
          (this._loadingText == 'Loading Model'
            ? Math.floor((event['bytesLoaded'] / 1024) << 0) +
              'kb | ' +
              Math.floor((event['bytesTotal'] / 1024) << 0) +
              'kb'
            : this._currentTexture + ' | ' + this._numTextures),
      );
    }
  }

  private parseBitmap(event: URLLoaderEvent): void {
    const urlLoader: URLLoader = event.target as URLLoader;
    const image: HTMLImageElement = ParserUtils.blobToImage(urlLoader.data);
    image.onload = this.onBitmapCompleteDelegate;
    urlLoader.removeEventListener(URLLoaderEvent.LOAD_COMPLETE, this.parseBitmapDelegate);
    urlLoader.removeEventListener(URLLoaderEvent.LOAD_PROGRESS, this.loadProgressDelegate);
  }

  private parseAWD(event: URLLoaderEvent): void {
    console.log('Parsing Data');
    const urlLoader: URLLoader = event.target as URLLoader;

    AssetLibrary.addEventListener(AssetEvent.ASSET_COMPLETE, this.onAssetCompleteDelegate);
    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, this.onResourceCompleteDelegate);
    AssetLibrary.loadData(urlLoader.data, new LoaderContext(false), null, new AWDParser());

    urlLoader.removeEventListener(URLLoaderEvent.LOAD_PROGRESS, this.loadProgressDelegate);
    urlLoader.removeEventListener(URLLoaderEvent.LOAD_COMPLETE, this.parseAWDDelegate);
  }

  private onBitmapComplete(event: Event): void {
    const image: HTMLImageElement = event.target as HTMLImageElement;
    image.onload = null;
    if (!this._textureDictionary[this._textureStrings[this._n]])
      this._textureDictionary[this._textureStrings[this._n]] = new ImageTexture2D(
        this._n == 1
          ? new SpecularImage2D(ImageUtils.imageToBitmapImage2D(image))
          : ImageUtils.imageToBitmapImage2D(image),
      );

    this._n++;

    if (this._n < this._textureStrings.length) {
      this.load(this._textureStrings[this._n]);
    } else {
      this.load('MonsterHead.awd');
    }
  }

  private onEnterFrame(dt: number): void {
    this._scene.render();
  }

  private onAssetComplete(event: AssetEvent): void {
    if (event.asset.isAsset(Sprite)) {
      this._headModel = event.asset as Sprite;
      this._headModel.graphics.scale(4);
      this._headModel.y = -20;
      this._root.addChild(this._headModel);
    }
  }

  private onResourceComplete(e: LoaderEvent): void {
    AssetLibrary.removeEventListener(AssetEvent.ASSET_COMPLETE, this.onAssetCompleteDelegate);
    AssetLibrary.removeEventListener(LoaderEvent.LOAD_COMPLETE, this.onResourceCompleteDelegate);

    const material: MethodMaterial = new MethodMaterial(this._textureDictionary['monsterhead_diffuse.jpg']);
    material.shadowMethod = new ShadowSoftMethod(this._directionalLight, 10, 5);
    material.lightPicker = this._lightPicker;
    material.specularMethod.gloss = 30;
    material.specularMethod.strength = 1;
    material.style.color = 0x303040;
    material.ambientMethod.strength = 1;

    this._headMaterial = new MethodMaterial();
    this._headMaterial.ambientMethod.texture = this._textureDictionary['monsterhead_diffuse.jpg'];
    this._headMaterial.style.sampler = new ImageSampler(true, true);
    this._headMaterial.normalMethod.texture = this._textureDictionary['monsterhead_normals.jpg'];
    this._headMaterial.lightPicker = this._lightPicker;
    this._headMaterial.style.color = 0x303040;
    this._headMaterial.diffuseMethod.multiply = false;

    this._softShadowMethod = new ShadowSoftMethod(this._directionalLight, 20);
    this._softShadowMethod.range = this._shadowRange;
    this._headMaterial.shadowMethod = this._softShadowMethod;

    this._fresnelMethod = new SpecularFresnelMethod(true);
    this._fresnelMethod.fresnelPower = 3;
    this._headMaterial.specularMethod = this._fresnelMethod;
    this._headMaterial.specularMethod.texture = this._textureDictionary['monsterhead_specular.jpg'];
    this._headMaterial.specularMethod.strength = 3;
    this._headMaterial.specularMethod.gloss = 10;

    const len: number = this._headModel.graphics.count;
    for (let i: number = 0; i < len; i++) this._headModel.graphics.getShapeAt(i).material = this._headMaterial;

    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) =>
      this.onExtraResourceComplete(event),
    );

    AssetLibrary.load(new URLRequest('awayjs/assets/diffuseGradient.jpg'));
  }

  private onExtraResourceComplete(event: LoaderEvent): void {
    switch (event.url) {
      case 'awayjs/assets/diffuseGradient.jpg':
        break;
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

  private onMouseMove(event: MouseEvent): void {
    if (this._move) {
      this._cameraController.panAngle = 0.3 * (event.clientX - this._lastMouseX) + this._lastPanAngle;
      this._cameraController.tiltAngle = 0.3 * (event.clientY - this._lastMouseY) + this._lastTiltAngle;
    }
  }

  private onResize(): void {
    this._view.y = 0;
    this._view.x = 0;
    this._view.width = window.innerWidth;
    this._view.height = window.innerHeight;
  }
}

new Intermediate_MonsterHeadShading();
