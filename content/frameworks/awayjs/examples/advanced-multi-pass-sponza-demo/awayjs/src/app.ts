import {
  URLLoaderEvent,
  AssetEvent,
  LoaderEvent,
  Matrix,
  Vector3D,
  AssetLibrary,
  LoaderContext,
  URLRequest,
  URLLoader,
  URLLoaderDataFormat,
  RequestAnimationFrame,
  ParserUtils,
  Keyboard,
} from '@awayjs/core';
import { ImageSampler, SpecularImage2D, BitmapImage2D, BitmapImageCube, BlendMode, ImageUtils } from '@awayjs/stage';
import { Style } from '@awayjs/renderer';
import { Shape, ElementsType } from '@awayjs/graphics';
import {
  FirstPersonController,
  Sprite,
  Skybox,
  LoaderContainer,
  PrimitivePlanePrefab,
  Merge,
  Scene,
} from '@awayjs/scene';
import {
  MethodMaterial,
  ImageTexture2D,
  MethodMaterialMode,
  CascadeShadowMapper,
  ShadowSoftMethod,
  EffectFogMethod,
  PointLight,
  DirectionalLight,
  StaticLightPicker,
  DirectionalShadowMapper,
} from '@awayjs/materials';
import { AWDParser } from '@awayjs/parsers';

class Advanced_MultiPassSponzaDemo {
  private _assetsRoot: string = 'awayjs/assets/';

  private _materialNameStrings: Array<string> = Array<string>(
    'arch',
    'Material__298',
    'bricks',
    'ceiling',
    'chain',
    'column_a',
    'column_b',
    'column_c',
    'fabric_g',
    'fabric_c',
    'fabric_f',
    'details',
    'fabric_d',
    'fabric_a',
    'fabric_e',
    'flagpole',
    'floor',
    '16___Default',
    'Material__25',
    'roof',
    'leaf',
    'vase',
    'vase_hanging',
    'Material__57',
    'vase_round',
  );

  private _diffuseTextureStrings: Array<string> = Array<string>(
    'arch_diff.jpg',
    'background.jpg',
    'bricks_a_diff.jpg',
    'ceiling_a_diff.jpg',
    'chain_texture.png',
    'column_a_diff.jpg',
    'column_b_diff.jpg',
    'column_c_diff.jpg',
    'curtain_blue_diff.jpg',
    'curtain_diff.jpg',
    'curtain_green_diff.jpg',
    'details_diff.jpg',
    'fabric_blue_diff.jpg',
    'fabric_diff.jpg',
    'fabric_green_diff.jpg',
    'flagpole_diff.jpg',
    'floor_a_diff.jpg',
    'gi_flag.jpg',
    'lion.jpg',
    'roof_diff.jpg',
    'thorn_diff.png',
    'vase_dif.jpg',
    'vase_hanging.jpg',
    'vase_plant.png',
    'vase_round.jpg',
  );
  private _normalTextureStrings: Array<string> = Array<string>(
    'arch_ddn.jpg',
    'background_ddn.jpg',
    'bricks_a_ddn.jpg',
    null,
    'chain_texture_ddn.jpg',
    'column_a_ddn.jpg',
    'column_b_ddn.jpg',
    'column_c_ddn.jpg',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'lion2_ddn.jpg',
    null,
    'thorn_ddn.jpg',
    'vase_ddn.jpg',
    null,
    null,
    'vase_round_ddn.jpg',
  );
  private _specularTextureStrings: Array<string> = Array<string>(
    'arch_spec.jpg',
    null,
    'bricks_a_spec.jpg',
    'ceiling_a_spec.jpg',
    null,
    'column_a_spec.jpg',
    'column_b_spec.jpg',
    'column_c_spec.jpg',
    'curtain_spec.jpg',
    'curtain_spec.jpg',
    'curtain_spec.jpg',
    'details_spec.jpg',
    'fabric_spec.jpg',
    'fabric_spec.jpg',
    'fabric_spec.jpg',
    'flagpole_spec.jpg',
    'floor_a_spec.jpg',
    null,
    null,
    null,
    'thorn_spec.jpg',
    null,
    null,
    'vase_plant_spec.jpg',
    'vase_round_spec.jpg',
  );
  private _numTexStrings: Array<number> = Array<number>(
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  );
  private _spriteReference: Sprite[] = new Array<Sprite>(25);

  private _flameData: Array<FlameVO> = Array<FlameVO>(
    new FlameVO(new Vector3D(-625, 165, 219), 0xffaa44),
    new FlameVO(new Vector3D(485, 165, 219), 0xffaa44),
    new FlameVO(new Vector3D(-625, 165, -148), 0xffaa44),
    new FlameVO(new Vector3D(485, 165, -148), 0xffaa44),
  );

  private _textureDictionary: object = new Object();
  private _multiMaterialDictionary: object = new Object();
  private _singleMaterialDictionary: object = new Object();

  private vaseSprites: Array<Sprite> = new Array<Sprite>();
  private poleSprites: Array<Sprite> = new Array<Sprite>();
  private colSprites: Array<Sprite> = new Array<Sprite>();

  private _scene: Scene;
  private _cameraController: FirstPersonController;

  private _singlePassMaterial: boolean = false;
  private _multiPassMaterial: boolean = true;
  private _cascadeLevels: number = 3;
  private _shadowOptions: string = 'PCF';
  private _depthMapSize: number = 2048;
  private _lightDirection: number = Math.PI / 2;
  private _lightElevation: number = Math.PI / 18;

  private _lightPicker: StaticLightPicker;
  private _baseShadowMethod: ShadowSoftMethod;
  private _fogMethod: EffectFogMethod;
  private _cascadeShadowMapper: DirectionalShadowMapper;
  private _directionalLight: DirectionalLight;
  private _lights: Array<any> = new Array<any>();

  private _skyMap: BitmapImageCube;
  private _flameMaterial: MethodMaterial;
  private _numTextures: number = 0;
  private _currentTexture: number = 0;
  private _loadingTextureStrings: Array<string>;
  private _n: number = 0;
  private _loadingText: string;

  private _sprites: Array<Sprite> = new Array<Sprite>();
  private _flameGraphics: PrimitivePlanePrefab;

  private _move: boolean = false;
  private _lastPanAngle: number;
  private _lastTiltAngle: number;
  private _lastMouseX: number;
  private _lastMouseY: number;

  private _drag: number = 0.5;
  private _walkIncrement: number = 10;
  private _strafeIncrement: number = 10;
  private _walkSpeed: number = 0;
  private _strafeSpeed: number = 0;
  private _walkAcceleration: number = 0;
  private _strafeAcceleration: number = 0;

  private _timer: RequestAnimationFrame;
  private _time: number = 0;
  private parseAWDDelegate: (event: URLLoaderEvent) => void;
  private parseBitmapDelegate: (event: URLLoaderEvent) => void;
  private loadProgressDelegate: (event: URLLoaderEvent) => void;
  private onBitmapCompleteDelegate: (event) => void;
  private onAssetCompleteDelegate: (event: AssetEvent) => void;
  private onResourceCompleteDelegate: (event: LoaderEvent) => void;

  constructor() {
    this.init();
  }

  private init() {
    this.initEngine();
    this.initLights();
    this.initListeners();

    this._n = 0;
    this._loadingTextureStrings = this._diffuseTextureStrings;
    this.countNumTextures();

    this._n = 0;
    this._loadingTextureStrings = this._diffuseTextureStrings;
    this.load(this._loadingTextureStrings[this._n]);
  }

  private initEngine() {
    this._scene = new Scene();
    this._scene.camera.y = 150;
    this._scene.camera.z = 0;

    this._cameraController = new FirstPersonController(this._scene.camera, 90, 0, -80, 80);
  }

  private initLights() {
    this._lights = new Array<any>();

    this._directionalLight = new DirectionalLight(new Vector3D(-1, -15, 1));
    this._directionalLight.color = 0xeedddd;
    this._directionalLight.ambient = 0.35;
    this._directionalLight.ambientColor = 0x808090;
    this._lights.push(this._directionalLight);

    this.updateDirection();

    const len: number = this._flameData.length;
    for (let i: number = 0; i < len; i++) {
      const flameVO = this._flameData[i];
      const light: PointLight = (flameVO.light = new PointLight());
      light.radius = 200;
      light.fallOff = 600;
      light.color = flameVO.color;
      light.y = 10;
      this._lights.push(light);
    }

    this._lightPicker = new StaticLightPicker(this._lights);
    this._baseShadowMethod = new ShadowSoftMethod(this._directionalLight, 10, 5);

    this._fogMethod = new EffectFogMethod(0, 4000, 0x9090e7);
  }

  private initObjects() {
    this._scene.root.addChild(new Skybox(this._skyMap));

    this._flameGraphics = new PrimitivePlanePrefab(
      this._flameMaterial,
      ElementsType.TRIANGLE,
      40,
      80,
      1,
      1,
      false,
      true,
    );
    const len: number = this._flameData.length;
    for (let i: number = 0; i < len; i++) {
      const flameVO = this._flameData[i];
      const sprite: Sprite = (flameVO.sprite = this._flameGraphics.getNewObject() as Sprite);
      sprite.transform.moveTo(flameVO.position.x, flameVO.position.y, flameVO.position.z);
      const shape: Shape = sprite.graphics.getShapeAt(0) as Shape;
      shape.style = new Style();
      shape.style.uvMatrix = new Matrix();
      shape.style.uvMatrix.scale(1 / 16, 1);
      this._scene.root.addChild(sprite);
      flameVO.light.transform = sprite.transform;
    }
  }

  private initListeners() {
    window.onresize = (event) => this.onResize(event);

    document.onmousedown = (event) => this.onMouseDown(event);
    document.onmouseup = (event) => this.onMouseUp(event);
    document.onmousemove = (event) => this.onMouseMove(event);
    document.onkeydown = (event) => this.onKeyDown(event);
    document.onkeyup = (event) => this.onKeyUp(event);

    this.onResize();

    this.parseAWDDelegate = (event: URLLoaderEvent) => this.parseAWD(event);
    this.parseBitmapDelegate = (event: URLLoaderEvent) => this.parseBitmap(event);
    this.loadProgressDelegate = (event: URLLoaderEvent) => this.loadProgress(event);
    this.onBitmapCompleteDelegate = (event) => this.onBitmapComplete(event);
    this.onAssetCompleteDelegate = (event: AssetEvent) => this.onAssetComplete(event);
    this.onResourceCompleteDelegate = (event: LoaderEvent) => this.onResourceComplete(event);

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();
  }

  private updateDirection() {
    this._directionalLight.direction = new Vector3D(
      Math.sin(this._lightElevation) * Math.cos(this._lightDirection),
      -Math.cos(this._lightElevation),
      Math.sin(this._lightElevation) * Math.sin(this._lightDirection),
    );
  }

  private countNumTextures() {
    this._numTextures++;

    while (this._n++ < this._loadingTextureStrings.length - 1) if (this._loadingTextureStrings[this._n]) break;

    if (this._n < this._loadingTextureStrings.length) {
      this.countNumTextures();
    } else if (this._loadingTextureStrings == this._diffuseTextureStrings) {
      this._n = 0;
      this._loadingTextureStrings = this._normalTextureStrings;
      this.countNumTextures();
    } else if (this._loadingTextureStrings == this._normalTextureStrings) {
      this._n = 0;
      this._loadingTextureStrings = this._specularTextureStrings;
      this.countNumTextures();
    }
  }

  private load(url: string) {
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
        url = 'sponza/' + url;
        break;
    }

    loader.addEventListener(URLLoaderEvent.LOAD_PROGRESS, this.loadProgressDelegate);
    const urlReq: URLRequest = new URLRequest(this._assetsRoot + url);
    loader.load(urlReq);
  }

  private loadProgress(e: URLLoaderEvent) {
    const P: number = Math.floor((e['bytesLoaded'] / e['bytesTotal']) * 100);
    if (P != 100) {
      console.log(
        this._loadingText +
          '\n' +
          (this._loadingText == 'Loading Model'
            ? Math.floor((e['bytesLoaded'] / 1024) << 0) + 'kb | ' + Math.floor((e['bytesTotal'] / 1024) << 0) + 'kb'
            : this._currentTexture + ' | ' + this._numTextures),
      );
    }
  }

  private parseBitmap(e) {
    const urlLoader = e.target as URLLoader;
    const image: HTMLImageElement = ParserUtils.blobToImage(urlLoader.data);
    image.onload = this.onBitmapCompleteDelegate;
    urlLoader.removeEventListener(URLLoaderEvent.LOAD_COMPLETE, this.parseBitmapDelegate);
    urlLoader.removeEventListener(URLLoaderEvent.LOAD_PROGRESS, this.loadProgressDelegate);
  }

  private onBitmapComplete(event: Event) {
    const image = event.target as HTMLImageElement;
    image.onload = null;

    if (!this._textureDictionary[this._loadingTextureStrings[this._n]])
      this._textureDictionary[this._loadingTextureStrings[this._n]] = new ImageTexture2D(
        this._loadingTextureStrings == this._specularTextureStrings
          ? new SpecularImage2D(ImageUtils.imageToBitmapImage2D(image))
          : ImageUtils.imageToBitmapImage2D(image),
      );

    while (this._n++ < this._loadingTextureStrings.length - 1) if (this._loadingTextureStrings[this._n]) break;

    if (this._n < this._loadingTextureStrings.length) {
      this.load(this._loadingTextureStrings[this._n]);
    } else if (this._loadingTextureStrings == this._diffuseTextureStrings) {
      this._n = 0;
      this._loadingTextureStrings = this._normalTextureStrings;
      this.load(this._loadingTextureStrings[this._n]);
    } else if (this._loadingTextureStrings == this._normalTextureStrings) {
      this._n = 0;
      this._loadingTextureStrings = this._specularTextureStrings;
      this.load(this._loadingTextureStrings[this._n]);
    } else {
      this.load('sponza/sponza.awd');
    }
  }

  private parseAWD(event: URLLoaderEvent) {
    console.log('Parsing Data');
    const urlLoader: URLLoader = event.target;
    const loader: LoaderContainer = new LoaderContainer(false);

    loader.addEventListener(AssetEvent.ASSET_COMPLETE, this.onAssetCompleteDelegate);
    loader.addEventListener(LoaderEvent.LOAD_COMPLETE, this.onResourceCompleteDelegate);
    loader.loadData(urlLoader.data, new LoaderContext(false), null, new AWDParser());

    urlLoader.removeEventListener(URLLoaderEvent.LOAD_PROGRESS, this.loadProgressDelegate);
    urlLoader.removeEventListener(URLLoaderEvent.LOAD_COMPLETE, this.parseAWDDelegate);
  }

  private onAssetComplete(event: AssetEvent) {
    if (event.asset.isAsset(Sprite)) {
      this._sprites.push(event.asset as Sprite);
    }
  }

  private onResourceComplete(event: LoaderEvent) {
    const merge: Merge = new Merge(false, false, true);

    const loader: LoaderContainer = event.target;
    loader.removeEventListener(AssetEvent.ASSET_COMPLETE, this.onAssetCompleteDelegate);
    loader.removeEventListener(LoaderEvent.LOAD_COMPLETE, this.onResourceCompleteDelegate);

    const len: number = this._sprites.length;
    for (let i: number = 0; i < len; i++) {
      let sprite: Sprite = this._sprites[i];
      if (sprite.name == 'sponza_04' || sprite.name == 'sponza_379') continue;

      const num: number = Number(sprite.name.substring(7));

      const name: string = sprite.material.name;

      if (name == 'column_c' && (num < 22 || num > 33)) continue;

      const colNum: number = num - 125;
      if (name == 'column_b') {
        if (colNum >= 0 && colNum < 132 && colNum % 11 < 10) {
          this.colSprites.push(sprite);
          continue;
        } else {
          this.colSprites.push(sprite);
          const colMerge: Merge = new Merge();
          const colSprite: Sprite = new Sprite();
          colMerge.applyToSprites(colSprite, this.colSprites);
          sprite = colSprite;
          this.colSprites = new Array<Sprite>();
        }
      }

      const vaseNum: number = num - 334;
      if (name == 'vase_hanging' && vaseNum % 9 < 5) {
        if (vaseNum >= 0 && vaseNum < 370 && vaseNum % 9 < 4) {
          this.vaseSprites.push(sprite);
          continue;
        } else {
          this.vaseSprites.push(sprite);
          const vaseMerge: Merge = new Merge();
          const vaseSprite: Sprite = new Sprite();
          vaseMerge.applyToSprites(vaseSprite, this.vaseSprites);
          sprite = vaseSprite;
          this.vaseSprites = new Array<Sprite>();
        }
      }

      const poleNum: number = num - 290;
      if (name == 'flagpole') {
        if (poleNum >= 0 && poleNum < 320 && poleNum % 3 < 2) {
          this.poleSprites.push(sprite);
          continue;
        } else if (poleNum >= 0) {
          this.poleSprites.push(sprite);
          const poleMerge: Merge = new Merge();
          const poleSprite: Sprite = new Sprite();
          poleMerge.applyToSprites(poleSprite, this.poleSprites);
          sprite = poleSprite;
          this.poleSprites = new Array<Sprite>();
        }
      }

      if (
        name == 'flagpole' &&
        (num == 260 || num == 261 || num == 263 || num == 265 || num == 268 || num == 269 || num == 271 || num == 273)
      )
        continue;

      const textureIndex: number = this._materialNameStrings.indexOf(name);
      if (textureIndex == -1 || textureIndex >= this._materialNameStrings.length) continue;

      this._numTexStrings[textureIndex]++;

      const textureName: string = this._diffuseTextureStrings[textureIndex];

      let multiMaterial: MethodMaterial = this._multiMaterialDictionary[name];

      if (!multiMaterial) {
        multiMaterial = new MethodMaterial();
        multiMaterial.ambientMethod.texture = this._textureDictionary[textureName];
        multiMaterial.mode = MethodMaterialMode.MULTI_PASS;
        multiMaterial.name = name;
        multiMaterial.lightPicker = this._lightPicker;
        multiMaterial.shadowMethod = this._baseShadowMethod;
        multiMaterial.addEffectMethod(this._fogMethod);
        multiMaterial.style.sampler = new ImageSampler(true, true, true);
        multiMaterial.style.addSamplerAt(new ImageSampler(true, true), this._directionalLight.shadowMapper.textureMap);
        multiMaterial.specularMethod.strength = 2;

        if (textureName.substring(textureName.length - 3) == 'png') multiMaterial.alphaThreshold = 0.5;

        const normalTextureName: string = this._normalTextureStrings[textureIndex];
        if (normalTextureName) multiMaterial.normalMethod.texture = this._textureDictionary[normalTextureName];

        const specularTextureName: string = this._specularTextureStrings[textureIndex];
        if (specularTextureName) multiMaterial.specularMethod.texture = this._textureDictionary[specularTextureName];

        this._multiMaterialDictionary[name] = multiMaterial;
      }

      sprite.material = multiMaterial;

      this._scene.root.addChild(sprite);

      this._spriteReference[textureIndex] = sprite;
    }

    let z: number = 0;

    while (z < this._numTexStrings.length) {
      console.log(this._diffuseTextureStrings[z], this._numTexStrings[z]);
      z++;
    }

    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) =>
      this.onExtraResourceComplete(event),
    );

    const loaderContext: LoaderContext = new LoaderContext();
    loaderContext.dependencyBaseUrl = 'awayjs/assets/skybox/';

    AssetLibrary.load(new URLRequest('awayjs/assets/skybox/hourglass_texture.cube'), loaderContext);

    AssetLibrary.load(new URLRequest('awayjs/assets/fire.png'));
  }

  private onExtraResourceComplete(event: LoaderEvent) {
    switch (event.url) {
      case 'awayjs/assets/skybox/hourglass_texture.cube':
        this._skyMap = event.assets[0] as BitmapImageCube;
        break;
      case 'awayjs/assets/fire.png':
        this._flameMaterial = new MethodMaterial(event.assets[0] as BitmapImage2D);
        this._flameMaterial.blendMode = BlendMode.ADD;
        this._flameMaterial.animateUVs = true;
        break;
    }

    if (this._skyMap && this._flameMaterial) this.initObjects();
  }

  private onEnterFrame(dt: number) {
    if (this._walkSpeed || this._walkAcceleration) {
      this._walkSpeed = (this._walkSpeed + this._walkAcceleration) * this._drag;
      if (Math.abs(this._walkSpeed) < 0.01) this._walkSpeed = 0;
      this._cameraController.incrementWalk(this._walkSpeed);
    }

    if (this._strafeSpeed || this._strafeAcceleration) {
      this._strafeSpeed = (this._strafeSpeed + this._strafeAcceleration) * this._drag;
      if (Math.abs(this._strafeSpeed) < 0.01) this._strafeSpeed = 0;
      this._cameraController.incrementStrafe(this._strafeSpeed);
    }

    const len: number = this._flameData.length;
    for (let i: number = 0; i < len; i++) {
      const flameVO: FlameVO = this._flameData[i];
      const light: PointLight = flameVO.light;

      if (!light) continue;

      light.fallOff = 380 + Math.random() * 20;
      light.radius = 200 + Math.random() * 30;
      light.diffuse = 0.9 + Math.random() * 0.1;

      const sprite: Sprite = flameVO.sprite;

      if (!sprite) continue;

      const shape = sprite.graphics.getShapeAt(0) as Shape;
      shape.style.uvMatrix.tx += 1 / 16;
      shape.style.uvMatrix.tx %= 1;
      sprite.rotationY = (Math.atan2(sprite.x - this._scene.camera.x, sprite.z - this._scene.camera.z) * 180) / Math.PI;
    }

    this._scene.render();
  }

  private onKeyDown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case Keyboard.UP:
      case Keyboard.W:
        this._walkAcceleration = this._walkIncrement;
        break;
      case Keyboard.DOWN:
      case Keyboard.S:
        this._walkAcceleration = -this._walkIncrement;
        break;
      case Keyboard.LEFT:
      case Keyboard.A:
        this._strafeAcceleration = -this._strafeIncrement;
        break;
      case Keyboard.RIGHT:
      case Keyboard.D:
        this._strafeAcceleration = this._strafeIncrement;
        break;
      case Keyboard.F:
        break;
      case Keyboard.C:
        this._cameraController.fly = !this._cameraController.fly;
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    switch (event.keyCode) {
      case Keyboard.UP:
      case Keyboard.W:
      case Keyboard.DOWN:
      case Keyboard.S:
        this._walkAcceleration = 0;
        break;
      case Keyboard.LEFT:
      case Keyboard.A:
      case Keyboard.RIGHT:
      case Keyboard.D:
        this._strafeAcceleration = 0;
        break;
    }
  }

  private onMouseDown(event) {
    this._lastPanAngle = this._cameraController.panAngle;
    this._lastTiltAngle = this._cameraController.tiltAngle;
    this._lastMouseX = event.clientX;
    this._lastMouseY = event.clientY;
    this._move = true;
  }

  private onMouseUp(event) {
    this._move = false;
  }

  private onMouseMove(event) {
    if (this._move) {
      this._cameraController.panAngle = 0.3 * (event.clientX - this._lastMouseX) + this._lastPanAngle;
      this._cameraController.tiltAngle = 0.3 * (event.clientY - this._lastMouseY) + this._lastTiltAngle;
    }
  }

  private onResize(event = null) {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }
}

class FlameVO {
  public position: Vector3D;
  public color: number;
  public sprite: Sprite;
  public light: PointLight;

  constructor(position: Vector3D, color: number) {
    this.position = position;
    this.color = color;
  }
}

new Advanced_MultiPassSponzaDemo();
