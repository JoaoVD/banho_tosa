import { expect, test, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { entrar, resetarDados } from '../helpers';

const etapa = (page: Page) => page.getByRole('group', { name: 'Etapa' });
const colunasVisiveis = (page: Page) => page.locator('section[aria-label]').filter({ visible: true });

test.beforeEach(() => resetarDados());
test.afterAll(() => resetarDados());

test('uma etapa por vez', async ({ page }) => {
  await entrar(page);
  await expect(colunasVisiveis(page)).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Chegando' })).toBeVisible();
  await etapa(page).getByRole('button', { name: /^No banho/ }).click();
  await expect(page.getByRole('region', { name: 'No banho' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Chegando' })).toBeHidden();
  await expect(colunasVisiveis(page)).toHaveCount(1);
});

test('avançar pelo botão do cartão', async ({ page }) => {
  await entrar(page);
  await page.getByRole('region', { name: 'Chegando' }).getByRole('article', { name: /Bob/ }).getByRole('button', { name: 'Começar banho' }).click();
  await expect(page.getByText('Bob em “No banho”')).toBeVisible();
  await etapa(page).getByRole('button', { name: /^No banho/ }).click();
  await expect(page.getByRole('region', { name: 'No banho' }).getByText('Bob', { exact: true })).toBeVisible();
});

test('começa na primeira etapa com pets', async ({ page }) => {
  await entrar(page);
  for (const pet of ['Bob', 'Nina']) {
    await page.getByRole('region', { name: 'Chegando' }).getByRole('article', { name: new RegExp(pet) }).getByRole('button', { name: 'Começar banho' }).click();
    await expect(page.getByText(`${pet} em “No banho”`)).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole('region', { name: 'No banho' })).toBeVisible();
  await expect(etapa(page).getByRole('button', { name: /^No banho/ })).toHaveAttribute('aria-pressed', 'true');
});

test('dia vazio mostra Chegando com o estado vazio', async ({ page }) => {
  execSync('npx tsx scripts/seed.ts', { stdio: 'ignore', env: { ...process.env, SEED_DIA: '2026-11-25' } });
  await entrar(page);
  await expect(page.getByRole('region', { name: 'Chegando' })).toBeVisible();
  await expect(page.getByText('Ninguém chegando agora.')).toBeVisible();
});

test('sem alça de arrastar no celular', async ({ page }) => {
  await entrar(page);
  await expect(page.getByRole('button', { name: 'Mover Bob' })).toBeHidden();
});

test('resumo em 2×2', async ({ page }) => {
  await entrar(page);
  const w = page.locator('.widgets .widget');
  await expect(w).toHaveCount(4);
  const [a, b, c] = await Promise.all([0, 1, 2].map(async (i) => (await w.nth(i).boundingBox())!));
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(c.y).toBeGreaterThan(a.y + a.height - 1);
});
