import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test.beforeEach(async ({ page }) => {
  resetarDados();
  await entrar(page);
});

test('confere a gaveta e fecha o caixa', async ({ page }) => {
  const luna = page.getByRole('region', { name: 'Pronto para buscar' }).getByRole('article', { name: /Luna/ });
  await luna.getByRole('button', { name: /^Receber/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Dinheiro' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Receber R$ 85,00' }).click();
  await expect(luna.getByText('Pago')).toBeVisible();

  await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Caixa' }).click();
  await expect(page.getByTestId('total-dia')).toHaveText('R$ 215,00');
  const campo = page.getByLabel('Contado na gaveta');
  await campo.fill('80');
  await expect(page.getByTestId('diferenca')).toHaveText('Faltam R$ 5,00');
  await campo.fill('abc');
  await expect(page.getByText('Digite um valor como 80,00')).toBeVisible();
  await campo.fill('85,00');
  await expect(page.getByTestId('diferenca')).toHaveText('Confere');
  await page.getByRole('button', { name: 'Fechar caixa' }).click();
  await expect(page.getByText(/Fechado às/)).toBeVisible();
});
