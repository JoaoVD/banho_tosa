import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test.beforeEach(async ({ page }) => {
  resetarDados();
  await entrar(page, 'dona');
});

test('edita o texto de "Pet pronto"', async ({ page }) => {
  await page.goto('/configuracoes/mensagens');
  await page.getByRole('button', { name: /Pet pronto/ }).click();
  const d = page.getByRole('dialog', { name: 'Pet pronto' });
  await d.getByLabel('Texto da mensagem').fill('Oi {tutor}, {pet} pronto!');
  await expect(d.getByText('Oi Ana, Thor pronto!')).toBeVisible();
  await d.getByRole('button', { name: 'Salvar texto' }).click();
  await expect(page.getByText('Texto salvo')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Oi {tutor}, {pet} pronto!')).toBeVisible();
});

test('variável desconhecida é recusada', async ({ page }) => {
  await page.goto('/configuracoes/mensagens');
  await page.getByRole('button', { name: /Pet pronto/ }).click();
  const d = page.getByRole('dialog', { name: 'Pet pronto' });
  await d.getByLabel('Texto da mensagem').fill('Oi {foo}');
  await d.getByRole('button', { name: 'Salvar texto' }).click();
  await expect(d.getByText('Variável desconhecida: {foo}')).toBeVisible();
});

test('WhatsApp desconectado mostra o QR code', async ({ page, request }) => {
  await request.post('/api/dev/whatsapp/estado', { data: { valor: 'close' } });
  await page.goto('/configuracoes/whatsapp');
  await expect(page.getByRole('img', { name: 'QR code para conectar o WhatsApp' })).toBeVisible();
  await expect(page.getByText('Aparelhos conectados')).toBeVisible();
  await request.post('/api/dev/whatsapp/estado', { data: { valor: 'open' } });
  await page.reload();
  await expect(page.getByText('Conectado')).toBeVisible();
});
