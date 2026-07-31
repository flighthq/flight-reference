const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  for (const spec of process.argv.slice(2)) {
    const i = spec.indexOf('|');
    const label = spec.slice(0, i),
      path = spec.slice(i + 1);
    const p = await b.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).split('\n')[0].slice(0, 90)));
    try {
      await p.goto('http://localhost:5230' + path, { waitUntil: 'load', timeout: 25000 });
      await p.waitForSelector('canvas', { timeout: 15000 });
      await p.waitForTimeout(2500);
      const buf = await p.locator('canvas').first().screenshot({ timeout: 15000 });
      fs.writeFileSync('/tmp/shots/' + label + '.png', buf);
      console.log(
        label.padEnd(14) + ' bytes=' + String(buf.length).padStart(8) + (errs.length ? '  ERR ' + errs[0] : ''),
      );
    } catch (e) {
      console.log(label.padEnd(14) + ' FAIL ' + String(e).split('\n')[0].slice(0, 50));
    }
    await p.close();
  }
  await b.close();
})();
