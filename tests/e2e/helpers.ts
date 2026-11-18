import { expect, type Page } from '@playwright/test';

export async function entrar(page: Page, email = 'recepcao@exemplo.dev') {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('dev');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}
