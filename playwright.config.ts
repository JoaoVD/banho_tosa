import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3000', trace: 'off', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/entrar',
    reuseExistingServer: true,
    timeout: 120000,
    env: { AUTH_MODE: 'dev', WHATSAPP_PROVIDER: 'fake' },
  },
});
