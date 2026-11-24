import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import { entrar, resetarDados, violacoesGraves } from './helpers';

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres@localhost:54329/postgres', { onnotice: () => {} });
test.afterAll(() => sql.end());

const coluna = (page: Page, nome: string) => page.getByRole('region', { name: nome });

test('um dia na loja, do começo ao fim', async ({ page, request }) => {
  test.setTimeout(120_000);
  resetarDados();
  await entrar(page);

  // 1. Bob: banho, pronto, avisa a tutora
  await coluna(page, 'Chegando').getByRole('article', { name: /Bob/ }).getByRole('button', { name: 'Começar banho' }).click();
  await coluna(page, 'No banho').getByRole('article', { name: /Bob/ }).getByRole('button', { name: 'Marcar como pronto' }).click();
  const bob = coluna(page, 'Pronto para buscar').getByRole('article', { name: /Bob/ });
  await bob.getByRole('button', { name: 'Concluir' }).click();
  await expect(bob.getByText(/Tutor avisado às/)).toBeVisible();

  // 2. Bob sai pelo pacote
  await bob.getByRole('button', { name: 'Receber R$ 0,00' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar uso do pacote' }).click();
  await expect(bob.getByText('Pago')).toBeVisible();

  // 3. Luna em dinheiro
  const luna = coluna(page, 'Pronto para buscar').getByRole('article', { name: /Luna/ });
  await luna.getByRole('button', { name: 'Receber R$ 85,00' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Dinheiro' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Receber R$ 85,00' }).click();
  await expect(luna.getByText('Pago')).toBeVisible();

  // 4. Ana responde o lembrete e a recepção confirma
  await request.post('/api/dev/whatsapp/inbound', { data: { from: '(11) 98765-0000', text: 'Pode sim!' } });
  await page.goto('/mensagens');
  await page.getByRole('button', { name: /Ana Souza/ }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Thor agendado para quinta às 10:00')).toBeVisible();

  // 5. Agenda a Nina para sexta num horário livre
  await page.goto('/agenda?dia=2026-11-20');
  await page.getByRole('region', { name: 'Júlia, banho' }).getByRole('button', { name: 'Livre às 08:00' }).click();
  const d = page.getByRole('dialog', { name: 'Novo agendamento' });
  await d.getByLabel('Pet').selectOption({ label: 'Nina, Rafael Costa' });
  await d.getByLabel('Serviço').selectOption({ label: 'Banho' });
  await d.getByRole('button', { name: 'Agendar' }).click();
  await expect(page.getByText(/Nina agendado, 08:00 com Júlia/)).toBeVisible();

  // 6. Fecha o caixa
  await page.goto('/caixa');
  await expect(page.getByTestId('total-dia')).toHaveText('R$ 215,00');
  await page.getByLabel('Contado na gaveta').fill('85,00');
  await expect(page.getByTestId('diferenca')).toHaveText('Confere');
  await page.getByRole('button', { name: 'Fechar caixa' }).click();
  await expect(page.getByText(/Fechado às/)).toBeVisible();

  // Mensagens na fila: avisos e confirmações, nenhum lembrete de retorno (o worker não rodou)
  const tipos = (await sql`select tipo from fila_envio order by criada_em`).map((r) => r.tipo);
  expect(tipos.sort()).toEqual(['confirmacao', 'confirmacao', 'pronto', 'resumo_caixa']);
});

test('nenhuma tela principal tem violação grave de acessibilidade', async ({ page }) => {
  test.setTimeout(180_000);
  resetarDados();
  await entrar(page, 'dona');
  await page.goto('/pets');
  const ficha = await page.getByRole('link', { name: /Thor/ }).first().getAttribute('href');
  const rotas = ['/hoje', '/agenda', '/pets', ficha!, '/mensagens', '/pacotes', '/caixa', '/configuracoes', '/configuracoes/servicos', '/configuracoes/mensagens', '/configuracoes/whatsapp', '/configuracoes/importar', '/entrar'];
  const problemas: string[] = [];
  for (const r of rotas) {
    await page.goto(r);
    for (const v of await violacoesGraves(page)) problemas.push(`${r}: ${v}`);
  }
  expect(problemas).toEqual([]);
});
