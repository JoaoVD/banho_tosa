/* Prints do sistema no celular (iPhone 13, 2x). Uso: com o app rodando em BASE (padrão http://localhost:3000)
   e os dados de exemplo carregados: node scripts/prints-celular.mjs */
import { chromium, devices } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = 'docs/screenshots/celular';

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
  const p = await c.newPage();
  const semIndicador = () => p.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  const foto = async (nome) => { await semIndicador(); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${nome}.png` }); };
  await p.goto(`${BASE}/entrar`);
  await p.getByLabel('E-mail').fill('dona@exemplo.dev');
  await p.getByLabel('Senha').fill('dev');
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL(/hoje/);
  await foto('01-hoje');
  await p.goto(`${BASE}/agenda`); await foto('02-agenda');
  await p.goto(`${BASE}/mensagens`); await foto('03-mensagens');
  const conversa = p.locator('main .glist button').first();
  if (await conversa.count()) { await conversa.click(); await foto('04-conversa'); }
  await p.goto(`${BASE}/pets`); await foto('05-pets');
  await p.getByRole('link', { name: /Luna/ }).click(); await p.waitForURL(/pets\//); await foto('06-ficha');
  await p.getByRole('button', { name: 'Mais' }).click(); await foto('07-mais');
  await p.goto(`${BASE}/agenda?novo=1`); await foto('08-agendar');
  await b.close();
})();
