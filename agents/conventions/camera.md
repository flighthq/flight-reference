# Camera & Coordinate Conversion (AwayJS → Flight)

Read this before porting camera setup or object/light positions from AwayJS demos.

## Why values differ

AwayJS uses a **left-handed** coordinate system where **+Z goes into the screen**. Flight uses a **right-handed** system where **+Z comes out of the screen** (toward the viewer). Every Z coordinate must be negated when porting.

AwayJS specifies angles in **degrees**. Flight uses **radians**.

## Conversion helpers

Use the helpers in `content/frameworks/awayjs/examples/_shared/flight/src/camera.ts` instead of converting manually. They accept AwayJS-convention values and produce correct Flight equivalents.

### Camera creation

`createCameraFromAway({ x, y, z, fov, near, far })` — pass the AwayJS camera position and FOV in degrees. The helper negates Z and converts FOV to radians.

```ts
// AwayJS: camera.z = -600; camera.y = 500; (default 60° FOV)
const camera = createCameraFromAway({ z: -600, y: 500, fov: 60 });
```

### Orbit camera (HoverController)

`createOrbitControllerFromAway(camera, { distance, panAngle, tiltAngle, ... })` — pass AwayJS HoverController values (angles in degrees). Returns a controller with `update()`, `panAngle`, `tiltAngle`, and `distance` properties.

```ts
// AwayJS: distance=1000, panAngle=45, tiltAngle=20, minTilt=0, maxTilt=90
const orbit = createOrbitControllerFromAway(camera, {
  distance: 1000,
  panAngle: 45,
  tiltAngle: 20,
  minTiltAngle: 0,
  maxTiltAngle: 90,
});
```

Mouse sensitivity: use `AWAY_MOUSE_SENSITIVITY` (equivalent to AwayJS's `0.3` degree-based multiplier, pre-converted to radians).

### First-person camera (FirstPersonController)

`createFirstPersonControllerFromAway(camera, { x, y, z, yaw, pitch, ... })` — pass AwayJS position and angles in degrees. Returns a controller with `update()`, `position`, `yaw`, `pitch`, `forward()`, and `right()`.

### Positions and directions

- `awayPosition(x, y, z)` → `[x, y, -z]` — use with `translateMatrix4(...spread)`.
- `awayDirection(x, y, z)` → `{ x, y, z: -z }` — use for light directions, etc.

For animated/computed values where Z changes each frame, negate Z inline (the helpers are for static AwayJS literals).

## Quick checklist

1. Use `createCameraFromAway` — pass AwayJS FOV in degrees, position with AwayJS Z convention.
2. Use `createOrbitControllerFromAway` instead of inline spherical-to-Cartesian math.
3. Use `awayPosition(x, y, z)` for object placement — values match the AwayJS source.
4. Use `awayDirection(x, y, z)` for light directions.
5. Preserve AwayJS FOV values (don't silently change 60° to 45°).
6. For animated directions, negate Z inline with a comment referencing the handedness flip.
