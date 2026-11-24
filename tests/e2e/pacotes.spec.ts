import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test.beforeEach(() => resetarDados());

test('dona cria o modelo "2 banhos e 1 tosa"', async ({ page }) => {
  await entrar(page, 'dona');
  await page.goto('/pacotes');
  await page.getByRole('button', { name: 'Criar pacote' }).click();
  const d = page.getByRole('dialog', { name: 'Novo pacote' });
  await d.getByLabel('Nome do pacote').fill('2 banhos e 1 tosa');
  await d.getByLabel('Preço').fill('290,00');
  await d.getByLabel('Quantidade de atendimentos').fill('3');
  await d.getByLabel('Serviço incluído').selectOption({ label: 'Banho + tosa higiênica' });
  await d.getByLabel('Validade (dias)').fill('45');
  await d.getByRole('button', { name: 'Salvar pacote' }).click();
  await expect(page.getByRole('heading', { name: '2 banhos e 1 tosa' })).toBeVisible();
});

test('vende um pacote pela ficha do pet', async ({ page }) => {
  await entrar(page);
  await page.goto('/pets?q=Luna');
  await page.getByRole('button', { name: 'Vender pacote' }).click();
  const d = page.getByRole('dialog', { name: 'Vender pacote para Juliana' });
  await d.getByLabel('Pacote').selectOption({ label: '4 banhos no mês, R$ 260,00' });
  await d.getByRole('button', { name: 'Pix' }).click();
  await d.getByRole('button', { name: 'Vender por R$ 260,00' }).click();
  await expect(page.getByText('4 banhos', { exact: true })).toBeVisible();
});
