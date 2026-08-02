import type { Physics2DMouseJoint, RigidBody2D, Shape } from '@flighthq/sdk';
import {
  addNodeChild,
  addPhysics2DBody,
  addPhysics2DJoint,
  appendShapeBeginFill,
  appendShapeCircle,
  appendShapeEndFill,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  appendShapeRectangle,
  clearShapeCommands,
  connectSignal,
  createApplication,
  createDisplayObject,
  createPhysics2DCollider,
  createPhysics2DMouseJoint,
  createPhysics2DQueryResult,
  createPhysics2DWorld,
  createRigidBody2D,
  createShape,
  invalidateNodeLocalTransform,
  Physics2DMouseJointKind,
  physics2DMouseJointSolver,
  queryPhysics2DPoint,
  registerPhysics2DJointSolver,
  removePhysics2DJoint,
  startApplicationLoop,
  stepPhysics2D,
  wakePhysics2DBody,
} from '@flighthq/sdk';

import { canvas, render, scale } from './render';

const PHYSICS_SCALE = 1 / 30;
const RAD_TO_DEG = 180 / Math.PI;

// b2DebugDraw's palette, so this column reads as the same debug view as the OpenFL one.
const STATIC_COLOR = 0x7fe57f;
const DYNAMIC_COLOR = 0xe5b2b2;
const SLEEPING_COLOR = 0x999999;
const FILL_ALPHA = 0.5;
const LINE_THICKNESS = 1;

// b2FixtureDef's defaults, except for density. Box2D promotes a zero-mass dynamic body to a mass of 1
// with no rotational inertia; Flight derives mass strictly from collider area and density and does
// not promote, so a density of 0 here gives every dynamic body an inverse mass of 0 and nothing falls
// at all. The OpenFL column sets the same density rather than leaning on Box2D's promotion, which is
// what keeps a dragged body swinging the same way in both.
const DENSITY = 1;
const FRICTION = 0.2;
const RESTITUTION = 0;

// Box2D's testbed drag is a 5 Hz spring at 0.7 damping, bounded by a force proportional to the body's
// own mass so heavy things are no harder to move than light ones. The force bound and damping carry
// over directly, but the stiffness does not: Flight's mouse joint reaches the right answer only where
// its softness term is small, and below about 15 the response inverts and throws the body instead of
// following it. 20 tracks the cursor to a few pixels with room above that floor, where the OpenFL
// column's true 5 Hz spring trails by about ten. createPhysics2DMouseJoint defaults stiffness to 5,
// inside that unstable band, so it is always passed explicitly here.
const DRAG_FORCE_PER_MASS = 1000;
const DRAG_STIFFNESS = 20;
const DRAG_DAMPING = 0.7;

interface BodyView {
  body: RigidBody2D;
  node: Shape;
  outline: { kind: 'box'; width: number; height: number } | { kind: 'circle'; radius: number };
  color: number;
}

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

// Gravity is positive-y because the scene keeps the source demo's screen-space axis, where y grows
// downward. Flight's own default points the other way, for a y-up world.
const world = createPhysics2DWorld(0, 10.0);
registerPhysics2DJointSolver(world, Physics2DMouseJointKind, physics2DMouseJointSolver);

const views: BodyView[] = [];

function paint(view: BodyView, color: number): void {
  const node = view.node;
  clearShapeCommands(node);
  appendShapeLineStyle(node, LINE_THICKNESS, color);
  appendShapeBeginFill(node, color, FILL_ALPHA);

  if (view.outline.kind === 'circle') {
    appendShapeCircle(node, 0, 0, view.outline.radius);
    appendShapeEndFill(node);
    // b2DebugDraw lays the body's x axis across the disc, the only way rotation reads on a circle.
    appendShapeMoveTo(node, 0, 0);
    appendShapeLineTo(node, view.outline.radius, 0);
  } else {
    const { width, height } = view.outline;
    appendShapeRectangle(node, -width / 2, -height / 2, width, height);
    appendShapeEndFill(node);
  }

  view.color = color;
}

function bodyColor(body: RigidBody2D): number {
  if (body.type === 'static') return STATIC_COLOR;
  return body.sleeping ? SLEEPING_COLOR : DYNAMIC_COLOR;
}

function addView(body: RigidBody2D, outline: BodyView['outline']): void {
  const view: BodyView = { body, node: createShape(), outline, color: 0 };
  paint(view, bodyColor(body));
  addNodeChild(root, view.node);
  place(view);
  views.push(view);
}

function place(view: BodyView): void {
  view.node.x = view.body.x / PHYSICS_SCALE;
  view.node.y = view.body.y / PHYSICS_SCALE;
  view.node.rotation = view.body.angle * RAD_TO_DEG;
  invalidateNodeLocalTransform(view.node);
}

function createBox(x: number, y: number, width: number, height: number, dynamicBody: boolean): RigidBody2D {
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
  addView(body, { kind: 'box', width, height });
  return body;
}

function createCircle(x: number, y: number, radius: number, dynamicBody: boolean): RigidBody2D {
  const body = createRigidBody2D(dynamicBody ? 'dynamic' : 'static', x * PHYSICS_SCALE, y * PHYSICS_SCALE);
  body.colliders.push(
    createPhysics2DCollider(
      { kind: 'circle', x: 0, y: 0, radius: radius * PHYSICS_SCALE },
      { density: DENSITY, friction: FRICTION, restitution: RESTITUTION },
    ),
  );
  addPhysics2DBody(world, body);
  addView(body, { kind: 'circle', radius });
  return body;
}

createBox(250, 300, 500, 100, false);
createBox(250, 100, 100, 100, true);
createCircle(100, 100, 50, false);
createCircle(400, 100, 50, true);

const query = createPhysics2DQueryResult();

function bodyAt(worldX: number, worldY: number): RigidBody2D | null {
  queryPhysics2DPoint(world, worldX, worldY, query);

  for (let i = 0; i < query.hitCount; i++) {
    const body = query.hits[i].body;
    if (body.type === 'dynamic') return body;
  }

  return null;
}

let drag: Physics2DMouseJoint | null = null;

function pointerWorld(event: PointerEvent): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / scale) * PHYSICS_SCALE,
    y: ((event.clientY - bounds.top) / scale) * PHYSICS_SCALE,
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const point = pointerWorld(event);
  const body = bodyAt(point.x, point.y);
  if (body === null) return;

  // A sleeping body is skipped by the joint solver, so grabbing one has to wake it first.
  wakePhysics2DBody(body);

  const cos = Math.cos(body.angle);
  const sin = Math.sin(body.angle);
  const offsetX = point.x - body.x;
  const offsetY = point.y - body.y;

  // The anchor is given in the body's own frame, so the grab point has to be rotated out of world
  // space by the body's current angle.
  const joint = createPhysics2DMouseJoint({
    body: body.index,
    targetX: point.x,
    targetY: point.y,
    maxForce: DRAG_FORCE_PER_MASS * body.mass,
    localAnchorX: offsetX * cos + offsetY * sin,
    localAnchorY: -offsetX * sin + offsetY * cos,
    stiffness: DRAG_STIFFNESS,
    damping: DRAG_DAMPING,
  });

  addPhysics2DJoint(world, joint);
  drag = joint;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (drag === null) return;
  const point = pointerWorld(event);
  drag.targetX = point.x;
  drag.targetY = point.y;
});

function endDrag(): void {
  if (drag === null) return;
  removePhysics2DJoint(world, drag);
  drag = null;
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

const app = createApplication();
connectSignal(app.onUpdate, () => {
  // A constant step, matching the source demo's per-frame World.step(1 / 30). Advancing by the
  // frame's real delta instead would let the settle sequence differ from one run to the next, and
  // the capture harness halts on a fixed frame number rather than a fixed elapsed time.
  stepPhysics2D(world, 1 / 30);

  for (const view of views) {
    place(view);
    const color = bodyColor(view.body);
    if (color !== view.color) paint(view, color);
  }
});
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
