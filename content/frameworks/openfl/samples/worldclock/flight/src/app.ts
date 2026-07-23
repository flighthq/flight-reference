import {
  addNodeChild,
  appendShapeBeginFill,
  appendShapeCircle,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  clearShapeCommands,
  connectSignal,
  createApplication,
  createDisplayObject,
  createShape,
  createTextLabel,
  invalidateNodeLocalTransform,
  invalidateNodeRender,
  startApplicationLoop,
} from '@flighthq/sdk';

import { render, scale, setSize } from './render';

const RADIUS = 50;

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

function createClock(labelText: string, color: number) {
  const clock = createDisplayObject();
  const face = createShape();
  const hourHand = createShape();
  const minuteHand = createShape();
  const secondHand = createShape();
  const center = createShape();
  const label = createTextLabel();

  appendShapeLineStyle(face, RADIUS / 5, color);
  appendShapeBeginFill(face, color, 0.25);
  appendShapeCircle(face, RADIUS, RADIUS, RADIUS);
  addNodeChild(clock, face);

  label.data.text = labelText;
  label.data.textFormat = { align: 'center', color: 0x000000, font: 'sans-serif', size: 18 };
  label.data.width = RADIUS * 2;
  label.x = 0;
  label.y = RADIUS * 2 + 4;
  addNodeChild(clock, label);

  addNodeChild(clock, hourHand);
  addNodeChild(clock, minuteHand);
  addNodeChild(clock, secondHand);
  addNodeChild(clock, center);
  return { center, clock, hourHand, minuteHand, secondHand };
}

const clocks = [
  { ...createClock('New York', 0xcc0000), offset: -4, x: 10, y: 10 },
  { ...createClock('London', 0x009900), offset: 1, x: 130, y: 10 },
  { ...createClock('Tokyo', 0x0000cc), offset: 9, x: 250, y: 10 },
];

for (const entry of clocks) {
  entry.clock.x = entry.x;
  entry.clock.y = entry.y;
  invalidateNodeLocalTransform(entry.clock);
  addNodeChild(root, entry.clock);
}

function updateClock(
  hourHand: ReturnType<typeof createShape>,
  minuteHand: ReturnType<typeof createShape>,
  secondHand: ReturnType<typeof createShape>,
  center: ReturnType<typeof createShape>,
  date: Date,
): void {
  const shortHand = RADIUS / 2;
  const longHand = (RADIUS * 3) / 4;

  clearShapeCommands(hourHand);
  clearShapeCommands(minuteHand);
  clearShapeCommands(secondHand);
  clearShapeCommands(center);

  let hours = date.getHours();
  if (hours >= 12) hours -= 12;
  const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = (date.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;
  const secondAngle = (date.getSeconds() / 60) * Math.PI * 2 - Math.PI / 2;

  appendShapeLineStyle(hourHand, 5, 0x000000);
  appendShapeMoveTo(hourHand, RADIUS, RADIUS);
  appendShapeLineTo(hourHand, RADIUS + Math.cos(hourAngle) * shortHand, RADIUS + Math.sin(hourAngle) * shortHand);

  appendShapeLineStyle(minuteHand, 4, 0x000000);
  appendShapeMoveTo(minuteHand, RADIUS, RADIUS);
  appendShapeLineTo(minuteHand, RADIUS + Math.cos(minuteAngle) * longHand, RADIUS + Math.sin(minuteAngle) * longHand);

  appendShapeLineStyle(secondHand, 2, 0xff0000);
  appendShapeMoveTo(secondHand, RADIUS, RADIUS);
  appendShapeLineTo(secondHand, RADIUS + Math.cos(secondAngle) * longHand, RADIUS + Math.sin(secondAngle) * longHand);
  appendShapeBeginFill(center, 0xff0000);
  appendShapeCircle(center, RADIUS, RADIUS, 4);

  invalidateNodeRender(hourHand);
  invalidateNodeRender(minuteHand);
  invalidateNodeRender(secondHand);
  invalidateNodeRender(center);
}

function dateToOffset(date: Date, offset: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getUTCHours() + offset,
    date.getMinutes(),
    date.getSeconds(),
  );
}

function updateClocks(): void {
  const now = new Date();
  for (const entry of clocks) {
    updateClock(entry.hourHand, entry.minuteHand, entry.secondHand, entry.center, dateToOffset(now, entry.offset));
  }
}

setSize(370, 140);

let lastSecond = -1;
const app = createApplication();
connectSignal(app.onUpdate, () => {
  const second = new Date().getSeconds();
  if (second !== lastSecond) {
    lastSecond = second;
    updateClocks();
  }
});
connectSignal(app.onRender, () => render(root));

updateClocks();
startApplicationLoop(app);
