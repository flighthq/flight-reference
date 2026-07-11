import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  retries: 1,
  workers: 3,
  use: {
    baseURL: 'http://localhost:5173',
    launchOptions: {
      args: ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader'],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
});
