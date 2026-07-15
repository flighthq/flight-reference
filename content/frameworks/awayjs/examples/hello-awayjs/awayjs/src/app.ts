import { Vector3D, RequestAnimationFrame, AssetLibrary, URLRequest, AssetEvent } from '@awayjs/core';
import { PrimitiveSpherePrefab, DisplayObject, DisplayObjectContainer, MouseEvent, Scene } from '@awayjs/scene';
import { BasicMaterial, ImageTexture2D } from '@awayjs/materials';
import { BitmapImage2D } from '@awayjs/stage';

class Hello_AwayJS {
  private _scene: Scene;
  private _material: BasicMaterial;
  private _timer: RequestAnimationFrame;
  private _time = 0;
  private _mouseContainer: DisplayObjectContainer;

  constructor() {
    this._scene = new Scene();

    this._scene.camera.z = -600;
    this._scene.camera.y = 500;
    this._scene.camera.lookAt(new Vector3D());

    window.onresize = () => this.onResize();
    this.onResize();

    this._material = new BasicMaterial();

    this._mouseContainer = new DisplayObjectContainer();
    this._scene.root.addChild(this._mouseContainer);

    const prefab = new PrimitiveSpherePrefab(this._material);
    for (let i = 0; i < 100; i++) {
      const object: DisplayObject = prefab.getNewObject();
      object.x = Math.random() * 1000 - 500;
      object.y = Math.random() * 1000 - 500;
      object.z = Math.random() * 1000 - 500;
      this._mouseContainer.addChild(object);
    }

    this._mouseContainer.addEventListener(MouseEvent.MOUSE_DOWN, (event: MouseEvent) => this.onMouseDownEvent(event));
    this._mouseContainer.addEventListener(MouseEvent.MOUSE_UP, (event: MouseEvent) => this.onMouseUpEvent(event));

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();

    AssetLibrary.addEventListener(AssetEvent.ASSET_COMPLETE, (event: AssetEvent) => this.onAssetComplete(event));
    AssetLibrary.load(new URLRequest('awayjs/assets/floor_diffuse.jpg'));
  }

  private onEnterFrame(dt: number): void {
    this._time += dt;
    this._scene.render();
  }

  private onMouseDownEvent(event: MouseEvent): void {
    const object = event.entity as DisplayObject;
    object.scaleX = 2;
    object.scaleY = 2;
    object.scaleZ = 2;
  }

  private onMouseUpEvent(event: MouseEvent): void {
    const object = event.entity as DisplayObject;
    object.scaleX = 1;
    object.scaleY = 1;
    object.scaleZ = 1;
  }

  private onAssetComplete(event: AssetEvent): void {
    this._material.texture = new ImageTexture2D(event.asset as BitmapImage2D);
  }

  private onResize(): void {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }
}

new Hello_AwayJS();
