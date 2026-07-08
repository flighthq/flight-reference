import type { DisplayObject } from '@flighthq/sdk';
import {
  createDomRenderState,
  defaultCanvasBeginFill,
  defaultCanvasDrawRectangle,
  defaultDomShapeRenderer,
  prepareDisplayObjectRender,
  registerCanvasShapeCommands,
  registerRenderer,
  renderDomBackground,
  renderDomDisplayObject,
  ShapeKind,
} from '@flighthq/sdk';

const WIDTH = 550;
const HEIGHT = 400;
const element = document.createElement('div');
element.style.position = 'relative';
element.style.width = `${WIDTH}px`;
element.style.height = `${HEIGHT}px`;
document.body.appendChild(element);

export const container = element;
export const state = createDomRenderState(element, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, ShapeKind, defaultDomShapeRenderer);
registerCanvasShapeCommands([defaultCanvasBeginFill, defaultCanvasDrawRectangle]);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  renderDomBackground(state);
  renderDomDisplayObject(state, root);
}

export function setSize(w: number, h: number): void {
  element.style.width = `${w}px`;
  element.style.height = `${h}px`;
}
