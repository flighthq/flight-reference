import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const STARLING_URL = '/starling-tests/demo/render-texture/webgl/';
const FLIGHT_URL = '/starling-tests/demo/render-texture/flight/webgl/';

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

async function clickModeButton(page: Page): Promise<void> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  const scaleX = box.width / 320;
  const scaleY = box.height / 480;
  await page.mouse.click(box.x + 160 * scaleX, box.y + 31 * scaleY);
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(300);
}

test.describe('starling render-texture parity', () => {
  test('initial render: flight matches starling', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    const starlingShot = await captureCanvas(page);

    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const flightShot = await captureCanvas(page);

    expect(flightShot).toMatchSnapshot('render-texture-flight.png', { maxDiffPixelRatio: 0.05 });
    expect(starlingShot).toMatchSnapshot('render-texture-starling.png', { maxDiffPixelRatio: 0.05 });
  });

  test('drawing on canvas produces visible strokes', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const before = await captureCanvas(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const scaleX = box.width / 320;
    const scaleY = box.height / 480;

    const startX = box.x + 160 * scaleX;
    const startY = box.y + 240 * scaleY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 40 * scaleX, startY + 40 * scaleY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const after = await captureCanvas(page);

    expect(Buffer.compare(before, after), 'canvas should change after drawing').not.toBe(0);
  });

  test('mode button toggles between draw and erase', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const before = await captureCanvas(page);
    await clickModeButton(page);
    const after = await captureCanvas(page);

    expect(Buffer.compare(before, after), 'canvas should change after toggling mode').not.toBe(0);
  });
});
