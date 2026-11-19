import { expect, test } from '@playwright/test';
import { entrar } from '../helpers';

const abas = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Abas' });

test('abas visíveis e menu lateral escondido', async ({ page }) => {
  await entrar(page);
  for (const nome of ['Hoje', 'Agenda', 'Mensagens', 'Pets']) await expect(abas(page).getByRole('link', { name: new RegExp(`^${nome}`) })).toBeVisible();
  await expect(abas(page).getByRole('button', { name: 'Mais' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeHidden();
});

test('aba ativa', async ({ page }) => {
  await entrar(page);
  await page.goto('/agenda');
  await expect(abas(page).getByRole('link', { name: /^Agenda/ })).toHaveAttribute('aria-current', 'page');
});

test('Mais leva ao Caixa e permite sair', async ({ page }) => {
  await entrar(page);
  await abas(page).getByRole('button', { name: 'Mais' }).click();
  const mais = page.getByRole('dialog', { name: 'Mais' });
  await expect(mais.getByRole('link', { name: 'Pacotes e pontos' })).toBeVisible();
  await expect(mais.getByRole('link', { name: 'Configurações' })).toHaveCount(0);
  await mais.getByRole('link', { name: 'Caixa' }).click();
  await expect(page).toHaveURL(/\/caixa$/);
  await expect(abas(page).getByRole('button', { name: 'Mais' })).toHaveAttribute('aria-current', 'page');
  await abas(page).getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('dialog', { name: 'Mais' }).getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});

test('dona vê Configurações no Mais', async ({ page }) => {
  await entrar(page, 'dona@exemplo.dev');
  await abas(page).getByRole('button', { name: 'Mais' }).click();
  await expect(page.getByRole('dialog', { name: 'Mais' }).getByRole('link', { name: 'Configurações' })).toBeVisible();
});

test('abas acessíveis ao toque', async ({ page }) => {
  await entrar(page);
  const itens = abas(page).locator('a, button');
  await expect(itens).toHaveCount(5);
  for (const el of await itens.all()) expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
