import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

export const test = base.extend<{ deterministicPage: Page }>({
  deterministicPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      let seed = 0x9e3779b9 >>> 0;
      Math.random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };

      const realGetContext = HTMLCanvasElement.prototype.getContext as (
        this: HTMLCanvasElement,
        type: string,
        attrs?: Record<string, unknown>,
      ) => RenderingContext | null;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        attrs?: Record<string, unknown>,
      ) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return realGetContext.call(this, type, { ...attrs, preserveDrawingBuffer: true });
        }
        return realGetContext.call(this, type, attrs);
      } as typeof HTMLCanvasElement.prototype.getContext;

      let count = 0;
      const realRAF = window.requestAnimationFrame.bind(window);
      (window as unknown as { __captureFramesReached?: boolean }).__captureFramesReached = false;
      window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
        realRAF((time) => {
          if (count >= 2) return;
          count++;
          if (count >= 2) {
            (window as unknown as { __captureFramesReached?: boolean }).__captureFramesReached = true;
          }
          callback(time);
        });
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export async function waitForStableFrame(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page
    .waitForFunction(
      () => (window as unknown as { __captureFramesReached?: boolean }).__captureFramesReached === true,
      null,
      { timeout: 10_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(200);
}

export async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}
