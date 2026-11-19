import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  expect: { timeout: 10_000 },
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3000', trace: 'off', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' },
  projects: [
    { name: 'chromium', testIgnore: /celular\//, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Celular: perfil de iPhone, mas no Chromium (o navegador instalado).
    { name: 'celular', testMatch: /celular\/.*\.spec\.ts/, use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/entrar',
    reuseExistingServer: false,
    timeout: 120000,
    // Hora fixa do servidor nos e2e: quarta, 18/11/2026, 10:40 em São Paulo.
    env: { AUTH_MODE: 'dev', WHATSAPP_PROVIDER: 'fake', APP_NOW: '2026-11-18T13:40:00Z' },
  },
});
