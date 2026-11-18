import { expect, test } from '@playwright/test';
import { entrar } from './helpers';

test('dona muda o preço do Banho para porte pequeno', async ({ page }) => {
  await entrar(page, 'dona@exemplo.dev');
  await page.goto('/configuracoes/servicos');
  await page.getByRole('link', { name: /^Banho\b/ }).first().click();
  await page.getByLabel('Preço Pequeno').fill('75,00');
  await page.getByRole('button', { name: 'Salvar serviço' }).click();
  await expect(page.getByText('Serviço salvo')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Preço Pequeno')).toHaveValue('75,00');
});

test('recepção é mandada de volta para o Hoje', async ({ page }) => {
  await entrar(page);
  await page.goto('/configuracoes');
  await expect(page).toHaveURL(/\/hoje$/);
});

test('dona altera o teto diário de mensagens', async ({ page }) => {
  await entrar(page, 'dona@exemplo.dev');
  await page.goto('/configuracoes/envio');
  await page.getByLabel('Teto diário de mensagens automáticas').fill('120');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Configurações salvas')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Teto diário de mensagens automáticas')).toHaveValue('120');
});
