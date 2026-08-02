import Sprite from 'openfl/display/Sprite';
import Stage from 'openfl/display/Stage';
import Event from 'openfl/events/Event';
import { Box, Circle, Vec2, World } from 'planck';
import type { Body } from 'planck';

const PHYSICS_SCALE = 1 / 30;

// b2DebugDraw's own palette and stroke weights, so this column reads as the debug view the Haxe
// sample shows: green static bodies, pink awake dynamic bodies, grey once they fall asleep.
const STATIC_COLOR = 0x7fe57f;
const DYNAMIC_COLOR = 0xe5b2b2;
const SLEEPING_COLOR = 0x999999;
const FILL_ALPHA = 0.5;
const LINE_THICKNESS = 1;

type BodyOutline = { kind: 'box'; halfWidth: number; halfHeight: number } | { kind: 'circle'; radius: number };

class App extends Sprite {
  private physicsDebug: Sprite;
  private world: World;

  public constructor() {
    super();

    this.world = new World(new Vec2(0, 10.0));

    this.physicsDebug = new Sprite();
    this.addChild(this.physicsDebug);

    this.createBox(250, 300, 500, 100, false);
    this.createBox(250, 100, 100, 100, true);
    this.createCircle(100, 100, 50, false);
    this.createCircle(400, 100, 50, true);

    this.addEventListener(Event.ENTER_FRAME, this.this_onEnterFrame);
  }

  private createBox(x: number, y: number, width: number, height: number, dynamicBody: boolean): void {
    var halfWidth = (width / 2) * PHYSICS_SCALE;
    var halfHeight = (height / 2) * PHYSICS_SCALE;

    var body = this.world.createBody({
      type: dynamicBody ? 'dynamic' : 'static',
      position: new Vec2(x * PHYSICS_SCALE, y * PHYSICS_SCALE),
    });

    // No density, matching b2FixtureDef's default. Box2D gives a dynamic body that would weigh
    // nothing a mass of 1 and an inertia of 0, so these bodies fall but never rotate.
    body.createFixture(new Box(halfWidth, halfHeight));
    body.setUserData({ kind: 'box', halfWidth, halfHeight });
  }

  private createCircle(x: number, y: number, radius: number, dynamicBody: boolean): void {
    var scaledRadius = radius * PHYSICS_SCALE;

    var body = this.world.createBody({
      type: dynamicBody ? 'dynamic' : 'static',
      position: new Vec2(x * PHYSICS_SCALE, y * PHYSICS_SCALE),
    });

    body.createFixture(new Circle(scaledRadius));
    body.setUserData({ kind: 'circle', radius: scaledRadius });
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
}

var stage = new Stage(500, 400, 0xffffff, App, { allowHighDPI: true });
stage.element.style.width = '500px';
stage.element.style.height = '400px';
document.getElementById('app')?.remove();
document.body.appendChild(stage.element);
