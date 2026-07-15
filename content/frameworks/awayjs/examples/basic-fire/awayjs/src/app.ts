import {
  LoaderEvent,
  TimerEvent,
  Vector3D,
  ColorTransform,
  AssetLibrary,
  URLRequest,
  RequestAnimationFrame,
  Timer,
} from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { BitmapImage2D, ImageSampler, BlendMode } from '@awayjs/stage';
import {
  ParticleAnimationSet,
  ParticleAnimator,
  ParticlePropertiesMode,
  ParticleBillboardNode,
  ParticleScaleNode,
  ParticleVelocityNode,
  ParticleColorNode,
  ParticleGraphicsHelper,
  Graphics,
} from '@awayjs/graphics';
import type { ParticleProperties } from '@awayjs/graphics';
import { ElementsType, ImageTexture2D } from '@awayjs/renderer';
import { HoverController, Sprite, Scene, Camera, PrimitivePlanePrefab, DisplayObjectContainer } from '@awayjs/scene';
import { MethodMaterial, MethodMaterialMode, PointLight, DirectionalLight, StaticLightPicker } from '@awayjs/materials';

class FireVO {
  public sprite: Sprite;
  public animator: ParticleAnimator;
  public light: PointLight;
  public strength: number = 0;

  constructor(sprite: Sprite, animator: ParticleAnimator) {
    this.sprite = sprite;
    this.animator = animator;
  }
}

class BasicFire {
  private static NUM_FIRES: number = 10;

  private _scene: Scene;
  private _camera: Camera;
  private _cameraController: HoverController;
  private _planeMaterial: MethodMaterial;
  private _particleMaterial: MethodMaterial;
  private _directionalLight: DirectionalLight;
  private _lightPicker: StaticLightPicker;
  private _fireAnimationSet: ParticleAnimationSet;
  private _particleSprite: Sprite;
  private _fireTimer: Timer;
  private _plane: Sprite;
  private _fireObjects: Array<FireVO> = new Array<FireVO>();
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
    this.initParticles();
    this.initObjects();
    this.initListeners();
  }

  private initEngine(): void {
    this._scene = new Scene();
    this._camera = new Camera();
    this._scene.camera = this._camera;

    this._cameraController = new HoverController(this._camera);
    this._cameraController.distance = 1000;
    this._cameraController.minTiltAngle = 0;
    this._cameraController.maxTiltAngle = 90;
    this._cameraController.panAngle = 45;
    this._cameraController.tiltAngle = 20;
  }

  private initLights(): void {
    this._directionalLight = new DirectionalLight(new Vector3D(0, -1, 0));
    this._directionalLight.color = 0xeedddd;
    this._directionalLight.diffuse = 0.5;
    this._directionalLight.ambient = 0.5;
    this._directionalLight.specular = 0;
    this._directionalLight.ambientColor = 0x808090;

    this._lightPicker = new StaticLightPicker([this._directionalLight]);
  }

  private initMaterials(): void {
    this._planeMaterial = new MethodMaterial();
    this._planeMaterial.mode = MethodMaterialMode.MULTI_PASS;
    this._planeMaterial.lightPicker = this._lightPicker;
    this._planeMaterial.style.sampler = new ImageSampler(true, true, false);
    this._planeMaterial.specularMethod.strength = 10;

    this._particleMaterial = new MethodMaterial();
    this._particleMaterial.blendMode = BlendMode.ADD;
  }

  private initParticles(): void {
    this._fireAnimationSet = new ParticleAnimationSet(true, true);

    this._fireAnimationSet.addAnimation(new ParticleBillboardNode());
    this._fireAnimationSet.addAnimation(new ParticleScaleNode(ParticlePropertiesMode.GLOBAL, false, false, 2.5, 0.5));
    this._fireAnimationSet.addAnimation(
      new ParticleVelocityNode(ParticlePropertiesMode.GLOBAL, new Vector3D(0, 80, 0)),
    );
    this._fireAnimationSet.addAnimation(
      new ParticleColorNode(
        ParticlePropertiesMode.GLOBAL,
        true,
        true,
        false,
        false,
        new ColorTransform(0, 0, 0, 1, 0xff, 0x33, 0x01),
        new ColorTransform(0, 0, 0, 1, 0x99),
      ),
    );

    this._fireAnimationSet.addAnimation(new ParticleVelocityNode(ParticlePropertiesMode.LOCAL_STATIC));

    this._fireAnimationSet.initParticleFunc = this.initParticleFunc;

    const particlePrefab = new PrimitivePlanePrefab(null, ElementsType.TRIANGLE, 10, 10, 1, 1, false);
    particlePrefab._iValidate();
    const particle = particlePrefab.getNewObject() as Sprite;

    const graphicsSet: Array<Graphics> = new Array<Graphics>();
    for (let i = 0; i < 500; i++) graphicsSet.push(particle.graphics);

    this._particleSprite = new Sprite(null, this._particleMaterial);
    ParticleGraphicsHelper.generateGraphics(this._particleSprite.graphics, graphicsSet);
  }

  private initObjects(): void {
    this._plane = new PrimitivePlanePrefab(
      this._planeMaterial,
      ElementsType.TRIANGLE,
      1000,
      1000,
    ).getNewObject() as Sprite;
    this._plane.material = this._planeMaterial;
    this._plane.graphics.scaleUV(2, 2);
    this._plane.y = -20;

    (this._scene.container as DisplayObjectContainer).addChild(this._plane);

    for (let i = 0; i < BasicFire.NUM_FIRES; i++) {
      const particleSprite = this._particleSprite.clone();
      const animator = new ParticleAnimator(this._fireAnimationSet);
      particleSprite.animator = animator;

      const degree = (i / BasicFire.NUM_FIRES) * Math.PI * 2;
      particleSprite.x = Math.sin(degree) * 400;
      particleSprite.z = Math.cos(degree) * 400;
      particleSprite.y = 5;

      this._fireObjects.push(new FireVO(particleSprite, animator));
      (this._scene.container as DisplayObjectContainer).addChild(particleSprite);
    }

    this._fireTimer = new Timer(1000, this._fireObjects.length);
    this._fireTimer.addEventListener(TimerEvent.TIMER, (event: TimerEvent) => this.onTimer(event));
    this._fireTimer.start();
  }

  private initListeners(): void {
    window.onresize = () => this.onResize();

    document.onmousedown = (event: MouseEvent) => this.onMouseDown(event);
    document.onmouseup = () => this.onMouseUp();
    document.onmousemove = (event: MouseEvent) => this.onMouseMove(event);

    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();

    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));

    AssetLibrary.load(new URLRequest('awayjs/assets/floor_diffuse.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/floor_normal.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/floor_specular.jpg'));
    AssetLibrary.load(new URLRequest('awayjs/assets/blue.png'));
  }

  private initParticleFunc(prop: ParticleProperties): void {
    prop.startTime = Math.random() * 5;
    prop.duration = Math.random() * 4 + 0.1;

    const degree1 = Math.random() * Math.PI * 2;
    const degree2 = Math.random() * Math.PI * 2;
    const r = 15;
    prop[ParticleVelocityNode.VELOCITY_VECTOR3D] = new Vector3D(
      r * Math.sin(degree1) * Math.cos(degree2),
      r * Math.cos(degree1) * Math.cos(degree2),
      r * Math.sin(degree2),
    );
  }

  private getAllLights(): Array<any> {
    const lights: Array<any> = [this._directionalLight];

    for (let i = 0; i < this._fireObjects.length; i++) {
      const fireVO = this._fireObjects[i];
      if (fireVO.light) lights.push(fireVO.light);
    }

    return lights;
  }

  private onTimer(_event: TimerEvent): void {
    const fireObject = this._fireObjects[this._fireTimer.currentCount - 1];

    fireObject.animator.start();

    const light = new PointLight();
    light.color = 0xff3301;
    light.diffuse = 0;
    light.specular = 0;
    light.transform.moveTo(fireObject.sprite.x, fireObject.sprite.y, fireObject.sprite.z);

    fireObject.light = light;

    this._lightPicker.lights = this.getAllLights();
  }

  private onEnterFrame(dt: number): void {
    this._time += dt;

    for (let i = 0; i < this._fireObjects.length; i++) {
      const fireVO = this._fireObjects[i];
      const light = fireVO.light;

      if (!light) continue;

      if (fireVO.strength < 1) fireVO.strength += 0.1;

      light.fallOff = 380 + Math.random() * 20;
      light.radius = 200 + Math.random() * 30;
      light.diffuse = light.specular = fireVO.strength + Math.random() * 0.2;
    }

    this._scene.render();
  }

  private onResourceComplete(event: LoaderEvent): void {
    const assets: IAsset[] = event.assets;
    const length: number = assets.length;

    for (let c = 0; c < length; c++) {
      const asset: IAsset = assets[c];

      console.log(asset.name, event.url);

      switch (event.url) {
        case 'awayjs/assets/floor_diffuse.jpg':
          this._planeMaterial.ambientMethod.texture = new ImageTexture2D(asset as BitmapImage2D);
          break;
        case 'awayjs/assets/floor_normal.jpg':
          this._planeMaterial.normalMethod.texture = new ImageTexture2D(asset as BitmapImage2D);
          break;
        case 'awayjs/assets/floor_specular.jpg':
          this._planeMaterial.specularMethod.texture = new ImageTexture2D(asset as BitmapImage2D);
          break;
        case 'awayjs/assets/blue.png':
          this._particleMaterial.ambientMethod.texture = new ImageTexture2D(asset as BitmapImage2D);
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

  private onMouseUp(): void {
    this._move = false;
  }

  private onMouseMove(event: MouseEvent): void {
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

new BasicFire();
