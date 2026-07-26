import type { DisplayObject } from '@flighthq/sdk';
import {
  BitmapKind,
  createDomRenderState,
  defaultDomBitmapRenderer,
  prepareScene2DRender,
  registerRenderer,
  renderDomBackground,
  renderDomScene2D,
} from '@flighthq/sdk';

const container = document.createElement('div');
container.style.position = 'relative';
container.style.width = '550px';
container.style.height = '400px';
document.getElementById('app')?.remove();
document.body.appendChild(container);

export const state = createDomRenderState(container, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, BitmapKind, defaultDomBitmapRenderer);
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderDomBackground(state);
  renderDomScene2D(state, root);
}
