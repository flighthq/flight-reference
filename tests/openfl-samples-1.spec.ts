import { captureCanvas, expect, test, waitForStableFrame } from './fixtures';

const CASES = [
  'actuateexample',
  'addinganimation',
  'addingtext',
  'animatedtilemap',
  'bunnymark',
  'comparebitmapdata',
  'creatingamainloop',
  'displayingabitmap',
  'drawingshapes',
  'glslbitmap',
  'handlingkeyboardevents',
  'handlingmouseevents',
  'hellotriangle',
];

test.describe('openfl samples parity (batch 1)', () => {
  for (const name of CASES) {
    test(`${name}: flight matches openfl`, async ({ deterministicPage: page }) => {
      await page.goto(`/openfl-tests/samples/${name}/webgl/`);
      await waitForStableFrame(page);
      const openflShot = await captureCanvas(page);

      await page.goto(`/openfl-tests/samples/${name}/flight/webgl/`);
      await waitForStableFrame(page);
      const flightShot = await captureCanvas(page);

      expect(openflShot).toMatchSnapshot(`samples-${name}-openfl.png`, {
        maxDiffPixelRatio: 0.05,
      });
      expect(flightShot).toMatchSnapshot(`samples-${name}-flight.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});
