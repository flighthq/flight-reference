import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const STARLING_URL = '/starling-tests/demo/sprite3d/webgl/';
const FLIGHT_URL = '/starling-tests/demo/sprite3d/flight/webgl/';

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

async function isCanvasNonBlank(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let nonBlank = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
        nonBlank++;
        if (nonBlank > 100) return true;
      }
    }
    return false;
  });
}

test.describe('starling sprite3d parity', () => {
  test('starling canvas renders content', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    expect(await isCanvasNonBlank(page)).toBe(true);
  });

  test('flight canvas renders content', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    expect(await isCanvasNonBlank(page)).toBe(true);
  });

  test('canvas dimensions are 320x480', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const dims = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    });
    expect(dims).toEqual({ width: 320, height: 480 });
  });

  test('starling snapshot', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    const shot = await captureCanvas(page);
    expect(shot).toMatchSnapshot('sprite3d-starling.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('flight snapshot', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const shot = await captureCanvas(page);
    expect(shot).toMatchSnapshot('sprite3d-flight.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('starling cube animates over time', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    const first = await captureCanvas(page);
    await page.waitForTimeout(1000);
    const second = await captureCanvas(page);
    expect(Buffer.compare(first, second), 'canvas should change between frames as the cube rotates').not.toBe(0);
  });

  test('flight cube animates over time', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const first = await captureCanvas(page);
    await page.waitForTimeout(1000);
    const second = await captureCanvas(page);
    expect(Buffer.compare(first, second), 'canvas should change between frames as the cube rotates').not.toBe(0);
  });
});
