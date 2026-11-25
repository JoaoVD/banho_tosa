import { expect, test, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { resetarDados } from './helpers';

const DB = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:54329/postgres';

async function cadastrar(page: Page) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome do pet shop').fill('Pet Spa Bela Vista');
  await page.getByLabel('Seu nome').fill('Mariana');
  await page.getByLabel('Usuário').fill('mariana');
  await page.getByLabel('E-mail').fill('mariana@exemplo.dev');
  await page.getByLabel('Senha').fill('senha1234');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/boas-vindas$/);
}
const conversa = (page: Page) => page.getByRole('log', { name: 'Primeiro acesso' });

test.beforeEach(() => resetarDados());
test.afterAll(() => resetarDados());

test('conversa completa deixa a loja pronta para agendar', async ({ page }) => {
  await cadastrar(page);
  await expect(conversa(page).getByText(/Oi, Mariana!/)).toBeVisible();
  // Horários
  await page.getByRole('button', { name: 'Seg a Sex 8h–18h, Sáb 8h–14h' }).click();
  await expect(conversa(page).getByText('Seg a Sex, 08:00–18:00 · Sáb, 08:00–14:00')).toBeVisible();
  // Equipe
  await page.getByLabel('Nome de quem trabalha').fill('Júlia');
  await page.getByRole('group', { name: 'Função' }).getByRole('button', { name: 'Banho' }).click();
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByLabel('Nome de quem trabalha').fill('Marcos');
  await page.getByRole('group', { name: 'Função' }).getByRole('button', { name: 'Tosa' }).click();
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(conversa(page).getByText('Júlia (banho) e Marcos (tosa)')).toBeVisible();
  // Serviços com preço ajustado
  await page.getByRole('button', { name: 'Ajustar preços' }).click();
  await page.getByLabel('Banho, Pequeno').fill('75,00');
  await page.getByRole('button', { name: 'Salvar preços' }).click();
  await expect(conversa(page).getByText('7 serviços com preços')).toBeVisible();
  // Clientes
  await page.getByRole('button', { name: 'Cadastrar aos poucos' }).click();
  await expect(conversa(page).getByText(/Pronto!/)).toBeVisible();
  await page.getByRole('link', { name: 'Ir para o Hoje' }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  // A agenda já funciona e o preço ajustado ficou salvo.
  await page.goto('/agenda?dia=2026-11-20');
  await expect(page.getByRole('region', { name: 'Júlia, banho' }).getByRole('button', { name: 'Livre às 08:00' })).toBeVisible();
  await page.goto('/configuracoes/servicos');
  await page.getByRole('link', { name: /^Banho\b/ }).first().click();
  await expect(page.getByLabel('Preço Pequeno')).toHaveValue('75,00');
  // Loja nova: Mensagens avisa que o WhatsApp não está disponível.
  await page.goto('/mensagens');
  await expect(page.getByText('O WhatsApp ainda não está disponível para esta loja.')).toBeVisible();
});

test('recarregar no meio continua de onde parou', async ({ page }) => {
  await cadastrar(page);
  await page.getByRole('button', { name: 'Seg a Sáb 8h–18h' }).click();
  await expect(page.getByLabel('Nome de quem trabalha')).toBeVisible();
  await page.reload();
  await expect(conversa(page).getByText('Seg a Sáb, 08:00–18:00')).toBeVisible();
  await expect(page.getByLabel('Nome de quem trabalha')).toBeVisible();
});

test('horário "Outro" e refazer uma resposta', async ({ page }) => {
  await cadastrar(page);
  await page.getByRole('button', { name: 'Outro horário' }).click();
  for (const d of ['Ter', 'Qui']) await page.getByRole('group', { name: 'Dias abertos' }).getByRole('button', { name: d }).click();
  await page.getByLabel('Abre às').fill('09:00');
  await page.getByLabel('Fecha às').fill('17:00');
  await page.getByRole('button', { name: 'Salvar horários' }).click();
  await expect(conversa(page).getByText('Ter e Qui, 09:00–17:00')).toBeVisible();
  await page.getByRole('button', { name: 'Alterar horários' }).click();
  await page.getByRole('button', { name: 'Seg a Sáb 8h–18h' }).click();
  await expect(conversa(page).getByText('Seg a Sáb, 08:00–18:00')).toBeVisible();
  await expect(conversa(page).getByText('Ter e Qui, 09:00–17:00')).toHaveCount(0);
});

test('importar planilha leva à importação', async ({ page }) => {
  await cadastrar(page);
  await page.getByRole('button', { name: 'Seg a Sáb 8h–18h' }).click();
  await page.getByLabel('Nome de quem trabalha').fill('Júlia');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Está ótimo' }).click();
  await page.getByRole('button', { name: 'Importar planilha' }).click();
  await expect(page).toHaveURL(/\/configuracoes\/importar$/);
});

test('preço ajustado continua certo ao alterar serviços de novo', async ({ page }) => {
  await cadastrar(page);
  await page.getByRole('button', { name: 'Seg a Sáb 8h–18h' }).click();
  await page.getByLabel('Nome de quem trabalha').fill('Júlia');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Ajustar preços' }).click();
  await page.getByLabel('Banho, Pequeno').fill('75,00');
  await page.getByRole('button', { name: 'Salvar preços' }).click();
  await page.getByRole('button', { name: 'Alterar serviços' }).click();
  await page.getByRole('button', { name: 'Ajustar preços' }).click();
  await expect(page.getByLabel('Banho, Pequeno')).toHaveValue('75,00');
});

test('loja nova não vê nem conecta o WhatsApp do servidor', async ({ page }) => {
  await cadastrar(page);
  execSync(`psql "${DB}" -q -c "update lojas set onboarding_concluido = true where nome = 'Pet Spa Bela Vista'"`);
  await page.goto('/configuracoes/whatsapp');
  await expect(page.getByText('O WhatsApp ainda não está disponível para esta loja.')).toBeVisible();
  await expect(page.getByRole('img', { name: /QR/i })).toHaveCount(0);
  await expect(page.getByText(/Conectado/)).toHaveCount(0);
});
