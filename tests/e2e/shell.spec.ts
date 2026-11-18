import { expect, test } from '@playwright/test';
import { entrar, violacoesGraves } from './helpers';

const ITENS = ['Hoje', 'Agenda', 'Mensagens', 'Pets e tutores', 'Pacotes e pontos', 'Caixa'];

test('recepção vê os 6 itens e não vê Configurações', async ({ page }) => {
  await entrar(page);
  const nav = page.getByRole('navigation', { name: 'Menu principal' });
  for (const item of ITENS) await expect(nav.getByRole('link', { name: item })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Configurações' })).toHaveCount(0);
});

test('dona vê Configurações', async ({ page }) => {
  await entrar(page, 'dona@exemplo.dev');
  await expect(page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'Configurações' })).toBeVisible();
});

test('cada item do menu muda o título da barra', async ({ page }) => {
  await entrar(page);
  for (const item of ITENS) {
    await page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: item }).click();
    await expect(page.getByTestId('toolbar-title')).toHaveText(item);
  }
});

test('Hoje não tem violações graves de acessibilidade', async ({ page }) => {
  await entrar(page);
  expect(await violacoesGraves(page)).toEqual([]);
});
