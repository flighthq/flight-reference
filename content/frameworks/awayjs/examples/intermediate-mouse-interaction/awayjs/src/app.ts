import { AssetEvent, Vector3D, AssetLibrary, URLRequest, Keyboard, RequestAnimationFrame } from '@awayjs/core';
import type { Loader } from '@awayjs/core';
import { BitmapImage2D } from '@awayjs/stage';
import { BoundingVolumeType, BasicPartition, PickGroup } from '@awayjs/view';
import type { PickingCollision, RaycastPicker, View } from '@awayjs/view';
import { ElementsType } from '@awayjs/graphics';
import {
  HoverController,
  Sprite,
  Scene,
  LineSegment,
  PrimitiveCubePrefab,
  PrimitiveCylinderPrefab,
  PrimitiveSpherePrefab,
  PrimitiveTorusPrefab,
  MouseEvent,
} from '@awayjs/scene';
import type { Camera, DisplayObjectContainer } from '@awayjs/scene';
import { MethodMaterial, BasicMaterial, PointLight, StaticLightPicker } from '@awayjs/materials';
import { OBJParser } from '@awayjs/parsers';

class Intermediate_MouseInteraction {
  private _scene: Scene;
  private _camera: Camera;
  private _view: View;
  private _root: DisplayObjectContainer;
  private _session: Loader;
  private _cameraController: HoverController;

  private _timer: RequestAnimationFrame;
  private _time: number = 0;

  private _blackMaterial: MethodMaterial;
  private _whiteMaterial: MethodMaterial;
  private _grayMaterial: MethodMaterial;
  private _blueMaterial: MethodMaterial;
  private _redMaterial: MethodMaterial;

  private _pointLight: PointLight;
  private _lightPicker: StaticLightPicker;

  private _pickingPositionTracer: Sprite;
  private _scenePositionTracer: Sprite;
  private _pickingNormalTracer: LineSegment;
  private _sceneNormalTracer: LineSegment;
  private _previoiusCollidingObject: PickingCollision;
  private _raycastPicker: RaycastPicker;
  private _head: Sprite;
  private _cubePrefab: PrimitiveCubePrefab;
  private _spherePrefab: PrimitiveSpherePrefab;
  private _cylinderPrefab: PrimitiveCylinderPrefab;
  private _torusPrefab: PrimitiveTorusPrefab;

  private _move: boolean = false;
  private _lastPanAngle: number;
  private _lastTiltAngle: number;
  private _lastMouseX: number;
  private _lastMouseY: number;
  private _tiltSpeed: number = 4;
  private _panSpeed: number = 4;
  private _distanceSpeed: number = 4;
  private _tiltIncrement: number = 0;
  private _panIncrement: number = 0;
  private _distanceIncrement: number = 0;

  private static PAINT_TEXTURE_SIZE: number = 1024;

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
    this._scene.forceMouseMove = true;
    this._camera = this._scene.camera;
    this._view = this._scene.view;
    this._root = this._scene.root;

    this._raycastPicker = PickGroup.getInstance(this._view).getRaycastPicker(this._scene.renderer.partition);
    this._raycastPicker.findClosestCollision = true;

    this._cameraController = new HoverController(this._camera, null, 180, 20, 320, 5);
  }

  private initLights(): void {
    this._pointLight = new PointLight();
    this._lightPicker = new StaticLightPicker([this._pointLight]);
  }

  private initMaterials(): void {
    this._whiteMaterial = new MethodMaterial(0xffffff);
    this._whiteMaterial.lightPicker = this._lightPicker;
    this._blackMaterial = new MethodMaterial(0x333333);
    this._blackMaterial.lightPicker = this._lightPicker;
    this._grayMaterial = new MethodMaterial(0xcccccc);
    this._grayMaterial.lightPicker = this._lightPicker;
    this._blueMaterial = new MethodMaterial(0x0000ff);
    this._blueMaterial.lightPicker = this._lightPicker;
    this._redMaterial = new MethodMaterial(0xff0000);
    this._redMaterial.lightPicker = this._lightPicker;
  }

  private initObjects(): void {
    this._pickingPositionTracer = new PrimitiveSpherePrefab(
      new MethodMaterial(0x00ff00, 0.5),
      ElementsType.TRIANGLE,
      2,
    ).getNewObject() as Sprite;
    this._pickingPositionTracer.visible = false;
    this._pickingPositionTracer.mouseEnabled = false;
    this._pickingPositionTracer.mouseChildren = false;
    this._root.addChild(this._pickingPositionTracer);

    this._scenePositionTracer = new PrimitiveSpherePrefab(
      new MethodMaterial(0x0000ff, 0.5),
      ElementsType.TRIANGLE,
      2,
    ).getNewObject() as Sprite;
    this._scenePositionTracer.visible = false;
    this._scenePositionTracer.mouseEnabled = false;
    this._root.addChild(this._scenePositionTracer);

    this._pickingNormalTracer = new LineSegment(new BasicMaterial(0xffffff), new Vector3D(), new Vector3D(), 3);
    this._pickingNormalTracer.mouseEnabled = false;
    this._pickingNormalTracer.visible = false;
    this._root.addChild(this._pickingNormalTracer);

    this._sceneNormalTracer = new LineSegment(new BasicMaterial(0xffffff), new Vector3D(), new Vector3D(), 3);
    this._sceneNormalTracer.mouseEnabled = false;
    this._sceneNormalTracer.visible = false;
    this._root.addChild(this._sceneNormalTracer);

    this._session = AssetLibrary.getLoader();
    this._session.addEventListener(AssetEvent.ASSET_COMPLETE, (event: AssetEvent) => this.onAssetComplete(event));
    this._session.load(new URLRequest('awayjs/assets/head.obj'), null, null, new OBJParser(25));

    this.createABunchOfObjects();

    this._scene.mousePicker.setIgnoreList([
      this._pickingNormalTracer,
      this._pickingPositionTracer,
      this._sceneNormalTracer,
      this._scenePositionTracer,
    ]);
    this._raycastPicker.setIgnoreList([
      this._pickingNormalTracer,
      this._pickingPositionTracer,
      this._sceneNormalTracer,
      this._scenePositionTracer,
    ]);
  }

  private onAssetComplete(event: AssetEvent): void {
    if (event.asset.isAsset(Sprite)) {
      this.initializeHeadModel(event.asset as Sprite);
    }
  }

  private initializeHeadModel(model: Sprite): void {
    this._head = model;

    const bmd: BitmapImage2D = new BitmapImage2D(
      Intermediate_MouseInteraction.PAINT_TEXTURE_SIZE,
      Intermediate_MouseInteraction.PAINT_TEXTURE_SIZE,
      false,
      0xcccccc,
    );
    const textureMaterial: MethodMaterial = new MethodMaterial(bmd);
    textureMaterial.lightPicker = this._lightPicker;
    model.material = textureMaterial;

    model.mouseEnabled = model.mouseChildren = true;
    model.partition = new BasicPartition(model);

    this.enableSpriteMouseListeners(model);

    this._root.addChild(model);
    this._scene.renderer.renderGroup.pickGroup.getAbstraction(model).shapeFlag = true;
  }

  private createABunchOfObjects(): void {
    this._cubePrefab = new PrimitiveCubePrefab(null, ElementsType.TRIANGLE, 25, 50, 25);
    this._spherePrefab = new PrimitiveSpherePrefab(null, ElementsType.TRIANGLE, 12);
    this._cylinderPrefab = new PrimitiveCylinderPrefab(null, ElementsType.TRIANGLE, 12, 12, 25);
    this._torusPrefab = new PrimitiveTorusPrefab(null, ElementsType.TRIANGLE, 12, 12);

    for (let i: number = 0; i < 40; i++) {
      const object: Sprite = this.createSimpleObject();

      object.rotationZ = 360 * Math.random();

      const r: number = 200 + 100 * Math.random();
      const azimuth: number = 2 * Math.PI * Math.random();
      const elevation: number = 0.25 * Math.PI * Math.random();
      object.x = r * Math.cos(elevation) * Math.sin(azimuth);
      object.y = r * Math.sin(elevation);
      object.z = r * Math.cos(elevation) * Math.cos(azimuth);
    }
  }

  private createSimpleObject(): Sprite {
    let sprite: Sprite;

    const randGeometry: number = Math.random();
    if (randGeometry > 0.75) {
      sprite = this._cubePrefab.getNewObject() as Sprite;
    } else if (randGeometry > 0.5) {
      sprite = this._spherePrefab.getNewObject() as Sprite;
      // better on spherical sprites with bound picking colliders
      sprite.defaultBoundingVolume = BoundingVolumeType.SPHERE;
    } else if (randGeometry > 0.25) {
      sprite = this._cylinderPrefab.getNewObject() as Sprite;
    } else {
      sprite = this._torusPrefab.getNewObject() as Sprite;
    }

    const isMouseEnabled: boolean = Math.random() > 0.25;
    sprite.mouseEnabled = sprite.mouseChildren = isMouseEnabled;

    if (isMouseEnabled) sprite.partition = new BasicPartition(sprite);

    const listensToMouseEvents: boolean = Math.random() > 0.25;
    if (isMouseEnabled && listensToMouseEvents) {
      this.enableSpriteMouseListeners(sprite);
    }

    this._root.addChild(sprite);

    this._scene.renderer.renderGroup.pickGroup.getAbstraction(sprite).shapeFlag = Boolean(Math.random() > 0.5);

    this.choseSpriteMaterial(sprite);

    return sprite;
  }

  private choseSpriteMaterial(sprite: Sprite): void {
    if (!sprite.mouseEnabled) {
      sprite.material = this._blackMaterial;
    } else {
      if (!sprite.hasEventListener(MouseEvent.MOUSE_MOVE)) {
        sprite.material = this._grayMaterial;
      } else {
        sprite.material = this._scene.renderer.renderGroup.pickGroup.getAbstraction(sprite).shapeFlag
          ? this._redMaterial
          : this._blueMaterial;
      }
    }
  }

  private initListeners(): void {
    window.onresize = () => this.onResize();

    document.onmousedown = (event) => this.onMouseDown(event);
    document.onmouseup = (event) => this.onMouseUp(event);
    document.onmousemove = (event) => this.onMouseMove(event);
    document.onwheel = (event: WheelEvent) => this.onWheel(event);
    document.onkeydown = (event: KeyboardEvent) => this.onKeyDown(event);
    document.onkeyup = (event: KeyboardEvent) => this.onKeyUp(event);

    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();
  }

  private onEnterFrame(dt: number): void {
    let pos: Vector3D = this._camera.transform.position;
    this._pointLight.transform.moveTo(pos.x, pos.y, pos.z);

    const collidingObject: PickingCollision = this._raycastPicker.getCollision(
      this._camera.transform.position,
      this._scene.camera.transform.forwardVector,
    );

    if (this._previoiusCollidingObject && this._previoiusCollidingObject != collidingObject) {
      this._scenePositionTracer.visible = this._sceneNormalTracer.visible = false;
      this._scenePositionTracer.transform.moveTo(0, 0, 0);
    }

    if (collidingObject) {
      this._scenePositionTracer.visible = this._sceneNormalTracer.visible = true;

      pos = collidingObject.entity.transform.concatenatedMatrix3D.transformVector(collidingObject.position);
      this._scenePositionTracer.transform.moveTo(pos.x, pos.y, pos.z);

      pos = this._scenePositionTracer.transform.position;
      this._sceneNormalTracer.transform.moveTo(pos.x, pos.y, pos.z);
      const normal: Vector3D = collidingObject.entity.transform.concatenatedMatrix3D.deltaTransformVector(
        collidingObject.normal,
      );
      normal.normalize();
      normal.scaleBy(25);
      this._sceneNormalTracer.endPosition = normal.clone();
    }

    this._previoiusCollidingObject = collidingObject;

    this._scene.render();
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case Keyboard.UP:
      case Keyboard.W:
        this._tiltIncrement = this._tiltSpeed;
        break;
      case Keyboard.DOWN:
      case Keyboard.S:
        this._tiltIncrement = -this._tiltSpeed;
        break;
      case Keyboard.LEFT:
      case Keyboard.A:
        this._panIncrement = this._panSpeed;
        break;
      case Keyboard.RIGHT:
      case Keyboard.D:
        this._panIncrement = -this._panSpeed;
        break;
      case Keyboard.Z:
        this._distanceIncrement = this._distanceSpeed;
        break;
      case Keyboard.X:
        this._distanceIncrement = -this._distanceSpeed;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case Keyboard.UP:
      case Keyboard.W:
      case Keyboard.DOWN:
      case Keyboard.S:
        this._tiltIncrement = 0;
        break;
      case Keyboard.LEFT:
      case Keyboard.A:
      case Keyboard.RIGHT:
      case Keyboard.D:
        this._panIncrement = 0;
        break;
      case Keyboard.Z:
      case Keyboard.X:
        this._distanceIncrement = 0;
        break;
    }
  }

  private enableSpriteMouseListeners(sprite: Sprite): void {
    sprite.addEventListener(MouseEvent.MOUSE_OVER, (event: MouseEvent) => this.onSpriteMouseOver(event));
    sprite.addEventListener(MouseEvent.MOUSE_OUT, (event: MouseEvent) => this.onSpriteMouseOut(event));
    sprite.addEventListener(MouseEvent.MOUSE_MOVE, (event: MouseEvent) => this.onSpriteMouseMove(event));
    sprite.addEventListener(MouseEvent.MOUSE_DOWN, (event: MouseEvent) => this.onSpriteMouseDown(event));
  }

  private onSpriteMouseDown(event: MouseEvent): void {}

  private onSpriteMouseOver(event: MouseEvent): void {
    const sprite: Sprite = event.entity as Sprite;
    sprite.boundsVisible = true;
    if (sprite != this._head) sprite.material = this._whiteMaterial;
    this._pickingPositionTracer.visible = this._pickingNormalTracer.visible = true;
    this.onSpriteMouseMove(event);
  }

  private onSpriteMouseOut(event: MouseEvent): void {
    const sprite: Sprite = event.entity as Sprite;
    sprite.boundsVisible = false;
    if (sprite != this._head) this.choseSpriteMaterial(sprite);
    this._pickingPositionTracer.visible = this._pickingNormalTracer.visible = false;
    this._pickingPositionTracer.transform.moveTo(0, 0, 0);
  }

  private onSpriteMouseMove(event: MouseEvent): void {
    let pos: Vector3D;

    this._pickingPositionTracer.visible = this._pickingNormalTracer.visible = true;

    pos = event.scenePosition;
    this._pickingPositionTracer.transform.moveTo(pos.x, pos.y, pos.z);

    pos = this._pickingPositionTracer.transform.position;
    this._pickingNormalTracer.transform.moveTo(pos.x, pos.y, pos.z);
    const normal: Vector3D = event.sceneNormal.clone();
    normal.scaleBy(25);
    this._pickingNormalTracer.endPosition = normal.clone();
  }

  private onMouseDown(event): void {
    this._lastPanAngle = this._cameraController.panAngle;
    this._lastTiltAngle = this._cameraController.tiltAngle;
    this._lastMouseX = event.clientX;
    this._lastMouseY = event.clientY;
    this._move = true;
  }

  private onMouseUp(event): void {
    this._move = false;
  }

  private onMouseMove(event): void {
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
    this._view.y = 0;
    this._view.x = 0;
    this._view.width = window.innerWidth;
    this._view.height = window.innerHeight;
  }
}

new Intermediate_MouseInteraction();
