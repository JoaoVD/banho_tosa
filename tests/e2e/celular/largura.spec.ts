import { expect, test } from '@playwright/test';
import { entrar, violacoesGraves } from '../helpers';

const ROTAS = ['/hoje', '/agenda', '/agenda?modo=semana', '/mensagens', '/pets', '/pets/novo', '/pacotes', '/caixa',
  '/configuracoes/loja', '/configuracoes/servicos', '/configuracoes/importar', '/configuracoes/mensagens'];
// Telas ainda não adaptadas: liberadas tarefa a tarefa do plano.
const PENDENTES = new Set<string>(['/hoje', '/agenda', '/agenda?modo=semana', '/mensagens', '/pets']);

for (const largura of [390, 820]) {
  test.describe(`${largura}px`, () => {
    test.use({ viewport: { width: largura, height: 844 } });
    for (const rota of ROTAS) {
      test(`sem rolagem lateral em ${rota}`, async ({ page }) => {
        test.fixme(PENDENTES.has(rota), 'tela ainda não adaptada');
        await entrar(page, 'dona@exemplo.dev');
        await page.goto(rota);
        await page.waitForLoadState('networkidle');
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(largura);
      });
    }
  });
}

for (const rota of ['/hoje', '/agenda', '/pets', '/mensagens']) {
  test(`acessibilidade no celular em ${rota}`, async ({ page }) => {
    test.fixme(PENDENTES.has(rota), 'tela ainda não adaptada');
    await entrar(page, 'dona@exemplo.dev');
    await page.goto(rota);
    expect(await violacoesGraves(page)).toEqual([]);
  });
}
