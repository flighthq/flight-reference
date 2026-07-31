import type { DisplayObject } from '@flighthq/sdk';
import {
  createMatrix,
  createWgpuCanvasElement,
  createWgpuRenderState,
  defaultWgpuParticleEmitter2DRenderer,
  defaultWgpuQuadBatchRenderer,
  defaultWgpuRichTextRenderer,
  defaultWgpuScale9ShapeRenderer,
  defaultWgpuShapeCommands,
  defaultWgpuShapeRenderer,
  defaultWgpuSpriteRenderer,
  defaultWgpuTextLabelRenderer,
  defaultWgpuTilemapRenderer,
  enableWgpuBlendModeSupport,
  enableWgpuClipSupport,
  enableWgpuFrameCapture,
  enableWgpuRenderCache,
  ParticleEmitter2DKind,
  prepareScene2DRender,
  QuadBatchKind,
  registerStandardWgpuMaterial,
  registerRenderer,
  registerWgpuBitmapTextureResolver,
  registerWgpuImageTextureResolver,
  registerWgpuRenderTextureResolver,
  registerWgpuShapeCommands,
  renderWgpuBackground,
  renderWgpuScene2D,
  RichTextKind,
  Scale9ShapeKind,
  ShapeKind,
  SpriteKind,
  submitWgpuRenderPass,
  TextLabelKind,
  TilemapKind,
} from '@flighthq/sdk';

import type { FunctionalTargetOptions, FunctionalWgpuTarget } from './target';
import { registerFunctionalTarget } from './verify';

export async function createWgpuTarget(options: Readonly<FunctionalTargetOptions>): Promise<FunctionalWgpuTarget> {
  const { width, height } = options;
  const pixelRatio = window.devicePixelRatio || 1;

  const canvas = createWgpuCanvasElement(width, height, pixelRatio);
  document.body.appendChild(canvas);

  const state = await createWgpuRenderState(canvas, {
    pixelRatio,
    backgroundColor: options.background || 0,
    sceneGraphSyncPolicy: options.syncPolicy || 'refreshDerivedState',
  });

  state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);

  registerStandardWgpuMaterial(state);
  // Frame capture lets the verifier read the rendered frame back from the GPU; canvas presentation is
  // unavailable on the headless/software adapter, so this is the only path to the pixels.
  enableWgpuFrameCapture(state);
  // Sprites and other textured nodes resolve their texture through the backing-kind registry;
  // without a resolver the lookup returns null and the node renders nothing.
  registerWgpuBitmapTextureResolver(state);
  registerWgpuImageTextureResolver(state);
  registerWgpuRenderTextureResolver(state);
  for (const kind of options.kinds ?? []) {
    if (kind === ShapeKind) {
      registerRenderer(state, ShapeKind, defaultWgpuShapeRenderer);
      registerWgpuShapeCommands(defaultWgpuShapeCommands);
    } else if (kind === RichTextKind) {
      registerRenderer(state, RichTextKind, defaultWgpuRichTextRenderer);
    } else if (kind === TextLabelKind) {
      registerRenderer(state, TextLabelKind, defaultWgpuTextLabelRenderer);
    } else if (kind === SpriteKind) {
      registerRenderer(state, SpriteKind, defaultWgpuSpriteRenderer);
    } else if (kind === ParticleEmitter2DKind) {
      registerRenderer(state, ParticleEmitter2DKind, defaultWgpuParticleEmitter2DRenderer);
    } else if (kind === QuadBatchKind) {
      registerRenderer(state, QuadBatchKind, defaultWgpuQuadBatchRenderer);
    } else if (kind === TilemapKind) {
      registerRenderer(state, TilemapKind, defaultWgpuTilemapRenderer);
    } else if (kind === Scale9ShapeKind) {
      registerRenderer(state, Scale9ShapeKind, defaultWgpuScale9ShapeRenderer);
      registerWgpuShapeCommands(defaultWgpuShapeCommands);
    }
  }

  if (options.clip) enableWgpuClipSupport(state);
  if (options.cache) enableWgpuRenderCache(state);
  if (options.blend) enableWgpuBlendModeSupport(state);

  return registerFunctionalTarget({
    kind: 'webgpu',
    state,
    width,
    height,
    scale: pixelRatio,
    render(root: DisplayObject): void {
      if (!prepareScene2DRender(state, root)) return;
      renderWgpuBackground(state);
      renderWgpuScene2D(state, root);
      submitWgpuRenderPass(state);
    },
  });
}
