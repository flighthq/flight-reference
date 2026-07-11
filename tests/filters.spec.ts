import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const FILTERS = [
  'identity',
  'blur',
  'drop-shadow',
  'glow',
  'displacement-map',
  'invert',
  'grayscale',
  'saturation',
  'contrast',
  'brightness',
  'hue',
  'hue-shadow',
];

const STARLING_URL = '/starling-tests/demo/filters/webgl/';
const FLIGHT_URL = '/starling-tests/demo/filters/flight/webgl/';

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(800);
}

async function clickSwitchFilter(page: Page): Promise<void> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  await page.mouse.click(box.x + 160, box.y + 31);
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

test.describe('starling filters parity', () => {
  for (let i = 0; i < FILTERS.length; i++) {
    const filter = FILTERS[i]!;

    test(`${filter}: flight matches starling`, async ({ page }) => {
      await page.goto(STARLING_URL);
      await waitForCanvas(page);
      for (let c = 0; c < i; c++) await clickSwitchFilter(page);
      const starlingShot = await captureCanvas(page);

      await page.goto(FLIGHT_URL);
      await waitForCanvas(page);
      for (let c = 0; c < i; c++) await clickSwitchFilter(page);
      const flightShot = await captureCanvas(page);

      expect(flightShot).toMatchSnapshot(`filter-${filter}-flight.png`, {
        maxDiffPixelRatio: 0.15,
      });
      expect(starlingShot).toMatchSnapshot(`filter-${filter}-starling.png`, {
        maxDiffPixelRatio: 0.15,
      });
    });
  }

  test('label updates on each filter switch', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const screenshots: Buffer[] = [];
    screenshots.push(await captureCanvas(page));

    for (let i = 0; i < FILTERS.length; i++) {
      await clickSwitchFilter(page);
      screenshots.push(await captureCanvas(page));
    }

    for (let i = 1; i < screenshots.length; i++) {
      expect(
        Buffer.compare(screenshots[i - 1]!, screenshots[i]!),
        `screenshot should change after click ${i} (switching to ${FILTERS[i % FILTERS.length]})`,
      ).not.toBe(0);
    }
  });
});
