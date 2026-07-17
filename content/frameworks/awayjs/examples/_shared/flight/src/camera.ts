import type { Camera, Vector3Like } from '@flighthq/sdk';
import {
  createCamera,
  createPerspectiveProjection,
  createVector3,
  DEG_TO_RAD,
  setCameraViewMatrix4FromLookAt,
} from '@flighthq/sdk';

// AwayJS uses a left-handed coordinate system (+Z into screen).
// Flight uses right-handed (+Z out of screen). These helpers accept
// AwayJS-convention values and produce correct Flight equivalents
// so the original numbers stay readable in the call site.

export interface AwayPerspectiveCameraOptions {
  x?: number;
  y?: number;
  z?: number;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  fov?: number;
  near?: number;
  far?: number;
  aspect?: number;
}

export function createCameraFromAway(opts: Readonly<AwayPerspectiveCameraOptions>): Camera {
  const fovDeg = opts.fov ?? 60;
  const near = opts.near ?? 0.1;
  const far = opts.far ?? 5000;
  const aspect = opts.aspect ?? window.innerWidth / window.innerHeight;

  const camera = createCamera({
    near,
    far,
    projection: createPerspectiveProjection({
      fovY: fovDeg * DEG_TO_RAD,
      aspect,
    }),
  });

  const eye = createVector3(opts.x ?? 0, opts.y ?? 0, -(opts.z ?? 0));
  const target = createVector3(opts.targetX ?? 0, opts.targetY ?? 0, -(opts.targetZ ?? 0));
  const up = createVector3(0, 1, 0);
  setCameraViewMatrix4FromLookAt(camera, eye, target, up);

  return camera;
}

export interface AwayOrbitOptions {
  distance: number;
  panAngle?: number;
  tiltAngle?: number;
  minTiltAngle?: number;
  maxTiltAngle?: number;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  mouseSensitivity?: number;
}

export interface OrbitController {
  readonly camera: Camera;
  readonly eye: Vector3Like;
  readonly target: Vector3Like;
  readonly up: Vector3Like;
  distance: number;
  panAngle: number;
  tiltAngle: number;
  update(): void;
}

export function createOrbitControllerFromAway(camera: Camera, opts: Readonly<AwayOrbitOptions>): OrbitController {
  const minTilt = (opts.minTiltAngle ?? -90) * DEG_TO_RAD;
  const maxTilt = (opts.maxTiltAngle ?? 90) * DEG_TO_RAD;

  const eye = createVector3(0, 0, 0);
  const target = createVector3(opts.targetX ?? 0, opts.targetY ?? 0, -(opts.targetZ ?? 0));
  const up = createVector3(0, 1, 0);

  const controller: OrbitController = {
    camera,
    eye,
    target,
    up,
    distance: opts.distance,
    panAngle: (opts.panAngle ?? 0) * DEG_TO_RAD,
    tiltAngle: (opts.tiltAngle ?? 0) * DEG_TO_RAD,

    update() {
      const clamped = Math.max(minTilt, Math.min(maxTilt, this.tiltAngle));
      this.tiltAngle = clamped;

      eye.x = target.x + this.distance * Math.sin(this.panAngle) * Math.cos(clamped);
      eye.y = target.y + this.distance * Math.sin(clamped);
      eye.z = target.z - this.distance * Math.cos(this.panAngle) * Math.cos(clamped);

      setCameraViewMatrix4FromLookAt(camera, eye, target, up);
    },
  };

  controller.update();
  return controller;
}

export const AWAY_MOUSE_SENSITIVITY = 0.3 * DEG_TO_RAD;

export interface AwayFirstPersonOptions {
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  pitch?: number;
  minPitch?: number;
  maxPitch?: number;
}

export interface FirstPersonController {
  readonly camera: Camera;
  readonly position: Vector3Like;
  yaw: number;
  pitch: number;
  update(): void;
  forward(out: Vector3Like): void;
  right(out: Vector3Like): void;
}

export function createFirstPersonControllerFromAway(
  camera: Camera,
  opts: Readonly<AwayFirstPersonOptions>,
): FirstPersonController {
  const minPitch = (opts.minPitch ?? -80) * DEG_TO_RAD;
  const maxPitch = (opts.maxPitch ?? 80) * DEG_TO_RAD;

  const pos = createVector3(opts.x ?? 0, opts.y ?? 0, -(opts.z ?? 0));
  const eye = createVector3(0, 0, 0);
  const up = createVector3(0, 1, 0);

  const controller: FirstPersonController = {
    camera,
    position: pos,
    yaw: (opts.yaw ?? 0) * DEG_TO_RAD,
    pitch: (opts.pitch ?? 0) * DEG_TO_RAD,

    update() {
      this.pitch = Math.max(minPitch, Math.min(maxPitch, this.pitch));

      eye.x = pos.x + Math.sin(this.yaw) * Math.cos(this.pitch);
      eye.y = pos.y - Math.sin(this.pitch);
      eye.z = pos.z - Math.cos(this.yaw) * Math.cos(this.pitch);

      setCameraViewMatrix4FromLookAt(camera, pos, eye, up);
    },

    forward(out: Vector3Like) {
      out.x = Math.sin(this.yaw);
      out.y = 0;
      out.z = -Math.cos(this.yaw);
    },

    right(out: Vector3Like) {
      out.x = Math.cos(this.yaw);
      out.y = 0;
      out.z = Math.sin(this.yaw);
    },
  };

  controller.update();
  return controller;
}

export function awayDirection(x: number, y: number, z: number): { x: number; y: number; z: number } {
  return { x, y, z: -z };
}

export function awayPosition(x: number, y: number, z: number): [number, number, number] {
  return [x, y, -z];
}
