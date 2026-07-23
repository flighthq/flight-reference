import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const STARLING_URL = '/starling-tests/demo/custom-hit-test/webgl/';
const FLIGHT_URL = '/starling-tests/demo/custom-hit-test/flight/webgl/';

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

test.describe('starling custom-hit-test parity', () => {
  test('initial render: flight matches starling', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    const starlingShot = await captureCanvas(page);

    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const flightShot = await captureCanvas(page);

    expect(flightShot).toMatchSnapshot('custom-hit-test-flight.png', { maxDiffPixelRatio: 0.05 });
    expect(starlingShot).toMatchSnapshot('custom-hit-test-starling.png', { maxDiffPixelRatio: 0.05 });
  });

  test('click inside circle triggers visual change', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const before = await captureCanvas(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const scaleX = box.width / 320;
    const scaleY = box.height / 480;
    await page.mouse.click(box.x + 160 * scaleX, box.y + 240 * scaleY);
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
    await page.waitForTimeout(50);

    const after = await captureCanvas(page);

    expect(Buffer.compare(before, after), 'canvas should change after clicking inside the circle').not.toBe(0);
  });

  test('click outside circle does not trigger change', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const before = await captureCanvas(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const scaleX = box.width / 320;
    const scaleY = box.height / 480;
    await page.mouse.click(box.x + 10 * scaleX, box.y + 10 * scaleY);
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
    await page.waitForTimeout(50);

    const after = await captureCanvas(page);

    expect(Buffer.compare(before, after), 'canvas should not change after clicking outside the circle').toBe(0);
  });
});
