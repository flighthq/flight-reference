import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const BLEND_MODES = ['normal', 'multiply', 'screen', 'add', 'erase', 'none'];

const STARLING_URL = '/starling-tests/demo/blend-modes/webgl/';
const FLIGHT_URL = '/starling-tests/demo/blend-modes/flight/webgl/';

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function clickSwitchMode(page: Page): Promise<void> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  await page.mouse.click(box.x + 160, box.y + 31);
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(300);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

test.describe('starling blend-modes parity', () => {
  for (let i = 0; i < BLEND_MODES.length; i++) {
    const mode = BLEND_MODES[i]!;

    test(`${mode}: flight matches starling`, async ({ page }) => {
      await page.goto(STARLING_URL);
      await waitForCanvas(page);
      for (let c = 0; c < i; c++) await clickSwitchMode(page);
      const starlingShot = await captureCanvas(page);

      await page.goto(FLIGHT_URL);
      await waitForCanvas(page);
      for (let c = 0; c < i; c++) await clickSwitchMode(page);
      const flightShot = await captureCanvas(page);

      expect(flightShot).toMatchSnapshot(`blend-${mode}-flight.png`, {
        maxDiffPixelRatio: 0.05,
      });
      expect(starlingShot).toMatchSnapshot(`blend-${mode}-starling.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  }

  test('label updates on each mode switch', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const screenshots: Buffer[] = [];
    screenshots.push(await captureCanvas(page));

    for (let i = 0; i < BLEND_MODES.length; i++) {
      await clickSwitchMode(page);
      screenshots.push(await captureCanvas(page));
    }

    for (let i = 1; i < screenshots.length; i++) {
      expect(
        Buffer.compare(screenshots[i - 1]!, screenshots[i]!),
        `screenshot should change after click ${i} (switching to ${BLEND_MODES[i % BLEND_MODES.length]})`,
      ).not.toBe(0);
    }
  });
});
