import { LoaderEvent, Vector3D, AssetLibrary, Loader, URLRequest, Debug, RequestAnimationFrame } from '@awayjs/core';
import type { IAsset } from '@awayjs/core';
import { BitmapImage2D, ImageSampler } from '@awayjs/stage';
import { Sprite, DisplayObjectContainer, Scene } from '@awayjs/scene';
import { MethodMaterial, DirectionalLight, StaticLightPicker } from '@awayjs/materials';
import { OBJParser } from '@awayjs/parsers';

class ObjLoaderMasterChief {
  private _scene: Scene;
  private _raf: RequestAnimationFrame;
  private _sprites: Array<Sprite> = new Array<Sprite>();
  private _mat: MethodMaterial;
  private _terrainMaterial: MethodMaterial;
  private _light: DirectionalLight;
  private _spartan: DisplayObjectContainer = new DisplayObjectContainer();
  private _terrain: Sprite;
  private _spartanFlag: boolean = false;

  constructor() {
    Debug.LOG_PI_ERRORS = false;
    Debug.THROW_ERRORS = false;

    this._scene = new Scene();
    this._scene.camera.z = -50;
    this._scene.camera.y = 20;
    this._scene.camera.projection.near = 0.1;
    this._scene.view.backgroundColor = 0xcec8c6;

    this._raf = new RequestAnimationFrame(this.render, this);

    this._light = new DirectionalLight();
    this._light.color = 0xc1582d;
    this._light.direction = new Vector3D(1, 0, 0);
    this._light.ambient = 0.4;
    this._light.ambientColor = 0x85b2cd;
    this._light.diffuse = 2.8;
    this._light.specular = 1.8;

    this._spartan.transform.scaleTo(0.25, 0.25, 0.25);
    this._spartan.y = 0;
    this._scene.root.addChild(this._spartan);

    AssetLibrary.enableParser(OBJParser);

    let session: Loader;

    session = AssetLibrary.getLoader();
    session.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));
    session.load(new URLRequest('awayjs/assets/Halo_3_SPARTAN4.obj'));

    session = AssetLibrary.getLoader();
    session.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));
    session.load(new URLRequest('awayjs/assets/terrain.obj'));

    session = AssetLibrary.getLoader();
    session.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));
    session.load(new URLRequest('awayjs/assets/masterchief_base.png'));

    session = AssetLibrary.getLoader();
    session.addEventListener(LoaderEvent.LOAD_COMPLETE, (event: LoaderEvent) => this.onResourceComplete(event));
    session.load(new URLRequest('awayjs/assets/stone_tx.jpg'));

    window.onresize = () => this.onResize();

    this._raf.start();
  }

  private render() {
    if (this._terrain) this._terrain.rotationY += 0.4;

    this._spartan.rotationY += 0.4;
    this._scene.render();
  }

  public onResourceComplete(event: LoaderEvent) {
    const loader = event.target as Loader;
    const l: number = loader.baseDependency.assets.length;

    console.log('LoaderEvent.LOAD_COMPLETE', event.url, l);

    for (let c: number = 0; c < l; c++) {
      const d: IAsset = loader.baseDependency.assets[c];

      console.log(d.name, event.url);

      switch (d.assetType) {
        case Sprite.assetType:
          if (event.url === 'awayjs/assets/Halo_3_SPARTAN4.obj') {
            const sprite = d as Sprite;
            this._spartan.addChild(sprite);
            this._spartanFlag = true;
            this._sprites.push(sprite);
          } else if (event.url === 'awayjs/assets/terrain.obj') {
            this._terrain = d as Sprite;
            this._terrain.y = 98;
            this._terrain.graphics.scaleUV(20, 20);
            this._scene.root.addChild(this._terrain);
          }
          break;
        case BitmapImage2D.assetType:
          if (event.url === 'awayjs/assets/masterchief_base.png') {
            this._mat = new MethodMaterial(d as BitmapImage2D);
            this._mat.style.sampler = new ImageSampler(true, true, false);
            this._mat.lightPicker = new StaticLightPicker([this._light]);
          } else if (event.url === 'awayjs/assets/stone_tx.jpg') {
            this._terrainMaterial = new MethodMaterial(d as BitmapImage2D);
            this._terrainMaterial.style.sampler = new ImageSampler(true, true, false);
            this._terrainMaterial.lightPicker = new StaticLightPicker([this._light]);
          }
          break;
      }
    }

    if (this._terrain && this._terrainMaterial) this._terrain.material = this._terrainMaterial;

    if (this._mat && this._spartanFlag)
      for (let c: number = 0; c < this._sprites.length; c++) this._sprites[c].material = this._mat;

    this.onResize();
  }

  public onResize() {
    this._scene.view.y = 0;
    this._scene.view.x = 0;
    this._scene.view.width = window.innerWidth;
    this._scene.view.height = window.innerHeight;
  }
}

new ObjLoaderMasterChief();
