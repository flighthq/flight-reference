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
    // `npm run dev` takes a case name and serves only that one; with no positional argument it prints
    // usage and exits, so the suite silently fell back to whatever was already on the port. The e2e run
    // needs every case route, which is what `dev:all` serves.
    command: 'npm run dev:all -- --port 5173',
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
