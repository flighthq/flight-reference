import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const STARLING_URL = '/starling-tests/demo/animations/webgl/';
const FLIGHT_URL = '/starling-tests/demo/animations/flight/webgl/';

const BUTTON_CENTER_X = 160;
const START_BUTTON_CENTER_Y = 36;
const DELAY_BUTTON_CENTER_Y = 76;

const TWEEN_DURATION_MS = 2000;

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

async function clickCanvasAt(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  await page.mouse.click(box.x + x, box.y + y);
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(300);
}

async function clickStartAnimation(page: Page): Promise<void> {
  await clickCanvasAt(page, BUTTON_CENTER_X, START_BUTTON_CENTER_Y);
}

async function clickDelayedCall(page: Page): Promise<void> {
  await clickCanvasAt(page, BUTTON_CENTER_X, DELAY_BUTTON_CENTER_Y);
}

test.describe('starling animations parity', () => {
  test('initial state: flight matches starling', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    const starlingShot = await captureCanvas(page);

    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const flightShot = await captureCanvas(page);

    expect(starlingShot).toMatchSnapshot('animations-initial-starling.png', {
      maxDiffPixelRatio: 0.05,
    });
    expect(flightShot).toMatchSnapshot('animations-initial-flight.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('post-animation state: flight matches starling', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    await clickStartAnimation(page);
    await page.waitForTimeout(TWEEN_DURATION_MS + 500);
    const starlingShot = await captureCanvas(page);

    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    await clickStartAnimation(page);
    await page.waitForTimeout(TWEEN_DURATION_MS + 500);
    const flightShot = await captureCanvas(page);

    expect(starlingShot).toMatchSnapshot('animations-post-anim-starling.png', {
      maxDiffPixelRatio: 0.05,
    });
    expect(flightShot).toMatchSnapshot('animations-post-anim-flight.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('start animation changes canvas', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const before = await captureCanvas(page);
    await clickStartAnimation(page);
    await page.waitForTimeout(500);
    const during = await captureCanvas(page);

    expect(Buffer.compare(before, during), 'canvas should change after starting animation').not.toBe(0);
  });

  test('delayed call tints egg', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const before = await captureCanvas(page);
    await clickDelayedCall(page);
    await page.waitForTimeout(1500);
    const tinted = await captureCanvas(page);

    expect(Buffer.compare(before, tinted), 'canvas should change after delayed call tints egg').not.toBe(0);
  });

  test('delayed call reverts egg', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const before = await captureCanvas(page);
    await clickDelayedCall(page);
    await page.waitForTimeout(2500);
    const reverted = await captureCanvas(page);

    expect(Buffer.compare(before, reverted), 'canvas should revert to original after delayed call completes').toBe(0);
  });

  test('each transition click updates canvas', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    for (let i = 0; i < 5; i++) {
      const before = await captureCanvas(page);
      await clickStartAnimation(page);
      await page.waitForTimeout(500);
      const during = await captureCanvas(page);

      expect(Buffer.compare(before, during), `canvas should change during transition ${i + 1}`).not.toBe(0);

      await page.waitForTimeout(TWEEN_DURATION_MS);
    }
  });
});
