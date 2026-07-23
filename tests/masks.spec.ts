import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const STARLING_URL = '/starling-tests/demo/masks/webgl/';
const FLIGHT_URL = '/starling-tests/demo/masks/flight/webgl/';

const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;

const MASK_POSITIONS = [
  { name: 'center', x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
  { name: 'top-left', x: 80, y: 80 },
  { name: 'bottom-right', x: 260, y: 400 },
];

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(500);
}

async function moveMaskTo(page: Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  const clientX = box.x + (gameX / GAME_WIDTH) * box.width;
  const clientY = box.y + (gameY / GAME_HEIGHT) * box.height;
  await page.mouse.move(clientX, clientY);
  await page.mouse.down();
  await page.mouse.up();
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(300);
}

async function captureCanvas(page: Page): Promise<Buffer> {
  return page.locator('canvas').first().screenshot();
}

test.describe('starling masks parity', () => {
  for (const pos of MASK_POSITIONS) {
    test(`${pos.name}: flight matches starling`, async ({ page }) => {
      await page.goto(STARLING_URL);
      await waitForCanvas(page);
      await moveMaskTo(page, pos.x, pos.y);
      const starlingShot = await captureCanvas(page);

      await page.goto(FLIGHT_URL);
      await waitForCanvas(page);
      await moveMaskTo(page, pos.x, pos.y);
      const flightShot = await captureCanvas(page);

      expect(starlingShot).toMatchSnapshot(`masks-${pos.name}-starling.png`, {
        maxDiffPixelRatio: 0.05,
      });
      expect(flightShot).toMatchSnapshot(`masks-${pos.name}-flight.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  }

  test('mask position changes the canvas', async ({ page }) => {
    await page.goto(FLIGHT_URL);
    await waitForCanvas(page);

    const screenshots: Buffer[] = [];
    for (const pos of MASK_POSITIONS) {
      await moveMaskTo(page, pos.x, pos.y);
      screenshots.push(await captureCanvas(page));
    }

    for (let i = 1; i < screenshots.length; i++) {
      expect(
        Buffer.compare(screenshots[i - 1]!, screenshots[i]!),
        `screenshot should change after moving mask to ${MASK_POSITIONS[i]!.name}`,
      ).not.toBe(0);
    }
  });
});
