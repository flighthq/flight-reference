import {
  AssetEvent,
  LoaderEvent,
  Vector3D,
  AssetLibrary,
  URLRequest,
  Keyboard,
  RequestAnimationFrame,
} from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { ImageSampler } from '@awayjs/stage';
import type { BitmapImage2D } from '@awayjs/stage';
import { ElementsType, VertexAnimator, AnimationSetBase } from '@awayjs/graphics';
import type { VertexAnimationSet } from '@awayjs/graphics';
import { HoverController, Sprite, PrimitivePlanePrefab, Scene } from '@awayjs/scene';
import {
  MethodMaterial,
  ShadowFilteredMethod,
  ImageTexture2D,
  DirectionalLight,
  StaticLightPicker,
} from '@awayjs/materials';
import { MD2Parser } from '@awayjs/parsers';
import { _Render_RenderableBase } from '@awayjs/renderer';

// The AwayJS renderer has a bug where executeRender calls the animator's
// setRenderState (which binds pose vertex attributes) BEFORE the element
// _setRenderState (which disables ALL vertex attributes as an iOS workaround
// then only re-enables standard geometry attributes). This leaves animation
// pose attributes disabled, causing meshes to collapse toward the origin as
// the blend weight increases. Fix by setting element state first so the
// animator's pose bindings happen after the disable-all and survive to draw.
_Render_RenderableBase.prototype.executeRender = function (
  this: _Render_RenderableBase,
  enableDepthAndStencil?: boolean,
  surfaceSelector?: number,
  mipmapSelector?: number,
  maskConfig?: number,
): void {
  const pass = (this as any)._renderMaterial._activePass;
  const shader = pass.shader;
  const elements = (this as any).stageElements;
  if (shader.activeElements !== elements) {
    shader.activeElements = elements;
    elements._setRenderState(this, shader);
  }
  pass._setRenderState(this);
  (this as any)._stageElements.draw(this, shader, (this as any)._count, (this as any)._offset);
};

class Intermediate_PerelithKnight {
  private _spriteInitialised: boolean = false;
  private _animationSetInitialised: boolean = false;
  private _sceneInitialised: boolean = false;

  private _pKnightTextures: string[] = [
    'awayjs/assets/pknight1.png',
    'awayjs/assets/pknight2.png',
    'awayjs/assets/pknight3.png',
    'awayjs/assets/pknight4.png',
  ];
  private _pKnightMaterials: Array<MethodMaterial> = [];

  private _scene: Scene;
  private _cameraController: HoverController;

  private _light: DirectionalLight;
  private _lightPicker: StaticLightPicker;

  private _floorMaterial: MethodMaterial;
  private _shadowMapMethod: ShadowFilteredMethod;

  private _floor: Sprite;
  private _sprite: Sprite;

  private _timer: RequestAnimationFrame;
  private _time: number = 0;
  private _move: boolean = false;
  private _lastPanAngle: number;
  private _lastTiltAngle: number;
  private _lastMouseX: number;
  private _lastMouseY: number;
  private _keyUp: boolean;
  private _keyDown: boolean;
  private _keyLeft: boolean;
  private _keyRight: boolean;
  private _lookAtPosition: Vector3D = new Vector3D();
  private _animationSet: VertexAnimationSet;

  constructor() {
    this._scene = new Scene();
    this._scene.camera.projection.far = 5000;
    this._cameraController = new HoverController(this._scene.camera, null, 45, 20, 2000, 5);

    this._light = new DirectionalLight(new Vector3D(-0.5, -1, -1));
    this._light.ambient = 0.4;
    this._light.shadowMapper.epsilon = 0.2;
    this._lightPicker = new StaticLightPicker([this._light]);

    AssetLibrary.addEventListener(AssetEvent.ASSET_COMPLETE, (event: AssetEvent) => this.onAssetComplete(event));
    AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));

    AssetLibrary.load(new URLRequest('awayjs/assets/pknight1.png'));
    AssetLibrary.load(new URLRequest('awayjs/assets/pknight2.png'));
    AssetLibrary.load(new URLRequest('awayjs/assets/pknight3.png'));
    AssetLibrary.load(new URLRequest('awayjs/assets/pknight4.png'));

    AssetLibrary.load(new URLRequest('awayjs/assets/floor_diffuse.jpg'));

    AssetLibrary.load(new URLRequest('awayjs/assets/pknight.md2'), null, null, new MD2Parser());

    this._shadowMapMethod = new ShadowFilteredMethod(this._light);

    this._floorMaterial = new MethodMaterial();
    this._floorMaterial.lightPicker = this._lightPicker;
    this._floorMaterial.specularMethod.strength = 0;
    this._floorMaterial.ambientMethod.strength = 1;
    this._floorMaterial.shadowMethod = this._shadowMapMethod;
    this._floorMaterial.style.sampler = new ImageSampler(true);

    for (let i = 0; i < this._pKnightTextures.length; i++) {
      const knightMaterial = new MethodMaterial();
      knightMaterial.lightPicker = this._lightPicker;
      knightMaterial.specularMethod.gloss = 30;
      knightMaterial.specularMethod.strength = 1;
      knightMaterial.ambientMethod.strength = 1;
      knightMaterial.shadowMethod = this._shadowMapMethod;
      this._pKnightMaterials.push(knightMaterial);
    }

    this._floor = new PrimitivePlanePrefab(
      this._floorMaterial,
      ElementsType.TRIANGLE,
      5000,
      5000,
    ).getNewObject() as Sprite;
    this._floor.graphics.scaleUV(5, 5);

    this._scene.root.addChild(this._floor);

    window.onresize = () => this.onResize();

    document.onmousedown = (event: MouseEvent) => this.onMouseDown(event);
    document.onmouseup = () => this.onMouseUp();
    document.onmousemove = (event: MouseEvent) => this.onMouseMove(event);
    document.onwheel = (event: WheelEvent) => this.onWheel(event);
    document.onkeydown = (event: KeyboardEvent) => this.onKeyDown(event);
    document.onkeyup = (event: KeyboardEvent) => this.onKeyUp(event);
    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();
  }

  private onEnterFrame(dt: number): void {
    this._time += dt;

    if (this._keyUp) this._lookAtPosition.x -= 10;
    if (this._keyDown) this._lookAtPosition.x += 10;
    if (this._keyLeft) this._lookAtPosition.z -= 10;
    if (this._keyRight) this._lookAtPosition.z += 10;

    this._cameraController.lookAtPosition = this._lookAtPosition;

    this._scene.render();
  }

  private onAssetComplete(event: AssetEvent): void {
    const asset: IAsset = event.asset;

    switch (asset.assetType) {
      case Sprite.assetType:
        this._sprite = event.asset as Sprite;
        this._sprite.y = 120;
        this._sprite.transform.scaleTo(5, 5, 5);
        this._spriteInitialised = true;
        break;
      case AnimationSetBase.assetType:
        this._animationSet = event.asset as VertexAnimationSet;
        this._animationSetInitialised = true;
        break;
    }

    if (this._animationSetInitialised && this._spriteInitialised && !this._sceneInitialised) {
      this._sceneInitialised = true;
      const numWide = 20;
      const numDeep = 20;
      for (let i = 0; i < numWide; i++) {
        for (let j = 0; j < numDeep; j++) {
          const clone = this._sprite.clone() as Sprite;
          clone.x = ((i - (numWide - 1) / 2) * 5000) / numWide;
          clone.z = ((j - (numDeep - 1) / 2) * 5000) / numDeep;
          clone.castsShadows = true;
          clone.material = this._pKnightMaterials[Math.floor(Math.random() * this._pKnightMaterials.length)];
          this._scene.root.addChild(clone);

          const vertexAnimator = new VertexAnimator(this._animationSet);
          vertexAnimator.play(
            this._animationSet.animationNames[Math.floor(Math.random() * this._animationSet.animationNames.length)],
            null,
            Math.random() * 1000,
          );
          clone.animator = vertexAnimator;
        }
      }
    }
  }

  private onResourceComplete(event: LoaderEvent) {
    const assets: Array<IAsset> = event.assets;
    const length = assets.length;

    for (let c = 0; c < length; c++) {
      const asset: IAsset = assets[c];

      console.log(asset.name, event.url);

      switch (event.url) {
        case 'awayjs/assets/floor_diffuse.jpg':
          this._floorMaterial.ambientMethod.texture = new ImageTexture2D(asset as BitmapImage2D);
          break;

        case 'awayjs/assets/pknight1.png':
        case 'awayjs/assets/pknight2.png':
        case 'awayjs/assets/pknight3.png':
        case 'awayjs/assets/pknight4.png':
          this._pKnightMaterials[this._pKnightTextures.indexOf(event.url)].ambientMethod.texture = new ImageTexture2D(
            asset as BitmapImage2D,
          );
          break;

        case 'awayjs/assets/pknight.md2':
          break;
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case Keyboard.UP:
      case Keyboard.W:
      case Keyboard.Z: //fr
        this._keyUp = true;
        break;
      case Keyboard.DOWN:
      case Keyboard.S:
        this._keyDown = true;
        break;
      case Keyboard.LEFT:
      case Keyboard.A:
      case Keyboard.Q: //fr
        this._keyLeft = true;
        break;
      case Keyboard.RIGHT:
      case Keyboard.D:
        this._keyRight = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case Keyboard.UP:
      case Keyboard.W:
      case Keyboard.Z: //fr
        this._keyUp = false;
        break;
      case Keyboard.DOWN:
      case Keyboard.S:
        this._keyDown = false;
        break;
      case Keyboard.LEFT:
      case Keyboard.A:
      case Keyboard.Q: //fr
        this._keyLeft = false;
        break;
      case Keyboard.RIGHT:
      case Keyboard.D:
        this._keyRight = false;
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

  private onMouseUp(): void {
    this._move = false;
  }

  private onMouseMove(event: MouseEvent) {
    if (this._move) {
      this._cameraController.panAngle = 0.3 * (event.clientX - this._lastMouseX) + this._lastPanAngle;
      this._cameraController.tiltAngle = 0.3 * (event.clientY - this._lastMouseY) + this._lastTiltAngle;
    }
  }

  private onWheel(event: WheelEvent): void {
    this._cameraController.distance -= event.deltaY / 2;

    if (this._cameraController.distance < 100) this._cameraController.distance = 100;
    else if (this._cameraController.distance > 2000) this._cameraController.distance = 2000;
  }

  private onResize(): void {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }
}

new Intermediate_PerelithKnight();
