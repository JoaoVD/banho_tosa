import { expect, test } from '@playwright/test';
import { entrar } from './helpers';

test('sem sessão, /hoje leva para /entrar', async ({ page }) => {
  await page.goto('/hoje');
  await expect(page).toHaveURL(/\/entrar$/);
});

test('senha errada mostra o erro', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('recepcao@exemplo.dev');
  await page.getByLabel('Senha').fill('errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
});

test('login correto abre o Hoje', async ({ page }) => {
  await entrar(page);
});
