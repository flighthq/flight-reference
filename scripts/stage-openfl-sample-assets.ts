import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
const assetTarget = join(repoRoot, 'reference', 'assets', 'public', 'openfl');

const roots = {
  haxe: [
    join(repoRoot, 'openfl-samples'),
    join(repoRoot, '..', 'openfl-samples'),
    join(repoRoot, 'reference/openfl-samples'),
    join(repoRoot, '.cache/upstream/openfl-samples'),
  ].find((dir) => existsSync(dir)),
  ts: [
    join(repoRoot, 'openfl-samples-ts'),
    join(repoRoot, '..', 'openfl-samples-ts'),
    join(repoRoot, 'reference/openfl-samples-ts'),
    join(repoRoot, '.cache/upstream/openfl-samples-ts'),
  ].find((dir) => existsSync(dir)),
};

function copyFile(from: string, to: string): void {
  if (!existsSync(from)) return;
  const out = join(assetTarget, to);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(from, out);
  console.log(`openfl-sample-assets: staged ${to}`);
}

function copyDir(from: string, to: string, options?: { mirrorTopLevelAssets?: boolean }): void {
  if (!existsSync(from)) return;
  for (const name of readdirSync(from)) {
    if (name === 'favicon.png' || name === 'index.html') continue;
    const src = join(from, name);
    const stat = statSync(src);
    if (stat.isDirectory()) {
      copyDir(src, join(to, name), options);
    } else if (stat.isFile()) {
      copyFile(src, join(to, name));
      if (options?.mirrorTopLevelAssets && !to.includes('/')) copyFile(src, join('assets', name));
    }
  }
}

function copyPiratePigSoundAliases(ext: string): void {
  copyFile(join(assetTarget, `sounds/3.${ext}`), `assets/sounds/sound3.${ext}`);
  copyFile(join(assetTarget, `sounds/4.${ext}`), `assets/sounds/sound4.${ext}`);
  copyFile(join(assetTarget, `sounds/5.${ext}`), `assets/sounds/sound5.${ext}`);
  copyFile(join(assetTarget, `sounds/theme.${ext}`), `assets/sounds/theme.${ext}`);
}

if (roots.ts) {
  copyDir(join(roots.ts, 'features/display/AddingAnimation/public/assets'), 'assets');
  copyDir(join(roots.ts, 'features/display/DisplayingABitmap/public'), '', { mirrorTopLevelAssets: true });
  copyDir(join(roots.ts, 'features/display/UsingBitmapData/public/assets'), 'assets');
  copyFile(join(roots.ts, 'features/display/UsingSWFAssets/assets/layout.swf'), 'assets/layout.swf');
  copyDir(join(roots.ts, 'features/display3D/Stage3DCamera/public'), '', { mirrorTopLevelAssets: true });
  copyDir(join(roots.ts, 'features/display3D/Stage3DMipmap/public'), '', { mirrorTopLevelAssets: true });
  copyDir(join(roots.ts, 'features/events/HandlingKeyboardEvents/public/assets'), 'assets');
  copyDir(join(roots.ts, 'features/events/HandlingMouseEvents/public/assets'), 'assets');
  copyDir(join(roots.ts, 'features/media/PlayingSound/public/assets'), 'assets');
  copyDir(join(roots.ts, 'features/media/PlayingVideo/public/assets'), 'assets');
  copyDir(join(roots.ts, 'features/text/AddingText/public/assets'), 'assets');
  copyFile(join(roots.ts, 'demos/NyanCat/assets/library.swf'), 'assets/library.swf');
  copyDir(join(roots.ts, 'demos/PiratePig/public'), '');
  copyDir(join(roots.ts, 'demos/PiratePig/public/fonts'), 'assets/fonts');
  copyDir(join(roots.ts, 'demos/PiratePig/public/images'), 'assets/images');
  copyDir(join(roots.ts, 'demos/PiratePig/public/sounds'), 'assets/sounds');
  copyPiratePigSoundAliases('mp3');
  copyPiratePigSoundAliases('ogg');
  copyFile(join(roots.ts, 'demos/BunnyMark/public/wabbit_alpha.png'), 'assets/wabbit_alpha.png');
}

if (roots.haxe) {
  copyFile(join(roots.haxe, 'demos/BunnyMark/Assets/wabbit_alpha.png'), 'wabbit_alpha.png');
  copyFile(join(roots.haxe, 'demos/BunnyMark/Assets/wabbit_alpha.png'), 'assets/wabbit_alpha.png');
  copyDir(join(roots.haxe, 'features/display/CompareBitmapData/Assets/32'), 'assets/32');
  copyDir(join(roots.haxe, 'features/display/CompareBitmapData/Assets/64'), 'assets/64');
  copyFile(join(roots.haxe, 'features/display/AnimatedTilemap/Assets/tileset.png'), 'assets/tileset.png');
  copyFile(join(roots.haxe, 'features/display/SimpleTilemap/Assets/tileset.png'), 'assets/tileset.png');
  copyDir(join(roots.haxe, 'demos/TextAlignment/Assets/img'), 'assets/img');
  copyFile(
    join(roots.haxe, 'demos/TextMetrics/Assets/LiberationSerif-Regular.ttf'),
    'assets/LiberationSerif-Regular.ttf',
  );
  copyFile(join(roots.haxe, 'features/display3D/Stage3DMipmap/Assets/checkers.png'), 'checkers.png');
  copyFile(join(roots.haxe, 'features/display3D/Stage3DMipmap/Assets/checkers.png'), 'assets/checkers.png');
}
