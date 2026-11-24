import { expect, test } from '@playwright/test';
import { entrar } from './helpers';

async function tentar(page: import('@playwright/test').Page, usuario: string, senha: string) {
  await page.goto('/entrar');
  await page.getByLabel('Usuário').fill(usuario);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('sem sessão, /hoje leva para /entrar', async ({ page }) => {
  await page.goto('/hoje');
  await expect(page).toHaveURL(/\/entrar$/);
});

test('senha errada mostra o erro', async ({ page }) => {
  await tentar(page, 'recepcao', 'errada');
  await expect(page.getByText('Usuário ou senha incorretos.')).toBeVisible();
});

test('usuário inexistente mostra o mesmo erro', async ({ page }) => {
  await tentar(page, 'ninguem', 'dev');
  await expect(page.getByText('Usuário ou senha incorretos.')).toBeVisible();
});

test('maiúsculas e espaços no usuário não atrapalham', async ({ page }) => {
  await tentar(page, '  Recepcao ', 'dev');
  await expect(page).toHaveURL(/\/hoje$/);
});

test('login correto abre o Hoje', async ({ page }) => {
  await entrar(page);
});
