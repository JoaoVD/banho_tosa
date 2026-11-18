import { expect, test } from '@playwright/test';
import path from 'node:path';
import { entrar } from './helpers';

test('importa a planilha de clientes', async ({ page }) => {
  await entrar(page, 'dona@exemplo.dev');
  await page.goto('/configuracoes/importar');
  await page.getByLabel('Planilha (.xlsx ou .csv)').setInputFiles(path.join(__dirname, 'fixtures/clientes.csv'));
  await page.getByRole('button', { name: 'Ler planilha' }).click();
  await expect(page.getByLabel('Coluna “Celular”')).toHaveValue('telefone');
  await page.getByRole('button', { name: 'Ver prévia' }).click();
  await expect(page.getByText('4 clientes prontos para importar, 1 linha com erro')).toBeVisible();
  await expect(page.getByText('Linha 6: Telefone inválido')).toBeVisible();
  await page.getByRole('button', { name: 'Importar 4 clientes' }).click();
  await expect(page.getByText('Importação concluída')).toBeVisible();
  await expect(page.getByText('4 tutores, 4 pets e 4 últimas visitas')).toBeVisible();
  await page.goto('/pets?q=Kiara');
  await expect(page.getByRole('link', { name: /Kiara/ })).toBeVisible();
});
