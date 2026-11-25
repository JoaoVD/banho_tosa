import { expect, test } from '@playwright/test';
import { resetarDados } from '../helpers';

test.beforeEach(() => resetarDados());
test.afterAll(() => resetarDados());

test('primeiro acesso cabe no celular', async ({ page }) => {
  await page.goto('/cadastro');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByLabel('Nome do pet shop').fill('Pet Spa');
  await page.getByLabel('Seu nome').fill('Mariana');
  await page.getByLabel('Usuário').fill('mariana');
  await page.getByLabel('E-mail').fill('mariana@exemplo.dev');
  await page.getByLabel('Senha').fill('senha1234');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/boas-vindas$/);
  await page.getByRole('button', { name: 'Seg a Sáb 8h–18h' }).click();
  await page.getByLabel('Nome de quem trabalha').fill('Júlia');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Ajustar preços' }).click();
  await expect(page.getByLabel('Banho, Pequeno')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
