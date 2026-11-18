import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test.beforeEach(async ({ page }) => {
  resetarDados();
  await entrar(page);
});

test('resposta da Ana: badge, abrir e confirmar o horário', async ({ page, request }) => {
  await request.post('/api/dev/whatsapp/inbound', { data: { from: '(11) 98765-0000', text: 'Pode sim! Deixo ele lá às 10h' } });
  await page.reload();
  const nav = page.getByRole('navigation', { name: 'Menu principal' });
  await expect(nav.getByLabel('1 não lidas')).toBeVisible();
  await nav.getByRole('link', { name: /Mensagens/ }).click();
  await page.getByRole('button', { name: /Ana Souza/ }).click();
  await expect(page.getByText('Ana aceitou quinta às 10:00')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Thor agendado para quinta às 10:00')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Conversa com Ana Souza' }).getByText('Agendado! Thor na quinta, 19/11, às 10:00. Até lá!')).toBeVisible();
});

test('número desconhecido aparece só em Outros', async ({ page, request }) => {
  await request.post('/api/dev/whatsapp/inbound', { data: { from: '(11) 90000-1111', text: 'Quanto custa o banho?' } });
  await page.goto('/mensagens');
  await expect(page.getByText('Quanto custa o banho?')).toHaveCount(0);
  await page.getByRole('button', { name: 'Outros' }).click();
  await expect(page.getByText('Quanto custa o banho?').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cadastrar tutor' })).toBeVisible();
});
