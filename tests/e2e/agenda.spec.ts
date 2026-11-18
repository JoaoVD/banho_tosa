import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test.beforeEach(() => resetarDados());

test('agenda pelo horário livre e o atendimento aparece na agenda', async ({ page }) => {
  await entrar(page);
  await page.goto('/agenda?dia=2026-11-18');
  const julia = page.getByRole('region', { name: 'Júlia, banho' });
  await julia.getByRole('button', { name: 'Livre às 13:30' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo agendamento' });
  await dialog.getByLabel('Pet').selectOption({ label: 'Mel, Pedro Alves' });
  await dialog.getByLabel('Serviço').selectOption({ label: 'Banho' });
  await expect(dialog.getByLabel('Horário livre')).toHaveValue(/T16:30:00/);
  await dialog.getByRole('button', { name: 'Agendar' }).click();
  await expect(page.getByText(/Mel agendado, 13:30 com Júlia/)).toBeVisible();
  await expect(julia.getByText('Mel').nth(1)).toBeVisible();
});

test('sem pet escolhido mostra o erro embaixo do campo', async ({ page }) => {
  await entrar(page);
  await page.goto('/agenda?dia=2026-11-20&novo=1');
  const dialog = page.getByRole('dialog', { name: 'Novo agendamento' });
  await dialog.getByRole('button', { name: 'Agendar' }).click();
  await expect(dialog.getByText('Escolha o pet para agendar.')).toBeVisible();
});

test('dia vazio mostra o dia todo livre', async ({ page }) => {
  await entrar(page);
  await page.goto('/agenda?dia=2026-11-20');
  await expect(page.getByRole('region', { name: 'Júlia, banho' }).getByRole('button', { name: 'Livre às 08:00' })).toBeVisible();
});
