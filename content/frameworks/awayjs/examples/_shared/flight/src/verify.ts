import type { GlRenderState } from '@flighthq/sdk';
import { publishFunctionalRenderSync, registerFunctionalTarget } from '@ft/verify';

/**
 * Wires an on-screen GL example for headless-capture verification and returns a per-frame hook.
 *
 * Examples render with preserveDrawingBuffer:false (so on-screen animation stays cheap and
 * artifact-free), so the capture harness can't screenshot the swapchain — it reads the frame back
 * with gl.readPixels, and that read must run in the same task as the draw. Call this once after
 * creating the render state, then call the returned hook right after presenting each frame: it
 * publishes the first non-blank frame to the harness and no-ops afterward. Outside capture
 * (window.__flightCaptureVerify unset) the hook does nothing, so it is free to leave in the loop.
 */
export function createGlFrameVerifier(state: GlRenderState): () => void {
  registerFunctionalTarget({
    kind: 'webgl',
    state,
    width: state.canvas.width,
    height: state.canvas.height,
    scale: window.devicePixelRatio || 1,
    render: () => {},
  });
  let verified = false;
  return () => {
    const captureVerify = (window as { __flightCaptureVerify?: boolean }).__flightCaptureVerify;
    if (captureVerify && !verified) verified = publishFunctionalRenderSync('webgl');
  };
}
