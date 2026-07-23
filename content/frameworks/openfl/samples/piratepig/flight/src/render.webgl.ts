import { applyGaussianBlurToGl } from '@flighthq/effects-gl';
import type { DisplayObject } from '@flighthq/sdk';
import {
  beginGlRenderPass,
  BitmapKind,
  clearGlRenderTarget,
  copyMatrix,
  createGlCacheState,
  createGlRenderState,
  createGlRenderTarget,
  createRenderCache,
  defaultGlBitmapRenderer,
  defaultGlBeginFill,
  defaultGlDrawRectangle,
  defaultGlEndFill,
  defaultGlShapeRenderer,
  defaultGlTextLabelRenderer,
  destroyGlRenderTarget,
  enableGlRenderCache,
  endGlRenderPass,
  ensureGlRenderCacheTarget,
  getGlRenderCacheTarget,
  invalidateNodeLocalTransform,
  prepareDisplayObjectRender,
  refreshGlRenderCache,
  registerDefaultGlMaterial,
  registerGlShapeCommands,
  registerRenderer,
  renderGlBackground,
  renderGlDisplayObject,
  ShapeKind,
  TextLabelKind,
  useRenderCache,
  createMatrix,
} from '@flighthq/sdk';

const pixelRatio = window.devicePixelRatio || 1;
const canvas = document.createElement('canvas');
canvas.width = window.innerWidth * pixelRatio;
canvas.height = window.innerHeight * pixelRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.getElementById('app')?.remove();
document.body.appendChild(canvas);

export const container = canvas;
export const state = createGlRenderState(canvas, {
  pixelRatio,
  sceneGraphSyncPolicy: 'requiresInvalidation',
  backgroundColor: 0xffffffff,
});
registerRenderer(state, BitmapKind, defaultGlBitmapRenderer);
registerRenderer(state, ShapeKind, defaultGlShapeRenderer);
registerRenderer(state, TextLabelKind, defaultGlTextLabelRenderer);
registerGlShapeCommands([defaultGlBeginFill, defaultGlDrawRectangle, defaultGlEndFill]);
registerDefaultGlMaterial(state);
enableGlRenderCache(state);
state.renderTransform2D = createMatrix(pixelRatio, 0, 0, pixelRatio, 0, 0);
export const scale = 1;

export function setSize(w: number, h: number): void {
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

export function render(root: DisplayObject): void {
  if (!prepareDisplayObjectRender(state, root)) return;
  renderGlBackground(state);
  renderGlDisplayObject(state, root);
}

// Gl has no CSS filter. Bake the panel into a "sharp" render cache, then blur that into a
// separate "blurred" cache — the one composited in place of the node. Two caches are required
// because the blur composites over its destination (premultiplied OVER): blurring in place would
// leave the sharp bake showing through underneath. Returns a callback that re-bakes on resize.
export function applyBackgroundBlur(node: DisplayObject): () => void {
  const blurred = createRenderCache();
  useRenderCache(state, node, blurred);
  const sharp = createRenderCache();
  const cacheState = createGlCacheState(state);
  // Force a full re-bake on every refresh — the panel's own revisions do not change on resize.
  cacheState.sceneGraphSyncPolicy = 'refreshDerivedState';

  const refresh = (): void => {
    refreshGlRenderCache(cacheState, sharp, node, { padding: 30 });
    const src = getGlRenderCacheTarget(state, sharp);
    if (src === null) return;
    const out = ensureGlRenderCacheTarget(state, blurred, src.width, src.height);
    const temp = createGlRenderTarget(state, { width: src.width, height: src.height });
    // Run inside a render-pass bracket so endGlRenderPass rebinds the screen framebuffer the
    // next render() draws into; preserve on begin and clear explicitly to transparent (the pass's
    // default clear uses the background color, but the blur must composite over transparent).
    beginGlRenderPass(state, out, { preserveColor: true, preserveDepth: true });
    clearGlRenderTarget(state, out);
    clearGlRenderTarget(state, temp);
    applyGaussianBlurToGl(state, src, out, temp, { blurX: 10, blurY: 10 });
    endGlRenderPass(state);
    destroyGlRenderTarget(state, temp);
    copyMatrix(blurred.transform, sharp.transform);
    // The panel never invalidates on its own (its revisions do not change on resize), so the
    // prepare/adapt pass would otherwise skip it and keep folding the previous layout's placement
    // transform into the composite — leaving the blurred panel stale/offset from the re-laid-out
    // scene. Force the adapt fold to re-run with the new transform on the next prepare. Mirrors the
    // prepareBlurTransform()/invalidateNodeLocalTransform() step the Wgpu backend documents.
    invalidateNodeLocalTransform(node);
  };
  refresh();
  return refresh;
}
