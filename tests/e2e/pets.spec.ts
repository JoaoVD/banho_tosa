import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test.beforeEach(() => resetarDados());

test('cadastra tutor e pet, filtra, abre a ficha e desliga lembretes', async ({ page }) => {
  await entrar(page);
  await page.goto('/pets');
  await page.getByRole('link', { name: 'Cadastrar pet' }).first().click();
  await page.getByLabel('Nome do tutor').fill('Laura Dias');
  await page.getByLabel('WhatsApp do tutor').fill('(11) 91234-5678');
  await page.getByLabel('Nome do pet').fill('Paçoca');
  await page.getByLabel('Raça').fill('Lhasa apso');
  await page.getByLabel('Porte').selectOption('pequeno');
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await expect(page.getByRole('heading', { name: 'Paçoca' })).toBeVisible();
  await expect(page.getByText('Lhasa apso, porte pequeno')).toBeVisible();

  await page.goto('/pets');
  await page.getByLabel('Filtrar').fill('Paçoca');
  await expect(page.getByRole('link', { name: /Paçoca/ })).toHaveCount(1);
  await page.getByRole('link', { name: /Paçoca/ }).click();

  const sw = page.getByRole('switch', { name: 'Lembretes automáticos' });
  await expect(sw).toBeChecked();
  await sw.click();
  await expect(page.getByText('Lembretes desligados')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Lembretes automáticos' })).not.toBeChecked();
});

test('busca da barra superior sem resultado oferece cadastrar', async ({ page }) => {
  await entrar(page);
  await page.getByLabel('Buscar pet, tutor ou telefone').fill('Zeferino');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Nenhum pet ou tutor com “Zeferino”.')).toBeVisible();
});
