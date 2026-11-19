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

test('ver a lista no celular não marca conversa como lida', async ({ page }) => {
  const abas = page.getByRole('navigation', { name: 'Abas' });
  await expect(abas.locator('.tb-badge')).toHaveText('1');
  await page.waitForTimeout(2500);
  await page.reload();
  await expect(abas.locator('.tb-badge')).toHaveText('1');
});

test('voltar do celular sai da conversa para a lista', async ({ page }) => {
  await page.getByRole('button', { name: /Ana Souza/ }).click();
  await expect(page.getByRole('region', { name: 'Conversa com Ana Souza' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/mensagens(\?filtro=tutores)?$/);
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible();
});

test('aba Mensagens com conversa aberta volta à lista', async ({ page }) => {
  await page.getByRole('button', { name: /Ana Souza/ }).click();
  await expect(page.getByRole('region', { name: 'Conversa com Ana Souza' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Abas' }).getByRole('link', { name: /^Mensagens/ }).click();
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible();
});

test('abrir outra conversa não mostra a anterior', async ({ page }) => {
  await page.getByRole('button', { name: /Ana Souza/ }).click();
  await expect(page.getByRole('region', { name: 'Conversa com Ana Souza' })).toBeVisible();
  await page.getByRole('button', { name: 'Conversas' }).click();
  const outra = page.locator('main .glist button').filter({ hasNotText: 'Ana Souza' }).first();
  const nome = (await outra.locator('b').first().textContent())!.trim();
  await outra.click();
  await expect(page.getByRole('region', { name: 'Conversa com Ana Souza' })).toHaveCount(0, { timeout: 1 });
  await expect(page.getByRole('region', { name: `Conversa com ${nome}` })).toBeVisible();
});
