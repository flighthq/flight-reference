import { captureCanvas, expect, test, waitForStableFrame } from './fixtures';

const CASES = [
  'displayobject-cache',
  'displayobject-cache-color-transform',
  'displayobject-cache-nested',
  'displayobject-clip-rect',
  'displayobject-mask',
  'displayobject-scroll-rect',
  'filter-blur',
  'filter-drop-shadow',
  'filter-glow',
  'node-alpha',
  'node-blend-modes',
  'shape-fill-solid',
  'text-wrap',
];

test.describe('openfl functional parity', () => {
  for (const name of CASES) {
    test(`${name}: flight matches openfl`, async ({ deterministicPage: page }) => {
      await page.goto(`/openfl-tests/functional/${name}/webgl/`);
      await waitForStableFrame(page);
      const openflShot = await captureCanvas(page);

      await page.goto(`/openfl-tests/functional/${name}/flight/webgl/`);
      await waitForStableFrame(page);
      const flightShot = await captureCanvas(page);

      expect(openflShot).toMatchSnapshot(`functional-${name}-openfl.png`, {
        maxDiffPixelRatio: 0.05,
      });
      expect(flightShot).toMatchSnapshot(`functional-${name}-flight.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});
