import { connectSignal, createDisplayObject, createSignal, emitSignal } from '@flighthq/sdk';

import { render, scale } from './render';

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const simpleEvent = createSignal<() => void>();
const typedEvent = createSignal<(value: number) => void>();

connectSignal(simpleEvent, () => console.log('simpleCustomEvent'));
connectSignal(typedEvent, (value) => console.log(`typedCustomEvent customData=${value}`));
emitSignal(simpleEvent);
emitSignal(typedEvent, 100);

render(root);
