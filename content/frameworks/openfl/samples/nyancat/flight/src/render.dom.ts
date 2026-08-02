import type { DisplayObject } from '@flighthq/sdk';
import {
  createCanvasShapeRasterizer,
  createCanvasTextureResolvers,
  createDomRenderState,
  defaultCanvasShapeCommands,
  defaultCanvasTextureShapeCommands,
  defaultDomShapeRenderer,
  prepareScene2DRender,
  registerCanvasBitmapTextureResolver,
  registerCanvasImageTextureResolver,
  registerCanvasShapeCommands,
  registerDomShapeRasterizer,
  registerRenderer,
  renderDomBackground,
  renderDomScene2D,
  ShapeKind,
} from '@flighthq/sdk';

const container = document.createElement('div');
container.style.position = 'relative';
container.style.width = '600px';
container.style.height = '600px';
document.getElementById('app')?.remove();
document.body.appendChild(container);

export const state = createDomRenderState(container, {
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
  imageSmoothingEnabled: false,
});
const resolvers = createCanvasTextureResolvers();
registerCanvasImageTextureResolver(resolvers);
registerCanvasBitmapTextureResolver(resolvers);
registerCanvasShapeCommands(defaultCanvasShapeCommands);
registerCanvasShapeCommands(defaultCanvasTextureShapeCommands);
registerRenderer(state, ShapeKind, defaultDomShapeRenderer);
registerDomShapeRasterizer(state, createCanvasShapeRasterizer(resolvers, false));
export const scale = 1;

export function render(root: DisplayObject): void {
  if (!prepareScene2DRender(state, root)) return;
  renderDomBackground(state);
  renderDomScene2D(state, root);
}
