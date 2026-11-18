import { expect, test } from '@playwright/test';

test('webhook com segredo errado responde 401', async ({ request }) => {
  const r = await request.post('/api/whatsapp/webhook?secret=errado', { data: {} });
  expect(r.status()).toBe(401);
});
