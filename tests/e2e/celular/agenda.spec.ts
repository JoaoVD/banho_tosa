import { expect, test, type Page } from '@playwright/test';
import { entrar, resetarDados } from '../helpers';

const prof = (page: Page) => page.getByRole('group', { name: 'Profissional' });

test.beforeEach(async ({ page }) => { resetarDados(); await entrar(page); });
test.afterAll(() => resetarDados());

test('um profissional por vez', async ({ page }) => {
  await page.goto('/agenda');
  await expect(page.getByRole('region', { name: 'Júlia, banho' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Marcos, tosa' })).toBeHidden();
  await prof(page).getByRole('button', { name: 'Marcos' }).click();
  await expect(page.getByRole('region', { name: 'Marcos, tosa' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Júlia, banho' })).toBeHidden();
  const lane = (await page.getByRole('region', { name: 'Marcos, tosa' }).boundingBox())!;
  expect(lane.x + lane.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('agendar tocando num horário livre', async ({ page }) => {
  await page.goto('/agenda');
  await page.getByRole('region', { name: 'Júlia, banho' }).getByRole('button', { name: 'Livre às 13:30' }).click();
  const folha = page.getByRole('dialog');
  await expect(folha).toBeVisible();
  await expect(folha.getByRole('button', { name: /^Agendar/ })).toBeVisible();
});

test('semana em lista', async ({ page }) => {
  await page.goto('/agenda?modo=semana');
  await expect(page.locator('table').filter({ visible: true })).toHaveCount(0);
  const dia = page.getByRole('list', { name: 'Semana' }).getByRole('listitem').filter({ hasText: 'Qua 18/11' });
  await expect(dia).toContainText('Júlia');
  await expect(dia).toContainText('Marcos');
  await dia.getByRole('link', { name: /qua 18\/11/i }).click();
  await expect(page).toHaveURL(/modo=dia/);
});

test('setas da semana com 44 px', async ({ page }) => {
  await page.goto('/agenda');
  for (const nome of ['Semana anterior', 'Próxima semana']) expect((await page.getByRole('link', { name: nome }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
