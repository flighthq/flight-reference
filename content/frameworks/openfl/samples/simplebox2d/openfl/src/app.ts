import Sprite from 'openfl/display/Sprite';
import Stage from 'openfl/display/Stage';
import Event from 'openfl/events/Event';
import MouseEvent from 'openfl/events/MouseEvent';
import { Box, Circle, MouseJoint, Vec2, World } from 'planck';
import type { Body } from 'planck';

const PHYSICS_SCALE = 1 / 30;

// b2DebugDraw's own palette and stroke weights: green static bodies, pink awake dynamic bodies, grey
// once they fall asleep.
const STATIC_COLOR = 0x7fe57f;
const DYNAMIC_COLOR = 0xe5b2b2;
const SLEEPING_COLOR = 0x999999;
const FILL_ALPHA = 0.5;
const LINE_THICKNESS = 1;

// The source sample leaves density at b2FixtureDef's default of 0 and relies on Box2D promoting a
// weightless dynamic body to a mass of 1 with no rotational inertia, so nothing it drops can turn.
// Dragging is only interesting if a grabbed body can swing about the grab point, so this sample gives
// its fixtures a real density — and the Flight column uses the same one, which is what keeps the two
// halves of the comparison moving alike.
const DENSITY = 1;
const DRAG_FORCE_PER_MASS = 1000;

type BodyOutline = { kind: 'box'; halfWidth: number; halfHeight: number } | { kind: 'circle'; radius: number };

class App extends Sprite {
  private ground: Body;
  private mouseJoint: MouseJoint | null;
  private physicsDebug: Sprite;
  private world: World;

  public constructor() {
    super();

    this.world = new World(new Vec2(0, 10.0));
    this.mouseJoint = null;

    this.physicsDebug = new Sprite();
    this.addChild(this.physicsDebug);

    this.ground = this.createBox(250, 300, 500, 100, false);
    this.createBox(250, 100, 100, 100, true);
    this.createCircle(100, 100, 50, false);
    this.createCircle(400, 100, 50, true);

    this.addEventListener(Event.ENTER_FRAME, this.this_onEnterFrame);
    this.addEventListener(MouseEvent.MOUSE_DOWN, this.this_onMouseDown);
  }

  private createBox(x: number, y: number, width: number, height: number, dynamicBody: boolean): Body {
    var halfWidth = (width / 2) * PHYSICS_SCALE;
    var halfHeight = (height / 2) * PHYSICS_SCALE;

    var body = this.world.createBody({
      type: dynamicBody ? 'dynamic' : 'static',
      position: new Vec2(x * PHYSICS_SCALE, y * PHYSICS_SCALE),
    });

    body.createFixture(new Box(halfWidth, halfHeight), DENSITY);
    body.setUserData({ kind: 'box', halfWidth, halfHeight });
    return body;
  }

  private createCircle(x: number, y: number, radius: number, dynamicBody: boolean): Body {
    var scaledRadius = radius * PHYSICS_SCALE;

    var body = this.world.createBody({
      type: dynamicBody ? 'dynamic' : 'static',
      position: new Vec2(x * PHYSICS_SCALE, y * PHYSICS_SCALE),
    });

    body.createFixture(new Circle(scaledRadius), DENSITY);
    body.setUserData({ kind: 'circle', radius: scaledRadius });
    return body;
  }

  private bodyAt(point: Vec2): Body | null {
    var found: Body | null = null;

    this.world.queryAABB(
      {
        lowerBound: new Vec2(point.x - 0.001, point.y - 0.001),
        upperBound: new Vec2(point.x + 0.001, point.y + 0.001),
      },
      (fixture) => {
        var body = fixture.getBody();
        if (!body.isDynamic() || !fixture.testPoint(point)) return true;
        found = body;
        return false;
      },
    );

    return found;
  }

  private drawDebugData(): void {
    var graphics = this.physicsDebug.graphics;
    graphics.clear();

    for (var body: Body | null = this.world.getBodyList(); body !== null; body = body.getNext()) {
      var outline = body.getUserData() as BodyOutline | null;
      if (outline === null) continue;

      // Type before wakefulness, the order b2World.drawDebugData uses. A static body is never awake,
      // so testing wakefulness first would draw the ground in the sleeping colour.
      var color = body.isStatic() ? STATIC_COLOR : body.isAwake() ? DYNAMIC_COLOR : SLEEPING_COLOR;

      var position = body.getPosition();
      var angle = body.getAngle();
      var x = position.x / PHYSICS_SCALE;
      var y = position.y / PHYSICS_SCALE;

      graphics.lineStyle(LINE_THICKNESS, color);
      graphics.beginFill(color, FILL_ALPHA);

      if (outline.kind === 'circle') {
        var radius = outline.radius / PHYSICS_SCALE;
        graphics.drawCircle(x, y, radius);
        graphics.endFill();

        // b2DebugDraw lays the body's x axis across the disc, which is the only way rotation reads
        // on a circle.
        graphics.moveTo(x, y);
        graphics.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      } else {
        var halfWidth = outline.halfWidth / PHYSICS_SCALE;
        var halfHeight = outline.halfHeight / PHYSICS_SCALE;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        var corners = [
          [-halfWidth, -halfHeight],
          [halfWidth, -halfHeight],
          [halfWidth, halfHeight],
          [-halfWidth, halfHeight],
        ];

        for (var i = 0; i < corners.length; i++) {
          var cornerX = x + corners[i][0] * cos - corners[i][1] * sin;
          var cornerY = y + corners[i][0] * sin + corners[i][1] * cos;
          if (i === 0) graphics.moveTo(cornerX, cornerY);
          else graphics.lineTo(cornerX, cornerY);
        }

        graphics.lineTo(x + corners[0][0] * cos - corners[0][1] * sin, y + corners[0][0] * sin + corners[0][1] * cos);
        graphics.endFill();
      }
    }
  }

  // Event Handlers

  private this_onEnterFrame = (event: Event): void => {
    this.world.step(1 / 30, 10, 10);
    this.world.clearForces();
    this.drawDebugData();
  };

  private this_onMouseDown = (event: MouseEvent): void => {
    var point = new Vec2(event.stageX * PHYSICS_SCALE, event.stageY * PHYSICS_SCALE);
    var body = this.bodyAt(point);
    if (body === null) return;

    body.setAwake(true);
    this.mouseJoint = this.world.createJoint(
      new MouseJoint({ maxForce: DRAG_FORCE_PER_MASS * body.getMass() }, this.ground, body, point),
    );

    this.stage.addEventListener(MouseEvent.MOUSE_MOVE, this.stage_onMouseMove);
    this.stage.addEventListener(MouseEvent.MOUSE_UP, this.stage_onMouseUp);
  };

  private stage_onMouseMove = (event: MouseEvent): void => {
    this.mouseJoint?.setTarget(new Vec2(event.stageX * PHYSICS_SCALE, event.stageY * PHYSICS_SCALE));
  };

  private stage_onMouseUp = (event: MouseEvent): void => {
    if (this.mouseJoint !== null) {
      this.world.destroyJoint(this.mouseJoint);
      this.mouseJoint = null;
    }

    this.stage.removeEventListener(MouseEvent.MOUSE_MOVE, this.stage_onMouseMove);
    this.stage.removeEventListener(MouseEvent.MOUSE_UP, this.stage_onMouseUp);
  };
}

var stage = new Stage(800, 600, 0xffffff, App, { allowHighDPI: true });
stage.element.style.width = '800px';
stage.element.style.height = '600px';
document.getElementById('app')?.remove();
document.body.appendChild(stage.element);
