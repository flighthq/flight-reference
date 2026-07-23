import {
  AssetEvent,
  Vector3D,
  AssetLibrary,
  URLRequest,
  RequestAnimationFrame,
  PerspectiveProjection,
  Keyboard,
} from '@awayjs/core';
import { AnimationNodeBase } from '@awayjs/renderer';
import {
  AnimatorBase,
  SkeletonAnimator,
  SkeletonClipNode,
  CrossfadeTransition,
  AnimationStateEvent,
} from '@awayjs/graphics';
import { HoverController, LoaderContainer, Scene } from '@awayjs/scene';
import { AWDParser } from '@awayjs/parsers';

class IntermediateAWDViewer {
  private _scene: Scene;
  private _cameraController: HoverController;
  private _animator: SkeletonAnimator;
  private _timer: RequestAnimationFrame;
  private _time: number = 0;
  private _lastPanAngle: number;
  private _lastTiltAngle: number;
  private _lastMouseX: number;
  private _lastMouseY: number;
  private _move: boolean;
  private _stateTransition: CrossfadeTransition = new CrossfadeTransition(0.5);
  private static IDLE_NAME: string = 'idle';

  constructor() {
    this.init();
  }

  private init(): void {
    this.initEngine();
    this.initObjects();
    this.initListeners();
  }

  private initEngine(): void {
    this._scene = new Scene();
    this._scene.view.backgroundColor = 0x333338;

    this._scene.camera.projection = new PerspectiveProjection(70);
    this._scene.camera.projection.far = 5000;
    this._scene.camera.projection.near = 1;

    this._cameraController = new HoverController(this._scene.camera, null, 0, 0, 150, 10, 90);
    this._cameraController.lookAtPosition = new Vector3D(0, 60, 0);
    this._cameraController.tiltAngle = 0;
    this._cameraController.panAngle = 0;
    this._cameraController.minTiltAngle = 5;
    this._cameraController.maxTiltAngle = 60;
    this._cameraController.autoUpdate = false;
  }

  private initObjects(): void {
    AssetLibrary.enableParser(AWDParser);

    const loader = new LoaderContainer();
    loader.addEventListener(AssetEvent.ASSET_COMPLETE, (event: AssetEvent) => this.onAssetComplete(event));

    loader.load(new URLRequest('awayjs/assets/shambler.awd'));

    this._scene.root.addChild(loader);
  }

  private initListeners(): void {
    window.onresize = () => this.onResize();

    document.onmousedown = (event: MouseEvent) => this.onMouseDown(event);
    document.onmouseup = () => this.onMouseUp();
    document.onmousemove = (event: MouseEvent) => this.onMouseMove(event);
    document.onwheel = (event: WheelEvent) => this.onWheel(event);
    document.onkeydown = (event: KeyboardEvent) => this.onKeyDown(event);

    this.onResize();

    this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
    this._timer.start();
  }

  private onAssetComplete(event: AssetEvent): void {
    if (event.asset.isAsset(AnimatorBase)) {
      this._animator = event.asset as SkeletonAnimator;
      this._animator.play(IntermediateAWDViewer.IDLE_NAME);
    } else if (event.asset.isAsset(AnimationNodeBase)) {
      const node = event.asset as SkeletonClipNode;

      if (node.name === IntermediateAWDViewer.IDLE_NAME) {
        node.looping = true;
      } else {
        node.looping = false;
        node.addEventListener(AnimationStateEvent.PLAYBACK_COMPLETE, (event: AnimationStateEvent) =>
          this.onPlaybackComplete(event),
        );
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.keyCode) {
      case Keyboard.NUMBER_1:
        this.playAction('attack01');
        break;
      case Keyboard.NUMBER_2:
        this.playAction('attack02');
        break;
      case Keyboard.NUMBER_3:
        this.playAction('attack03');
        break;
      case Keyboard.NUMBER_4:
        this.playAction('attack04');
        break;
      case Keyboard.NUMBER_5:
        this.playAction('attack05');
        break;
    }
  }

  private playAction(name: string): void {
    this._animator.play(name, this._stateTransition, 0);
  }

  private onPlaybackComplete(event: AnimationStateEvent): void {
    if (this._animator.activeState !== event.animationState) return;

    this._animator.play(IntermediateAWDViewer.IDLE_NAME, this._stateTransition);
  }

  private onEnterFrame(dt: number): void {
    this._time += dt;

    this._cameraController.update();

    this._scene.render();
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

new IntermediateAWDViewer();
