import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test.beforeEach(async ({ page }) => {
  resetarDados();
  await entrar(page);
});

test('recebe a Luna em dinheiro', async ({ page }) => {
  await expect(page.getByTestId('widget-recebido')).toContainText('R$ 130');
  const luna = page.getByRole('region', { name: 'Pronto para buscar' }).getByRole('article', { name: /Luna/ });
  await luna.getByRole('button', { name: 'Receber R$ 85,00' }).click();
  const dialog = page.getByRole('dialog', { name: 'Receber de Juliana' });
  await dialog.getByRole('button', { name: 'Dinheiro' }).click();
  await dialog.getByRole('button', { name: 'Receber R$ 85,00' }).click();
  await expect(luna.getByText('Pago')).toBeVisible();
  await expect(page.getByTestId('widget-recebido')).toContainText('R$ 215');
});

test('clique duplo em Receber gera um pagamento só', async ({ page }) => {
  const luna = page.getByRole('region', { name: 'Pronto para buscar' }).getByRole('article', { name: /Luna/ });
  await luna.getByRole('button', { name: /^Receber/ }).click();
  const botao = page.getByRole('dialog').getByRole('button', { name: 'Receber R$ 85,00' });
  await botao.dblclick();
  await expect(luna.getByText('Pago')).toBeVisible();
  await expect(page.getByTestId('widget-recebido')).toContainText('2 pagamentos');
});

test('banho do pacote: Thor sai sem cobrança', async ({ page }) => {
  await page.getByRole('region', { name: 'No banho' }).getByRole('article', { name: /Thor/ }).getByRole('button', { name: 'Levar para tosa' }).click();
  await page.getByRole('region', { name: 'Na tosa' }).getByRole('article', { name: /Thor/ }).getByRole('button', { name: 'Marcar como pronto' }).click();
  const card = page.getByRole('region', { name: 'Pronto para buscar' }).getByRole('article', { name: /Thor/ });
  await card.getByRole('button', { name: 'Concluir' }).click();
  await card.getByRole('button', { name: 'Receber R$ 0,00' }).click();
  const dialog = page.getByRole('dialog', { name: 'Receber de Ana' });
  await expect(dialog.getByRole('switch', { name: 'Usar banho do pacote' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Confirmar uso do pacote' }).click();
  await expect(card.getByText('Pago')).toBeVisible();
});
