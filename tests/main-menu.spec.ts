import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const STARLING_URL = '/starling-tests/demo/main-menu/webgl/';
const FLIGHT_URL = '/starling-tests/demo/main-menu/flight/webgl/';

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

test.describe('starling main-menu parity', () => {
  test('initial render: flight matches starling', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    const starlingShot = await captureCanvas(page);

    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const flightShot = await captureCanvas(page);

    expect(flightShot).toMatchSnapshot('main-menu-flight.png', { maxDiffPixelRatio: 0.05 });
    expect(starlingShot).toMatchSnapshot('main-menu-starling.png', { maxDiffPixelRatio: 0.05 });
  });
});
