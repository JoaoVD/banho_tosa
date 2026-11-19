import { expect, test, type Page } from '@playwright/test';
import { entrar, resetarDados } from '../helpers';

const campo = (page: Page) => page.getByLabel(/^Mensagem para/);

test.beforeEach(async ({ page, request }) => {
  resetarDados();
  await request.post('/api/dev/whatsapp/inbound', { data: { from: '(11) 98765-0000', text: 'Oi! Tem horário amanhã?' } });
  await entrar(page);
  await page.goto('/mensagens');
});
test.afterAll(() => resetarDados());

test('lista primeiro, conversa ao tocar, e volta', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible();
  await expect(campo(page)).toBeHidden();
  await page.getByRole('button', { name: /Ana Souza/ }).click();
  await expect(page.getByRole('region', { name: 'Conversa com Ana Souza' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeHidden();
  await page.getByRole('button', { name: 'Conversas' }).click();
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible();
  await expect(campo(page)).toBeHidden();
});

test('responder pelo celular', async ({ page }) => {
  await page.getByRole('button', { name: /Ana Souza/ }).click();
  await campo(page).fill('Tem sim, às 14h!');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByRole('region', { name: 'Conversa com Ana Souza' }).getByText('Tem sim, às 14h!')).toBeVisible();
  const box = (await campo(page).boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test('barra de abas some enquanto digita', async ({ page }) => {
  await page.getByRole('button', { name: /Ana Souza/ }).click();
  await campo(page).focus();
  await expect(page.locator('.tabbar')).toBeHidden();
  await campo(page).blur();
  await expect(page.locator('.tabbar')).toBeVisible();
});
