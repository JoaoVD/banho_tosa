import { expect, test } from '@playwright/test';
import { entrar, resetarDados } from './helpers';

test('dona muda o preço do Banho para porte pequeno', async ({ page }) => {
  await entrar(page, 'dona');
  await page.goto('/configuracoes/servicos');
  await page.getByRole('link', { name: /^Banho\b/ }).first().click();
  await page.getByLabel('Preço Pequeno').fill('75,00');
  await page.getByRole('button', { name: 'Salvar serviço' }).click();
  await expect(page.getByText('Serviço salvo')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Preço Pequeno')).toHaveValue('75,00');
});

test('recepção é mandada de volta para o Hoje', async ({ page }) => {
  await entrar(page);
  await page.goto('/configuracoes');
  await expect(page).toHaveURL(/\/hoje$/);
});

test('dona altera o teto diário de mensagens', async ({ page }) => {
  await entrar(page, 'dona');
  await page.goto('/configuracoes/envio');
  await page.getByLabel('Teto diário de mensagens automáticas').fill('120');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Configurações salvas')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Teto diário de mensagens automáticas')).toHaveValue('120');
});

test.describe('usuários', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, 'dona');
    await page.goto('/configuracoes/usuarios');
  });
  test.afterAll(() => resetarDados());

  test('dona cria usuário e ele entra', async ({ page }) => {
    await page.getByLabel('Nome').fill('Carla');
    await page.getByLabel('Usuário').fill('carla.tosa');
    await page.getByLabel('Senha inicial').fill('senha1234');
    await page.getByRole('button', { name: 'Criar usuário' }).click();
    await expect(page.getByText('Usuário criado')).toBeVisible();
    await expect(page.getByText('carla.tosa')).toBeVisible();
    await page.context().clearCookies();
    await entrar(page, 'carla.tosa');
  });

  test('usuário repetido mostra erro', async ({ page }) => {
    await page.getByLabel('Nome').fill('Outra');
    await page.getByLabel('Usuário').fill('RECEPCAO');
    await page.getByLabel('Senha inicial').fill('senha1234');
    await page.getByRole('button', { name: 'Criar usuário' }).click();
    await expect(page.getByText('Esse usuário já existe.')).toBeVisible();
  });

  test('senha curta mostra erro', async ({ page }) => {
    await page.getByLabel('Nome').fill('Curta');
    await page.getByLabel('Usuário').fill('curta');
    await page.getByLabel('Senha inicial').fill('123');
    await page.getByRole('button', { name: 'Criar usuário' }).click();
    await expect(page.getByText('Mínimo de 8 caracteres.')).toBeVisible();
  });

  test('usuário com formato inválido mostra erro', async ({ page }) => {
    await page.getByLabel('Nome').fill('Inválido');
    await page.getByLabel('Usuário').fill('joão silva');
    await page.getByLabel('Senha inicial').fill('senha1234');
    await page.getByRole('button', { name: 'Criar usuário' }).click();
    await expect(page.getByText('Use de 3 a 30 letras sem acento, números, ponto, hífen ou sublinhado.')).toBeVisible();
  });

  test('redefinir senha mostra confirmação', async ({ page }) => {
    await page.getByRole('button', { name: 'Redefinir senha de Renata' }).click();
    const folha = page.getByRole('dialog', { name: 'Redefinir senha de Renata' });
    await folha.getByLabel('Nova senha').fill('novasenha1');
    await folha.getByRole('button', { name: 'Redefinir senha' }).click();
    await expect(page.getByText('Senha redefinida')).toBeVisible();
  });
});
