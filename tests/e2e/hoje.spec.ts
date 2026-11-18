import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test.beforeEach(async ({ page }) => {
  resetarDados();
  await entrar(page);
});

const coluna = (page: import('@playwright/test').Page, nome: string) => page.getByRole('region', { name: nome });

test('widgets e quadro do dia', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Bom dia, Renata' })).toBeVisible();
  await expect(page.getByTestId('widget-em-atendimento')).toContainText('2');
  await expect(coluna(page, 'Na tosa').getByText('Pipoca', { exact: true })).toBeVisible();
});

test('marcar como pronto e desfazer', async ({ page }) => {
  const pipoca = coluna(page, 'Na tosa').getByRole('article', { name: /Pipoca/ });
  await pipoca.getByRole('button', { name: 'Marcar como pronto' }).click();
  await expect(coluna(page, 'Pronto para buscar').getByText('Pipoca', { exact: true })).toBeVisible();
  await expect(page.getByText('Pipoca terminou. Avisar Beatriz?')).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(coluna(page, 'Na tosa').getByText('Pipoca', { exact: true })).toBeVisible();
});

test('mover pelo teclado', async ({ page }) => {
  const handle = page.getByRole('button', { name: 'Mover Bob' });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(coluna(page, 'No banho').getByText('Bob', { exact: true })).toBeVisible();
});

test('concluir sem mensagem anota “Tutor não avisado”', async ({ page }) => {
  const thor = coluna(page, 'No banho').getByRole('article', { name: /Thor/ });
  await thor.getByRole('button', { name: 'Levar para tosa' }).click();
  await coluna(page, 'Na tosa').getByRole('article', { name: /Thor/ }).getByRole('button', { name: 'Marcar como pronto' }).click();
  const card = coluna(page, 'Pronto para buscar').getByRole('article', { name: /Thor/ });
  await card.getByRole('switch', { name: 'Mensagem no WhatsApp' }).click();
  await card.getByRole('button', { name: 'Concluir' }).click();
  await expect(card.getByText('Tutor não avisado')).toBeVisible();
});
