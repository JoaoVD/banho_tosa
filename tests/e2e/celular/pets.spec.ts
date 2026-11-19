import { expect, test, type Page } from '@playwright/test';
import { entrar } from '../helpers';

const lista = (page: Page) => page.getByRole('link', { name: /Luna/ });
const fichaDe = (page: Page, nome: string) => page.getByRole('heading', { level: 2, name: nome });

test.beforeEach(async ({ page }) => { await entrar(page); });

test('/pets mostra só a lista', async ({ page }) => {
  await page.goto('/pets');
  await expect(lista(page)).toBeVisible();
  await expect(fichaDe(page, 'Bob')).toBeHidden();
});

test('tocar num pet abre a ficha e voltar retorna à lista', async ({ page }) => {
  await page.goto('/pets');
  await lista(page).click();
  await expect(page).toHaveURL(/\/pets\/[0-9a-f-]+/);
  await expect(fichaDe(page, 'Luna')).toBeVisible();
  await expect(lista(page)).toBeHidden();
  await page.getByRole('link', { name: 'Pets', exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/pets$/);
  await expect(lista(page)).toBeVisible();
});

test('busca global no celular leva à lista filtrada', async ({ page }) => {
  await page.getByRole('button', { name: 'Buscar' }).click();
  const campo = page.getByRole('searchbox').or(page.getByLabel('Buscar pet, tutor ou telefone'));
  await campo.fill('Nina');
  await campo.press('Enter');
  await expect(page).toHaveURL(/\/pets\?q=Nina/);
  await expect(page.getByRole('link', { name: /Nina/ })).toBeVisible();
  await expect(fichaDe(page, 'Nina')).toBeHidden();
});

test('ações rápidas da ficha com 44 px', async ({ page }) => {
  await page.goto('/pets');
  await lista(page).click();
  for (const nome of ['Mensagem', 'Agendar']) {
    const el = page.getByRole('link', { name: nome, exact: true });
    expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test('o ✕ fecha a busca mesmo com o campo vazio', async ({ page }) => {
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByLabel('Buscar pet, tutor ou telefone')).toBeFocused();
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByLabel('Buscar pet, tutor ou telefone')).toBeHidden();
});
