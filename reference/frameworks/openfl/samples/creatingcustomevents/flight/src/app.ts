import {
  addNodeChild,
  connectSignal,
  createDisplayObject,
  createSignal,
  createTextLabel,
  emitSignal,
} from '@flighthq/sdk';

import { render, scale } from './render';

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const messages: string[] = [];
const simpleEvent = createSignal<() => void>();
const typedEvent = createSignal<(value: number) => void>();

const label = createTextLabel();
label.data.textFormat = { size: 22, color: 0x222222ff };
label.x = 40;
label.y = 40;
addNodeChild(root, label);

connectSignal(simpleEvent, () => messages.push('simpleCustomEvent'));
connectSignal(typedEvent, (value) => messages.push(`typedCustomEvent customData=${value}`));
emitSignal(simpleEvent);
emitSignal(typedEvent, 100);
label.data.text = messages.join('\n');

function enterFrame(): void {
  render(root);
  requestAnimationFrame(enterFrame);
}

enterFrame();
