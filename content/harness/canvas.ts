import type { DisplayObject } from '@flighthq/sdk';
import {
  createCanvasElement,
  createCanvasRenderState,
  createMatrix,
  defaultCanvasParticleEmitter2DRenderer,
  defaultCanvasQuadBatchRenderer,
  defaultCanvasRichTextRenderer,
  defaultCanvasScale9ShapeRenderer,
  defaultCanvasShapeCommands,
  defaultCanvasShapeRenderer,
  defaultCanvasSpriteRenderer,
  defaultCanvasTextLabelRenderer,
  defaultCanvasTilemapRenderer,
  enableCanvasBlendMode,
  enableCanvasClip,
  enableCanvasRenderCache,
  getCanvasRenderStateTextureResolvers,
  ParticleEmitter2DKind,
  prepareScene2DRender,
  QuadBatchKind,
  registerCanvasBitmapTextureResolver,
  registerCanvasImageTextureResolver,
  registerCanvasRenderTextureResolver,
  registerCanvasShapeCommands,
  registerRenderer,
  renderCanvasBackground,
  renderCanvasScene2D,
  RichTextKind,
  Scale9ShapeKind,
  ShapeKind,
  SpriteKind,
  TextLabelKind,
  TilemapKind,
} from '@flighthq/sdk';

import type { FunctionalCanvasTarget, FunctionalTargetOptions } from './target';
import { registerFunctionalTarget } from './verify';

export function createCanvasTarget(options: Readonly<FunctionalTargetOptions>): FunctionalCanvasTarget {
  const { width, height } = options;
  const pixelRatio = window.devicePixelRatio || 1;

  const canvas = createCanvasElement(width, height, pixelRatio);
  document.body.appendChild(canvas);

  const state = createCanvasRenderState(canvas, {
    pixelRatio,
    backgroundColor: options.background || 0,
    contextAttributes: options.contextAttributes ?? { alpha: false },
    sceneGraphSyncPolicy: options.syncPolicy || 'refreshDerivedState',
  });

  // Device transform carries DPI: the scene is authored in logical units, scaled to the backing
  // store here. See ../README.md for why this lives in renderTransform2D rather than the scene.
  state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);

  // Sprites and other textured nodes resolve their texture through the backing-kind registry;
  // without a resolver the lookup returns null and the node renders nothing.
  const textureResolvers = getCanvasRenderStateTextureResolvers(state);
  registerCanvasBitmapTextureResolver(textureResolvers);
  registerCanvasImageTextureResolver(textureResolvers);
  registerCanvasRenderTextureResolver(textureResolvers, state);
  for (const kind of options.kinds ?? []) {
    if (kind === ShapeKind) {
      registerRenderer(state, ShapeKind, defaultCanvasShapeRenderer);
      registerCanvasShapeCommands(defaultCanvasShapeCommands);
    } else if (kind === RichTextKind) {
      registerRenderer(state, RichTextKind, defaultCanvasRichTextRenderer);
    } else if (kind === TextLabelKind) {
      registerRenderer(state, TextLabelKind, defaultCanvasTextLabelRenderer);
    } else if (kind === SpriteKind) {
      registerRenderer(state, SpriteKind, defaultCanvasSpriteRenderer);
    } else if (kind === ParticleEmitter2DKind) {
      registerRenderer(state, ParticleEmitter2DKind, defaultCanvasParticleEmitter2DRenderer);
    } else if (kind === QuadBatchKind) {
      registerRenderer(state, QuadBatchKind, defaultCanvasQuadBatchRenderer);
    } else if (kind === TilemapKind) {
      registerRenderer(state, TilemapKind, defaultCanvasTilemapRenderer);
    } else if (kind === Scale9ShapeKind) {
      registerRenderer(state, Scale9ShapeKind, defaultCanvasScale9ShapeRenderer);
      // Scale9 rasterizes its nine patches through the same canvas shape commands as Shape.
      registerCanvasShapeCommands(defaultCanvasShapeCommands);
    }
  }

  if (options.clip) enableCanvasClip(state);
  if (options.cache) enableCanvasRenderCache(state);
  if (options.blend) enableCanvasBlendMode(state);

  return registerFunctionalTarget({
    kind: 'canvas',
    state,
    width,
    height,
    scale: pixelRatio,
    render(root: DisplayObject): void {
      if (!prepareScene2DRender(state, root)) return;
      renderCanvasBackground(state);
      renderCanvasScene2D(state, root);
    },
  });
}
