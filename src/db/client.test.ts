import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); delete (globalThis as Record<string, unknown>).__btDb; });

test('importar o cliente sem DATABASE_URL não quebra (o build da Vercel não tem banco)', async () => {
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('POSTGRES_URL', '');
  delete (globalThis as Record<string, unknown>).__btDb;
  const mod = await import('./client');
  expect(mod.db).toBeDefined();
  expect(() => mod.db`select 1`).toThrow(/DATABASE_URL não configurado/);
});

test('POSTGRES_URL da integração da Vercel tem preferência e perde o parâmetro supa', async () => {
  const { urlDoBanco } = await import('./client');
  const env = { DATABASE_URL: 'postgres://errado@x/db', SUPABASE_SERVICE_DATABASE_URL: 'postgres://errado2@x/db',
    POSTGRES_URL: 'postgres://postgres.ref:s3nha@pooler:6543/postgres?sslmode=require&supa=base-pooler.x' };
  expect(urlDoBanco(env)).toBe('postgres://postgres.ref:s3nha@pooler:6543/postgres?sslmode=require');
  expect(urlDoBanco(env, true)).toBe('postgres://postgres.ref:s3nha@pooler:6543/postgres?sslmode=require');
  expect(urlDoBanco({ DATABASE_URL: 'postgres://local/db' })).toBe('postgres://local/db');
  expect(urlDoBanco({ DATABASE_URL: 'postgres://a/db', SUPABASE_SERVICE_DATABASE_URL: 'postgres://s/db' }, true)).toBe('postgres://s/db');
});
