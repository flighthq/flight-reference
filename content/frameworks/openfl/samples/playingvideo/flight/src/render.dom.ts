import type { DisplayObject } from '@flighthq/sdk';
import {
  createDomRenderState,
  defaultDomVideoRenderer,
  prepareScene2DRender,
  registerRenderer,
  renderDomBackground,
  renderDomScene2D,
  VideoKind,
} from '@flighthq/sdk';

const element = document.createElement('div');
element.style.position = 'relative';
element.style.width = '550px';
element.style.height = '400px';
document.body.style.margin = '0';
document.body.style.background = '#fff';
document.getElementById('app')?.remove();
document.body.appendChild(element);

export const container = element;
export const state = createDomRenderState(element, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, VideoKind, defaultDomVideoRenderer);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderDomBackground(state);
  renderDomScene2D(state, root);
}

export function setSize(w: number, h: number): void {
  element.style.width = `${w}px`;
  element.style.height = `${h}px`;
}
