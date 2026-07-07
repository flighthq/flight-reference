import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repoRoot = resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  publicDir: resolve(repoRoot, 'reference/assets/public/openfl'),
  resolve: {
    alias: {
      '@flighthq/capture': resolve(repoRoot, 'packages/capture/src/index.ts'),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
