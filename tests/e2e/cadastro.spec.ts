import { expect, test, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { resetarDados } from './helpers';

const DB = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:54329/postgres';

async function preencher(page: Page, d: Partial<Record<'loja' | 'nome' | 'usuario' | 'email' | 'senha', string>> = {}) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome do pet shop').fill(d.loja ?? 'Pet Spa Bela Vista');
  await page.getByLabel('Seu nome').fill(d.nome ?? 'Mariana');
  await page.getByLabel('Usuário').fill(d.usuario ?? 'mariana');
  await page.getByLabel('E-mail').fill(d.email ?? 'mariana@exemplo.dev');
  await page.getByLabel('Senha').fill(d.senha ?? 'senha1234');
}

test.beforeEach(() => resetarDados());
test.afterAll(() => resetarDados());

test('a tela Entrar leva ao cadastro', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
});

test('cria a conta e já entra no primeiro acesso', async ({ page }) => {
  await preencher(page);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/boas-vindas$/);
  await expect(page.getByText(/Oi, Mariana!/)).toBeVisible();
});

test('usuário repetido', async ({ page }) => {
  await preencher(page, { usuario: 'Recepcao' });
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Esse usuário já existe.')).toBeVisible();
});

test('e-mail repetido', async ({ page }) => {
  await preencher(page, { email: 'DONA@exemplo.dev' });
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Esse e-mail já tem conta.')).toBeVisible();
});

test('senha curta e campos vazios', async ({ page }) => {
  await preencher(page, { senha: '123', loja: ' ' });
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Mínimo de 8 caracteres.')).toBeVisible();
  await expect(page.getByText('Informe o nome do pet shop.')).toBeVisible();
});

test('robô que preenche o campo escondido é recusado', async ({ page }) => {
  await preencher(page);
  await page.locator('input[name="site"]').evaluate((el: HTMLInputElement) => { el.value = 'http://spam'; });
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Não foi possível criar a conta.')).toBeVisible();
  await expect(page).toHaveURL(/\/cadastro$/);
});

test('limite de cadastros por hora', async ({ page }) => {
  const ips = ['0:0:0:0::/64', '127.0.0.1', 'desconhecido'];
  const valores = ips.flatMap((ip) => Array.from({ length: 5 }, () => `('${ip}', now())`)).join(',');
  execSync(`psql "${DB}" -q -c "insert into cadastros_tentativas (ip, em) values ${valores}"`);
  await preencher(page);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Muitos cadastros feitos daqui agora. Tente de novo mais tarde.')).toBeVisible();
});
