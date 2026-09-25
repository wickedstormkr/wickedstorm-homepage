import { defineConfig, devices } from '@playwright/test';

/**
 * 자동 점검. 먼저 `npm run build`로 dist/를 만든 뒤 실행한다(`npm run test:e2e`).
 * 서버는 astro preview(site.config.mjs의 base 경로를 그대로 따른다).
 */
const BASE = (process.env.BASE_PATH || '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
const PORT = Number(process.env.PORT || 4321);

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // 실패 흔적(trace)은 따로 두어, 점검 결과 파일(test-results/audit 등)을 지우지 않게 한다
  outputDir: 'test-results/pw-artifacts',
  workers: process.env.CI ? 4 : undefined,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}${BASE}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx astro preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
    url: `http://127.0.0.1:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
