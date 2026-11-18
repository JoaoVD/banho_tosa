import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); delete (globalThis as Record<string, unknown>).__btDb; });

test('importar o cliente sem DATABASE_URL não quebra (o build da Vercel não tem banco)', async () => {
  vi.stubEnv('DATABASE_URL', '');
  delete (globalThis as Record<string, unknown>).__btDb;
  const mod = await import('./client');
  expect(mod.db).toBeDefined();
  expect(() => mod.db`select 1`).toThrow(/DATABASE_URL não configurado/);
});
