import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const STARLING_URL = '/starling-tests/demo/movie-clip/webgl/';
const FLIGHT_URL = '/starling-tests/demo/movie-clip/flight/webgl/';

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

test.describe('starling movie-clip parity', () => {
  test('initial render: flight matches starling', async ({ page }) => {
    await page.goto(STARLING_URL);
    await waitForCanvas(page);
    const starlingShot = await captureCanvas(page);

    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);
    const flightShot = await captureCanvas(page);

    expect(flightShot).toMatchSnapshot('movie-clip-flight.png', { maxDiffPixelRatio: 0.05 });
    expect(starlingShot).toMatchSnapshot('movie-clip-starling.png', { maxDiffPixelRatio: 0.05 });
  });

  test('animation advances frames over time', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const frame1 = await captureCanvas(page);

    await page.waitForTimeout(200);
    const frame2 = await captureCanvas(page);

    expect(Buffer.compare(frame1, frame2), 'movie clip should animate between frames').not.toBe(0);
  });
});
