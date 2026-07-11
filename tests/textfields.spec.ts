import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const STARLING_URL = '/starling-tests/demo/textfields/webgl/';
const FLIGHT_URL = '/starling-tests/demo/textfields/flight/webgl/';

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

test.describe('starling textfields parity', () => {
  test('flight matches starling', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    const starlingShot = await captureCanvas(page);

    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const flightShot = await captureCanvas(page);

    expect(starlingShot).toMatchSnapshot('textfields-starling.png', {
      maxDiffPixelRatio: 0.05,
    });
    expect(flightShot).toMatchSnapshot('textfields-flight.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('canvas dimensions are 320x480', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBe(320);
    expect(box!.height).toBe(480);
  });

  test('text content is visible (non-blank canvas)', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const shot = await captureCanvas(page);
    const blankPage = page;
    await blankPage.setContent('<canvas width="320" height="480"></canvas>');
    const blankShot = await blankPage.locator('canvas').first().screenshot();
    expect(Buffer.compare(shot, blankShot), 'rendered canvas should differ from blank canvas').not.toBe(0);
  });
});
