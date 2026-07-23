import { LoaderEvent, Vector3D, ColorTransform, AssetLibrary, URLRequest, RequestAnimationFrame } from '@awayjs/core';
import type { BitmapImage2D } from '@awayjs/stage';
import {
  ElementsType,
  ParticleAnimator,
  ParticleAnimationSet,
  ParticlePropertiesMode,
  ParticleBillboardNode,
  ParticleBezierCurveNode,
  ParticleInitialColorNode,
  ParticlePositionNode,
  ParticleGraphicsHelper,
} from '@awayjs/graphics';
import type { Graphics, ParticleProperties } from '@awayjs/graphics';
import { Scene, Camera, Sprite, HoverController, PrimitivePlanePrefab } from '@awayjs/scene';
import type { DisplayObjectContainer } from '@awayjs/scene';
import { PointLight, StaticLightPicker, MethodMaterial } from '@awayjs/materials';
import type { View } from '@awayjs/view';

class Intermediate_ParticleExplosions {
  private static PARTICLE_SIZE: number = 2;
  private static NUM_ANIMATORS: number = 4;

  private _scene: Scene;
  private _camera: Camera;
  private _view: View;
  private _root: DisplayObjectContainer;
  private _cameraController: HoverController;

  private _greenLight: PointLight;
  private _blueLight: PointLight;
  private _lightPicker: StaticLightPicker;

  private _chromeBitmapImage2D: BitmapImage2D;
  private _firefoxBitmapImage2D: BitmapImage2D;
  private _ieBitmapImage2D: BitmapImage2D;
  private _safariBitmapImage2D: BitmapImage2D;
  private _colorValues: Vector3D[] = [];
  private _colorPoints: Vector3D[] = [];
  private _colorChromeSeparation: number;
  private _colorFirefoxSeparation: number;
  private _colorSafariSeparation: number;

  private _colorMaterial: MethodMaterial;

  private _colorAnimationSet: ParticleAnimationSet;

  private _colorParticleSprite: Sprite;
  private _colorAnimators: Array<ParticleAnimator>;

  private _timer: RequestAnimationFrame;
  private _time: number = 0;
  private _angle: number = 0;
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
    this.initListeners();
  }

  private initEngine(): void {
    this._camera = new Camera();
    this._scene = new Scene(null, this._camera);
    this._view = this._scene.view;
    this._root = this._scene.root;
    this._cameraController = new HoverController(this._camera, null, 225, 10, 1000);
  }

  private initLights(): void {
    this._greenLight = new PointLight();
    this._greenLight.color = 0x00ff00;
    this._greenLight.ambient = 1;
    this._greenLight.fallOff = 600;
    this._greenLight.radius = 100;
    this._greenLight.specular = 2;

    this._blueLight = new PointLight();
    this._blueLight.color = 0x0000ff;
    this._blueLight.fallOff = 600;
    this._blueLight.radius = 100;
    this._blueLight.specular = 2;

    this._lightPicker = new StaticLightPicker([this._greenLight, this._blueLight]);
  }

  private initMaterials(): void {
    this._colorMaterial = new MethodMaterial(0xffffff);
    this._colorMaterial.bothSides = true;
    this._colorMaterial.lightPicker = this._lightPicker;
  }

  private initParticles(): void {
    for (let i = 0; i < this._chromeBitmapImage2D.width; i++) {
      for (let j = 0; j < this._chromeBitmapImage2D.height; j++) {
        const point = new Vector3D(
          Intermediate_ParticleExplosions.PARTICLE_SIZE * (i - this._chromeBitmapImage2D.width / 2 - 100),
          Intermediate_ParticleExplosions.PARTICLE_SIZE * (-j + this._chromeBitmapImage2D.height / 2),
        );
        const color = this._chromeBitmapImage2D.getPixel32(i, j);
        if (((color >> 24) & 0xff) > 0xb0) {
          this._colorValues.push(
            new Vector3D(((color & 0xff0000) >> 16) / 255, ((color & 0xff00) >> 8) / 255, (color & 0xff) / 255),
          );
          this._colorPoints.push(point);
        }
      }
    }

    this._colorChromeSeparation = this._colorPoints.length;

    for (let i = 0; i < this._firefoxBitmapImage2D.width; i++) {
      for (let j = 0; j < this._firefoxBitmapImage2D.height; j++) {
        const point = new Vector3D(
          Intermediate_ParticleExplosions.PARTICLE_SIZE * (i - this._firefoxBitmapImage2D.width / 2 + 100),
          Intermediate_ParticleExplosions.PARTICLE_SIZE * (-j + this._firefoxBitmapImage2D.height / 2),
        );
        const color = this._firefoxBitmapImage2D.getPixel32(i, j);
        if (((color >> 24) & 0xff) > 0xb0) {
          this._colorValues.push(
            new Vector3D(((color & 0xff0000) >> 16) / 255, ((color & 0xff00) >> 8) / 255, (color & 0xff) / 255),
          );
          this._colorPoints.push(point);
        }
      }
    }

    this._colorFirefoxSeparation = this._colorPoints.length;

    for (let i = 0; i < this._safariBitmapImage2D.width; i++) {
      for (let j = 0; j < this._safariBitmapImage2D.height; j++) {
        const point = new Vector3D(
          Intermediate_ParticleExplosions.PARTICLE_SIZE * (i - this._safariBitmapImage2D.width / 2),
          Intermediate_ParticleExplosions.PARTICLE_SIZE * (-j + this._safariBitmapImage2D.height / 2),
          -Intermediate_ParticleExplosions.PARTICLE_SIZE * 100,
        );
        const color = this._safariBitmapImage2D.getPixel32(i, j);
        if (((color >> 24) & 0xff) > 0xb0) {
          this._colorValues.push(
            new Vector3D(((color & 0xff0000) >> 16) / 255, ((color & 0xff00) >> 8) / 255, (color & 0xff) / 255),
          );
          this._colorPoints.push(point);
        }
      }
    }

    this._colorSafariSeparation = this._colorPoints.length;

    for (let i = 0; i < this._ieBitmapImage2D.width; i++) {
      for (let j = 0; j < this._ieBitmapImage2D.height; j++) {
        const point = new Vector3D(
          Intermediate_ParticleExplosions.PARTICLE_SIZE * (i - this._ieBitmapImage2D.width / 2),
          Intermediate_ParticleExplosions.PARTICLE_SIZE * (-j + this._ieBitmapImage2D.height / 2),
          Intermediate_ParticleExplosions.PARTICLE_SIZE * 100,
        );
        const color = this._ieBitmapImage2D.getPixel32(i, j);
        if (((color >> 24) & 0xff) > 0xb0) {
          this._colorValues.push(
            new Vector3D(((color & 0xff0000) >> 16) / 255, ((color & 0xff00) >> 8) / 255, (color & 0xff) / 255),
          );
          this._colorPoints.push(point);
        }
      }
    }

    this._colorAnimationSet = new ParticleAnimationSet();
    this._colorAnimationSet.addAnimation(new ParticleBillboardNode());
    this._colorAnimationSet.addAnimation(new ParticleBezierCurveNode(ParticlePropertiesMode.LOCAL_STATIC));
    this._colorAnimationSet.addAnimation(new ParticlePositionNode(ParticlePropertiesMode.LOCAL_STATIC));
    this._colorAnimationSet.addAnimation(
      new ParticleInitialColorNode(ParticlePropertiesMode.LOCAL_STATIC, true, false, new ColorTransform(0, 1, 0, 1)),
    );
    this._colorAnimationSet.initParticleFunc = this.iniColorParticleFunc;
    this._colorAnimationSet.initParticleScope = this;
  }

  private initObjects(): void {
    const plane = new PrimitivePlanePrefab(
      null,
      ElementsType.TRIANGLE,
      Intermediate_ParticleExplosions.PARTICLE_SIZE,
      Intermediate_ParticleExplosions.PARTICLE_SIZE,
      1,
      1,
      false,
    ).getNewObject() as Sprite;

    const colorGraphicsSet: Graphics[] = [];
    const len = this._colorPoints.length;
    for (let i = 0; i < len; i++) colorGraphicsSet.push(plane.graphics);

    this._colorParticleSprite = new Sprite(null, this._colorMaterial);
    ParticleGraphicsHelper.generateGraphics(this._colorParticleSprite.graphics, colorGraphicsSet);
    this._colorAnimators = new Array<ParticleAnimator>(Intermediate_ParticleExplosions.NUM_ANIMATORS);

    for (let i = 0; i < Intermediate_ParticleExplosions.NUM_ANIMATORS; i++) {
      this._colorParticleSprite = this._colorParticleSprite.clone() as Sprite;
      this._colorParticleSprite.rotationY = 45 * (i - 1);
      this._root.addChild(this._colorParticleSprite);
      this._colorAnimators[i] = new ParticleAnimator(this._colorAnimationSet);
      this._colorParticleSprite.animator = this._colorAnimators[i];
      this._root.addChild(this._colorParticleSprite);
    }
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

    AssetLibrary.load(new URLRequest('awayjs/assets/firefox.png'));
    AssetLibrary.load(new URLRequest('awayjs/assets/chrome.png'));
    AssetLibrary.load(new URLRequest('awayjs/assets/safari.png'));
    AssetLibrary.load(new URLRequest('awayjs/assets/ie.png'));
  }

  private iniColorParticleFunc(properties: ParticleProperties): void {
    properties.startTime = 0;
    properties.duration = 1;
    const degree1 = Math.random() * Math.PI * 2;
    const degree2 = Math.random() * Math.PI * 2;
    const r = 500;

    if (properties.index < this._colorChromeSeparation)
      properties[ParticleBezierCurveNode.BEZIER_END_VECTOR3D] = new Vector3D(
        300 * Intermediate_ParticleExplosions.PARTICLE_SIZE,
        0,
        0,
      );
    else if (properties.index < this._colorFirefoxSeparation)
      properties[ParticleBezierCurveNode.BEZIER_END_VECTOR3D] = new Vector3D(
        -300 * Intermediate_ParticleExplosions.PARTICLE_SIZE,
        0,
        0,
      );
    else if (properties.index < this._colorSafariSeparation)
      properties[ParticleBezierCurveNode.BEZIER_END_VECTOR3D] = new Vector3D(
        0,
        0,
        300 * Intermediate_ParticleExplosions.PARTICLE_SIZE,
      );
    else
      properties[ParticleBezierCurveNode.BEZIER_END_VECTOR3D] = new Vector3D(
        0,
        0,
        -300 * Intermediate_ParticleExplosions.PARTICLE_SIZE,
      );

    const rgb = this._colorValues[properties.index];
    properties[ParticleInitialColorNode.COLOR_INITIAL_COLORTRANSFORM] = new ColorTransform(rgb.x, rgb.y, rgb.z, 1);

    properties[ParticleBezierCurveNode.BEZIER_CONTROL_VECTOR3D] = new Vector3D(
      r * Math.sin(degree1) * Math.cos(degree2),
      r * Math.cos(degree1) * Math.cos(degree2),
      r * Math.sin(degree2),
    );
    properties[ParticlePositionNode.POSITION_VECTOR3D] = this._colorPoints[properties.index];
  }

  private onEnterFrame(dt: number): void {
    this._time += dt;

    this._cameraController.panAngle += 0.2;

    if (this._colorAnimators) {
      for (let i = 0; i < this._colorAnimators.length; i++) {
        const time = 1000 * (Math.sin(this._time / 5000 + (Math.PI * i) / 4) + 1);
        this._colorAnimators[i].update(time);
      }
    }

    this._angle += Math.PI / 180;
    this._greenLight.x = Math.sin(this._angle) * 600;
    this._greenLight.z = Math.cos(this._angle) * 600;
    this._blueLight.x = Math.sin(this._angle + Math.PI) * 600;
    this._blueLight.z = Math.cos(this._angle + Math.PI) * 600;

    this._scene.render();
  }

  private onResourceComplete(event: LoaderEvent) {
    switch (event.url) {
      case 'awayjs/assets/firefox.png':
        this._firefoxBitmapImage2D = event.assets[0] as BitmapImage2D;
        break;
      case 'awayjs/assets/chrome.png':
        this._chromeBitmapImage2D = event.assets[0] as BitmapImage2D;
        break;
      case 'awayjs/assets/ie.png':
        this._ieBitmapImage2D = event.assets[0] as BitmapImage2D;
        break;
      case 'awayjs/assets/safari.png':
        this._safariBitmapImage2D = event.assets[0] as BitmapImage2D;
        break;
    }

    if (
      this._firefoxBitmapImage2D != null &&
      this._chromeBitmapImage2D != null &&
      this._safariBitmapImage2D != null &&
      this._ieBitmapImage2D != null
    ) {
      this.initParticles();
      this.initObjects();
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
    this._view.y = 0;
    this._view.x = 0;
    this._view.width = window.innerWidth;
    this._view.height = window.innerHeight;
  }
}

new Intermediate_ParticleExplosions();
