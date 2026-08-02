import type { RigidBody2D, Shape } from '@flighthq/sdk';
import {
  addNodeChild,
  addPhysics2DBody,
  appendShapeBeginFill,
  appendShapeCircle,
  appendShapeEndFill,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  appendShapeRectangle,
  connectSignal,
  createApplication,
  createDisplayObject,
  createPhysics2DCollider,
  createPhysics2DWorld,
  createRigidBody2D,
  createShape,
  invalidateNodeLocalTransform,
  startApplicationLoop,
  stepPhysics2D,
} from '@flighthq/sdk';

import { render, scale } from './render';

const PHYSICS_SCALE = 1 / 30;
const RAD_TO_DEG = 180 / Math.PI;

// b2FixtureDef's defaults, except for density. Box2D quietly promotes a zero-mass dynamic body to a
// mass of 1; Flight derives mass strictly from collider area and density, so leaving density at 0
// here gives every dynamic body an inverse mass of 0 and nothing falls at all. A real density also
// gives them the rotational inertia Box2D's promotion skips, which is what the source demo gives up.
const DENSITY = 1;
const FRICTION = 0.2;
const RESTITUTION = 0;

const STATIC_FILL = 0xcfd8dd;
const STATIC_STROKE = 0x8b9aa4;
const DYNAMIC_FILL = 0x24afc4;
const DYNAMIC_STROKE = 0x18798a;
const STROKE_WIDTH = 2;

interface BodyView {
  body: RigidBody2D;
  node: Shape;
}

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

// Gravity is positive-y because the scene keeps the source demo's screen-space axis, where y grows
// downward. Flight's own default points the other way, for a y-up world.
const world = createPhysics2DWorld(0, 10.0);
const views: BodyView[] = [];

function place(node: Shape, body: RigidBody2D): void {
  node.x = body.x / PHYSICS_SCALE;
  node.y = body.y / PHYSICS_SCALE;
  node.rotation = body.angle * RAD_TO_DEG;
  invalidateNodeLocalTransform(node);
}

function createBox(x: number, y: number, width: number, height: number, dynamicBody: boolean): void {
  const body = createRigidBody2D(dynamicBody ? 'dynamic' : 'static', x * PHYSICS_SCALE, y * PHYSICS_SCALE);
  body.colliders.push(
    createPhysics2DCollider(
      {
        kind: 'obb',
        x: 0,
        y: 0,
        halfW: (width / 2) * PHYSICS_SCALE,
        halfH: (height / 2) * PHYSICS_SCALE,
        rotation: 0,
      },
      { density: DENSITY, friction: FRICTION, restitution: RESTITUTION },
    ),
  );
  // Mass is derived from the colliders when the body joins the world, so they have to exist first.
  addPhysics2DBody(world, body);

  const node = createShape();
  appendShapeLineStyle(node, STROKE_WIDTH, dynamicBody ? DYNAMIC_STROKE : STATIC_STROKE);
  appendShapeBeginFill(node, dynamicBody ? DYNAMIC_FILL : STATIC_FILL);
  appendShapeRectangle(node, -width / 2, -height / 2, width, height);
  appendShapeEndFill(node);
  addNodeChild(root, node);

  place(node, body);
  views.push({ body, node });
}

function createCircle(x: number, y: number, radius: number, dynamicBody: boolean): void {
  const body = createRigidBody2D(dynamicBody ? 'dynamic' : 'static', x * PHYSICS_SCALE, y * PHYSICS_SCALE);
  body.colliders.push(
    createPhysics2DCollider(
      { kind: 'circle', x: 0, y: 0, radius: radius * PHYSICS_SCALE },
      { density: DENSITY, friction: FRICTION, restitution: RESTITUTION },
    ),
  );
  addPhysics2DBody(world, body);

  const node = createShape();
  appendShapeLineStyle(node, STROKE_WIDTH, dynamicBody ? DYNAMIC_STROKE : STATIC_STROKE);
  appendShapeBeginFill(node, dynamicBody ? DYNAMIC_FILL : STATIC_FILL);
  appendShapeCircle(node, 0, 0, radius);
  appendShapeEndFill(node);
  // A spoke along the body's x axis, the only way rotation reads on a disc.
  appendShapeMoveTo(node, 0, 0);
  appendShapeLineTo(node, radius, 0);
  addNodeChild(root, node);

  place(node, body);
  views.push({ body, node });
}

createBox(250, 300, 500, 100, false);
createBox(250, 100, 100, 100, true);
createCircle(100, 100, 50, false);
createCircle(400, 100, 50, true);

const app = createApplication();
connectSignal(app.onUpdate, () => {
  // A constant step, matching the source demo's per-frame World.step(1 / 30). Advancing by the
  // frame's real delta instead would let the settle sequence differ from one run to the next, and
  // the capture harness halts on a fixed frame number rather than a fixed elapsed time.
  stepPhysics2D(world, 1 / 30);
  for (const view of views) place(view.node, view.body);
});
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
