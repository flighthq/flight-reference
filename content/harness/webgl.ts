import type { DisplayObject } from '@flighthq/sdk';
import {
  createGlCanvasElement,
  createGlRenderState,
  createMatrix,
  defaultGlParticleEmitter2DRenderer,
  defaultGlQuadBatchRenderer,
  defaultGlRichTextRenderer,
  defaultGlScale9ShapeRenderer,
  createCanvasShapeRasterizer,
  createCanvasTextureResolvers,
  defaultGlShapeCommands,
  defaultGlShapeRenderer,
  defaultGlSpriteRenderer,
  defaultGlTextLabelRenderer,
  defaultGlTilemapRenderer,
  enableGlBlendModeSupport,
  enableGlClipSupport,
  enableGlRenderCache,
  ParticleEmitter2DKind,
  prepareScene2DRender,
  QuadBatchKind,
  registerGlStandardMaterial,
  registerGlShapeCommands,
  registerGlShapeRasterizer,
  registerRenderer,
  registerStandardGlTextureResolvers,
  renderGlBackground,
  renderGlScene2D,
  RichTextKind,
  Scale9ShapeKind,
  ShapeKind,
  SpriteKind,
  TextLabelKind,
  TilemapKind,
} from '@flighthq/sdk';

import type { FunctionalGlTarget, FunctionalTargetOptions } from './target';
import { registerFunctionalTarget } from './verify';

export function createGlTarget(options: Readonly<FunctionalTargetOptions>): FunctionalGlTarget {
  const { width, height } = options;
  const pixelRatio = window.devicePixelRatio || 1;

  const canvas = createGlCanvasElement(width, height, pixelRatio);
  document.body.appendChild(canvas);

  const state = createGlRenderState(canvas, {
    pixelRatio,
    backgroundColor: options.background || 0,
    // preserveDrawingBuffer so the verifier (and the differential/fingerprint runner) can read the
    // frame back after rendering — harmless for tests, where throughput does not matter.
    contextAttributes: { alpha: false, preserveDrawingBuffer: false, ...options.contextAttributes },
    sceneGraphSyncPolicy: options.syncPolicy || 'refreshDerivedState',
  });

  // Device transform carries DPI: the scene is authored in logical units, scaled to the backing
  // store here. See ../README.md for why this lives in renderTransform2D rather than the scene.
  state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);

  registerGlStandardMaterial(state);
  // Sprites and other textured nodes resolve their texture through the backing-kind registry;
  // without a resolver the lookup returns null and the node renders nothing.
  registerStandardGlTextureResolvers(state);
  for (const kind of options.kinds ?? []) {
    if (kind === ShapeKind) {
      registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
      registerGlShapeCommands(defaultGlShapeCommands);
      registerGlShapeRasterizer(state, createCanvasShapeRasterizer(createCanvasTextureResolvers(), true));
    } else if (kind === RichTextKind) {
      registerRenderer(state, RichTextKind, defaultGlRichTextRenderer);
    } else if (kind === TextLabelKind) {
      registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
    } else if (kind === SpriteKind) {
      registerRenderer(state, SpriteKind, defaultGlSpriteRenderer);
    } else if (kind === ParticleEmitter2DKind) {
      registerRenderer(state, ParticleEmitter2DKind, defaultGlParticleEmitter2DRenderer);
    } else if (kind === QuadBatchKind) {
      registerRenderer(state, QuadBatchKind, defaultGlQuadBatchRenderer);
    } else if (kind === TilemapKind) {
      registerRenderer(state, TilemapKind, defaultGlTilemapRenderer);
    } else if (kind === Scale9ShapeKind) {
      registerRenderer(state, Scale9ShapeKind, defaultGlScale9ShapeRenderer);
      registerGlShapeCommands(defaultGlShapeCommands);
      registerGlShapeRasterizer(state, createCanvasShapeRasterizer(createCanvasTextureResolvers(), true));
    }
  }

  if (options.clip) enableGlClipSupport(state);
  if (options.cache) enableGlRenderCache(state);
  if (options.blend) enableGlBlendModeSupport(state);

  return registerFunctionalTarget({
    kind: 'webgl',
    state,
    width,
    height,
    scale: pixelRatio,
    render(root: DisplayObject): void {
      if (!prepareScene2DRender(state, root)) return;
      renderGlBackground(state);
      renderGlScene2D(state, root);
    },
  });
}
