/*
 * Loja de demonstração para apresentações.
 *
 *   npx tsx scripts/demo.ts > demo.sql            (SQL para o Supabase: cola no SQL Editor)
 *   npx tsx scripts/demo.ts --local | psql ...     (banco local de desenvolvimento)
 *
 * Apaga e recria só a loja demo (as outras lojas não são tocadas). As datas são relativas a
 * hoje: rode de novo antes de cada apresentação para o quadro do dia ficar atual.
 * A loja fica marcada como demo: o worker nunca envia WhatsApp para ela.
 */
import { randomUUID } from 'node:crypto';
import { addDaysKey, atSP, dayKeySP } from '../src/domain/time';

export const DEMO = {
  loja: 'de300000-0000-4000-8000-000000000001',
  dona: 'de300000-0000-4000-8000-0000000000d1',
  recepcao: 'de300000-0000-4000-8000-0000000000e1',
  emailDona: 'dona.demo@exemplo.com.br',
  emailRecepcao: 'recepcao.demo@exemplo.com.br',
  senha: 'demo1234',
};

type Porte = 'mini' | 'pequeno' | 'medio' | 'grande' | 'gigante';
const PORTES: Porte[] = ['mini', 'pequeno', 'medio', 'grande', 'gigante'];

// ---------- utilidades ----------
let semente = 20261118;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const id = () => randomUUID();
const out: string[] = [];
const lit = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return `'${v.toISOString()}'::timestamptz`;
  if (Array.isArray(v)) return v.length ? `array[${v.map(lit).join(', ')}]::text[]` : `'{}'::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
function ins(tabela: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  for (let i = 0; i < rows.length; i += 200) {
    const parte = rows.slice(i, i + 200).map((r) => `(${cols.map((c) => lit(r[c])).join(', ')})`).join(',\n  ');
    out.push(`insert into ${tabela} (${cols.join(', ')}) values\n  ${parte};`);
  }
}
const min = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
const dow = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();

// ---------- catálogo ----------
const SERVICOS: { nome: string; banho: boolean; tosa: boolean; ciclo: number; precos: Record<Porte, [number, number]> }[] = [
  { nome: 'Banho', banho: true, tosa: false, ciclo: 15, precos: { mini: [5000, 45], pequeno: [7000, 60], medio: [8500, 75], grande: [11000, 90], gigante: [14000, 120] } },
  { nome: 'Banho + tosa higiênica', banho: true, tosa: true, ciclo: 15, precos: { mini: [7000, 75], pequeno: [8500, 90], medio: [10000, 105], grande: [13000, 120], gigante: [16000, 150] } },
  { nome: 'Banho + hidratação', banho: true, tosa: false, ciclo: 15, precos: { mini: [9000, 60], pequeno: [11000, 75], medio: [12500, 90], grande: [15000, 105], gigante: [18000, 135] } },
  { nome: 'Banho + escovação', banho: true, tosa: false, ciclo: 15, precos: { mini: [7000, 60], pequeno: [9000, 75], medio: [11000, 90], grande: [13000, 105], gigante: [16000, 135] } },
  { nome: 'Banho + tosa bebê', banho: true, tosa: true, ciclo: 21, precos: { mini: [8000, 90], pequeno: [9500, 105], medio: [11500, 120], grande: [14500, 150], gigante: [17500, 180] } },
  { nome: 'Tosa na tesoura', banho: false, tosa: true, ciclo: 30, precos: { mini: [10000, 75], pequeno: [12000, 90], medio: [14000, 105], grande: [17000, 120], gigante: [20000, 150] } },
  { nome: 'Tosa da raça', banho: false, tosa: true, ciclo: 30, precos: { mini: [10000, 75], pequeno: [12000, 90], medio: [14000, 105], grande: [17000, 120], gigante: [20000, 150] } },
];

// tutor, final do telefone, pets: [nome, raça, porte, serviço habitual, cuidados]
const CLIENTES: [string, string, [string, string, Porte, string, string[]][]][] = [
  ['Ana Souza', '0101', [['Thor', 'Shih-tzu', 'pequeno', 'Banho + tosa higiênica', ['Sensível nas orelhas', 'Secador no morno']]]],
  ['Pedro Alves', '0102', [['Mel', 'Golden retriever', 'grande', 'Banho + escovação', ['Solta muito pelo, escovar antes']]]],
  ['Carla Mendes', '0103', [['Bob', 'Spitz alemão', 'pequeno', 'Banho + hidratação', ['Late no secador, começar com toalha']]]],
  ['Beatriz Lima', '0104', [['Pipoca', 'Poodle', 'pequeno', 'Tosa na tesoura', ['Idosa, fazer pausas na tosa']]]],
  ['Juliana Rocha', '0105', [['Luna', 'Sem raça definida', 'medio', 'Banho', ['Medrosa com barulho']], ['Sol', 'Sem raça definida', 'pequeno', 'Banho', []]]],
  ['Rafael Costa', '0106', [['Nina', 'Yorkshire', 'mini', 'Banho + tosa bebê', []]]],
  ['Sônia Prado', '0107', [['Kiara', 'Lhasa apso', 'pequeno', 'Banho + tosa higiênica', ['Não gosta de mexer nas patas']]]],
  ['Marta Reis', '0108', [['Fred', 'Bulldog francês', 'pequeno', 'Banho', ['Braquicefálico: secar com calma']]]],
  ['Lucas Prado', '0109', [['Zeca', 'Schnauzer', 'medio', 'Tosa da raça', []]]],
  ['Diego Alves', '0110', [['Amora', 'Border collie', 'grande', 'Banho + escovação', []]]],
  ['Fernanda Dias', '0111', [['Duque', 'Labrador', 'grande', 'Banho', ['Adora água']]]],
  ['Paulo Martins', '0112', [['Simba', 'Chow chow', 'grande', 'Banho + escovação', ['Pode morder se apertado']]]],
  ['Vera Lúcia', '0113', [['Raja', 'Pastor alemão', 'gigante', 'Banho', []]]],
  ['Camila Torres', '0114', [['Mimi', 'Persa', 'pequeno', 'Banho + hidratação', ['Gato: banho rápido']]]],
  ['Ricardo Gomes', '0115', [['Toby', 'Beagle', 'medio', 'Banho', []], ['Lola', 'Beagle', 'medio', 'Banho', []]]],
  ['Patrícia Nunes', '0116', [['Belinha', 'Maltês', 'mini', 'Banho + tosa bebê', []]]],
  ['André Ribeiro', '0117', [['Max', 'Golden retriever', 'grande', 'Banho', []]]],
  ['Larissa Freitas', '0118', [['Princesa', 'Shih-tzu', 'pequeno', 'Banho + tosa higiênica', ['Laço rosa no final']]]],
  ['Gustavo Pires', '0119', [['Rex', 'Rottweiler', 'gigante', 'Banho', ['Usar focinheira']]]],
  ['Helena Castro', '0120', [['Cacau', 'Dachshund', 'pequeno', 'Banho', []]]],
  ['Bruno Teixeira', '0121', [['Ozzy', 'Pug', 'pequeno', 'Banho', ['Limpar as dobrinhas']]]],
  ['Mariana Lopes', '0122', [['Pandora', 'Spitz alemão', 'mini', 'Banho + hidratação', []]]],
  ['Eduardo Santos', '0123', [['Bidu', 'Sem raça definida', 'medio', 'Banho', []]]],
  ['Renata Moura', '0124', [['Floquinho', 'Bichon frisé', 'pequeno', 'Tosa na tesoura', []]]],
  ['Tiago Barbosa', '0125', [['Apolo', 'Husky siberiano', 'grande', 'Banho + escovação', ['Troca de pelo: escovar bem']]]],
  ['Aline Cardoso', '0126', [['Jade', 'Yorkshire', 'mini', 'Banho + tosa higiênica', []]]],
  ['Felipe Araújo', '0127', [['Marley', 'Labrador', 'grande', 'Banho', []]]],
  ['Isabela Rocha', '0128', [['Lua', 'Poodle', 'medio', 'Tosa na tesoura', []]]],
];

// ---------- geração ----------
export function gerarSqlDemo({ local, hoje }: { local: boolean; hoje: string }): string {
  out.length = 0;
  semente = 20261118;
  const L = DEMO.loja;
  out.push('begin;');
  out.push(`delete from lojas where id = ${lit(L)};`);

  if (local) {
    out.push(`insert into auth.users (id, email) values (${lit(DEMO.dona)}, ${lit(DEMO.emailDona)}), (${lit(DEMO.recepcao)}, ${lit(DEMO.emailRecepcao)}) on conflict do nothing;`);
  } else {
    for (const [uid, email] of [[DEMO.dona, DEMO.emailDona], [DEMO.recepcao, DEMO.emailRecepcao]]) {
      out.push(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', ${lit(uid)}, 'authenticated', 'authenticated', ${lit(email)},
  extensions.crypt(${lit(DEMO.senha)}, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do update set encrypted_password = excluded.encrypted_password;`);
      out.push(`insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (${lit(uid)}, ${lit(uid)}, jsonb_build_object('sub', ${lit(uid)}, 'email', ${lit(email)}, 'email_verified', true), 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;`);
    }
  }

  ins('lojas', [{ id: L, nome: 'Pet Spa Demonstração', telefone_dona: '+5511900000099', onboarding_concluido: true, demo: true }]);
  ins('perfis', [
    { user_id: DEMO.dona, loja_id: L, nome: 'Dona', papel: 'dona' },
    { user_id: DEMO.recepcao, loja_id: L, nome: 'Renata', papel: 'recepcao' },
  ]);
  ins('configuracoes', [{ loja_id: L }]);
  ins('horarios_funcionamento', [0, 1, 2, 3, 4, 5, 6].map((d) => ({ loja_id: L, dia_semana: d, abre: d === 0 ? '09:00' : '08:00', fecha: d === 0 ? '13:00' : d === 6 ? '15:00' : '18:00' })));

  const prof = { julia: id(), diego: id(), marcos: id() };
  ins('profissionais', [
    { id: prof.julia, loja_id: L, nome: 'Júlia', funcao: 'banho' },
    { id: prof.diego, loja_id: L, nome: 'Diego', funcao: 'banho' },
    { id: prof.marcos, loja_id: L, nome: 'Marcos', funcao: 'tosa' },
  ]);
  const serv: Record<string, { id: string; s: (typeof SERVICOS)[number] }> = {};
  for (const s of SERVICOS) serv[s.nome] = { id: id(), s };
  ins('servicos', SERVICOS.map((s) => ({ id: serv[s.nome].id, loja_id: L, nome: s.nome, inclui_banho: s.banho, inclui_tosa: s.tosa, ciclo_padrao_dias: s.ciclo })));
  ins('precos_servico', SERVICOS.flatMap((s) => PORTES.map((p) => ({ servico_id: serv[s.nome].id, loja_id: L, porte: p, preco_centavos: s.precos[p][0], duracao_min: s.precos[p][1] }))));
  ins('premios', [
    { loja_id: L, nome: 'Perfume e laço de brinde', pontos: 300, servico_id: null },
    { loja_id: L, nome: 'Hidratação grátis', pontos: 500, servico_id: null },
    { loja_id: L, nome: 'Banho grátis', pontos: 800, servico_id: serv['Banho'].id },
  ]);
  const modelos = {
    banho4: { id: id(), nome: '4 banhos no mês', preco: 26000, banhos: 4, servico: 'Banho', porte: 'pequeno' as Porte | null, validade: 35 },
    tosa4: { id: id(), nome: '4 banhos + tosa higiênica', preco: 29000, banhos: 4, servico: 'Banho + tosa higiênica', porte: null as Porte | null, validade: 45 },
    grande4: { id: id(), nome: '4 banhos, porte grande', preco: 42000, banhos: 4, servico: 'Banho', porte: 'grande' as Porte | null, validade: 35 },
  };
  ins('pacotes_modelo', Object.values(modelos).map((m) => ({ id: m.id, loja_id: L, nome: m.nome, preco_centavos: m.preco, banhos: m.banhos, servico_id: serv[m.servico].id, porte: m.porte, validade_dias: m.validade })));

  // Tutores e pets
  type Pet = { id: string; tutor: string; tutorNome: string; nome: string; porte: Porte; servico: string };
  const tutores: Record<string, unknown>[] = [];
  const pets: Pet[] = [];
  const petRows: Record<string, unknown>[] = [];
  for (const [nome, fim, ps] of CLIENTES) {
    const tid = id();
    tutores.push({ id: tid, loja_id: L, nome, telefone_e164: `+551190000${fim}`, lembretes_ativos: true });
    for (const [pn, raca, porte, servico, cuidados] of ps) {
      const pid = id();
      pets.push({ id: pid, tutor: tid, tutorNome: nome, nome: pn, porte, servico });
      petRows.push({ id: pid, loja_id: L, tutor_id: tid, nome: pn, especie: raca === 'Persa' ? 'gato' : 'cao', raca, porte, cuidados });
    }
  }
  ins('tutores', tutores);
  ins('pets', petRows);
  const pet = (n: string) => pets.find((p) => p.nome === n)!;

  // Agenda: cursor por profissional e dia, sem sobreposição
  const cursor = new Map<string, number>();
  const agendamentos: Record<string, unknown>[] = [];
  const blocos: Record<string, unknown>[] = [];
  const pagamentos: Record<string, unknown>[] = [];
  const itens: Record<string, unknown>[] = [];
  const pontos: Record<string, unknown>[] = [];
  const banhistas = [prof.julia, prof.diego];
  const abre = (dia: string) => atSP(dia, dow(dia) === 0 ? '09:00' : '08:00').getTime();
  const livre = (p: string, dia: string) => cursor.get(`${p}|${dia}`) ?? abre(dia);

  function marcar(p: Pet, dia: string, etapa: string, servicoNome = p.servico, aPartirDe?: string) {
    const s = serv[servicoNome].s;
    const dur = s.precos[p.porte][1];
    const minimo = aPartirDe ? atSP(dia, aPartirDe).getTime() : 0;
    const banhista = banhistas.reduce((a, b) => (livre(a, dia) <= livre(b, dia) ? a : b));
    let inicio: number, partes: [string, number, number][];
    if (s.banho && s.tosa) {
      const db = Math.round((dur * 0.6) / 5) * 5;
      inicio = Math.max(livre(banhista, dia), livre(prof.marcos, dia) - db * 60_000, minimo);
      partes = [[banhista, inicio, inicio + db * 60_000], [prof.marcos, inicio + db * 60_000, inicio + dur * 60_000]];
    } else {
      const quem = s.banho ? banhista : prof.marcos;
      inicio = Math.max(livre(quem, dia), minimo);
      partes = [[quem, inicio, inicio + dur * 60_000]];
    }
    for (const [q, , f] of partes) cursor.set(`${q}|${dia}`, f + 15 * 60_000);
    const aid = id();
    agendamentos.push({ id: aid, loja_id: L, pet_id: p.id, servico_id: serv[servicoNome].id, preco_centavos: s.precos[p.porte][0], etapa, inicio: new Date(inicio), fim: new Date(inicio + dur * 60_000), aviso_pronto_em: null, aviso_pronto_enviado: null });
    for (const [q, a, b] of partes) blocos.push({ loja_id: L, agendamento_id: aid, profissional_id: q, periodo: `[${new Date(a).toISOString()},${new Date(b).toISOString()})` });
    return { aid, preco: s.precos[p.porte][0], descricao: `${p.nome}, ${servicoNome}`, fim: new Date(inicio + dur * 60_000) };
  }

  function pagar(p: Pet, a: ReturnType<typeof marcar>, dia: string, forma?: string) {
    const f = forma ?? pick(['pix', 'pix', 'pix', 'pix', 'credito', 'credito', 'debito', 'dinheiro', 'dinheiro']);
    const total = f === 'pacote' ? 0 : a.preco;
    const pid = id();
    pagamentos.push({ id: pid, loja_id: L, tutor_id: p.tutor, forma: f, total_centavos: total, pontos_ganhos: Math.floor(total / 100), dia_caixa: dia, recebido_em: min(a.fim, 10), idempotency_key: id() });
    itens.push({ loja_id: L, pagamento_id: pid, agendamento_id: a.aid, descricao: a.descricao, valor_centavos: total, ajuste_motivo: f === 'pacote' ? 'Pacote: banho do pacote' : null });
    if (total) pontos.push({ loja_id: L, tutor_id: p.tutor, delta: Math.floor(total / 100), motivo: 'Atendimento', pagamento_id: pid, em: min(a.fim, 10) });
  }

  // Histórico: últimas visitas no ciclo de cada pet (alguns já "no ponto de voltar")
  const atrasados = new Set(['Kiara', 'Fred', 'Zeca', 'Amora', 'Raja', 'Toby', 'Rex', 'Cacau', 'Marley']);
  const hojeAgenda = new Set(['Mel', 'Luna', 'Pipoca', 'Thor', 'Bob', 'Nina', 'Princesa', 'Duque', 'Ozzy', 'Pandora']);
  const diasPassados = new Set<string>();
  for (const p of pets) {
    const ciclo = serv[p.servico].s.ciclo;
    let ultimo = atrasados.has(p.nome) ? ciclo + 2 + Math.floor(rnd() * 12) : hojeAgenda.has(p.nome) ? ciclo : Math.max(2, Math.floor(rnd() * (ciclo - 3)) + 1);
    if (p.nome === 'Kiara') ultimo = 21;
    const visitas = 2 + Math.floor(rnd() * 3);
    for (let v = 0; v < visitas; v++) {
      let dia = addDaysKey(hoje, -(ultimo + v * ciclo + Math.floor(rnd() * 3) - 1));
      if (dia >= hoje) dia = addDaysKey(hoje, -1);
      const a = marcar(p, dia, 'concluido');
      pagar(p, a, dia);
      diasPassados.add(dia);
    }
  }

  // Hoje: o quadro do dia
  const quadro: [string, string, string | null][] = [
    ['Mel', 'concluido', '08:00'], ['Luna', 'pronto', '08:00'], ['Duque', 'pronto', '08:00'],
    ['Pipoca', 'tosa', '09:00'], ['Thor', 'banho', '10:00'],
    ['Bob', 'agendado', '11:00'], ['Nina', 'agendado', '12:30'], ['Ozzy', 'agendado', '14:00'], ['Pandora', 'agendado', '15:00'], ['Princesa', 'agendado', '16:00'],
  ];
  for (const [n, etapa, h] of quadro) {
    const p = pet(n);
    const a = marcar(p, hoje, etapa, p.servico, h ?? undefined);
    const ag = agendamentos.find((x) => x.id === a.aid)!;
    if (etapa === 'concluido') { ag.aviso_pronto_em = min(a.fim, 5); ag.aviso_pronto_enviado = true; pagar(p, a, hoje, 'pix'); }
    if (n === 'Luna') { ag.aviso_pronto_em = min(a.fim, 3); ag.aviso_pronto_enviado = true; }
  }

  // Próximos dias
  const reservaAna = addDaysKey(hoje, 1);
  const futuros = pets.filter((p) => !hojeAgenda.has(p.nome) && !atrasados.has(p.nome) && p.nome !== 'Kiara');
  let k = 0;
  for (let d = 1; d <= 6; d++) {
    const dia = addDaysKey(hoje, d);
    for (let i = 0; i < 4 + (d % 3); i++) marcar(futuros[k++ % futuros.length], dia, 'agendado');
  }

  // Pacotes
  const pacotes: Record<string, unknown>[] = [];
  const vendas: [string, keyof typeof modelos, number, number][] = [['Thor', 'tosa4', 2, 12], ['Bob', 'banho4', 2, 18], ['Duque', 'grande4', 3, 6], ['Fred', 'banho4', 1, 30], ['Belinha', 'banho4', 1, 25], ['Apolo', 'grande4', 2, 10]];
  for (const [n, m, saldo, diasAtras] of vendas) {
    const p = pet(n), mod = modelos[m];
    const dia = addDaysKey(hoje, -diasAtras);
    const pid = id(), pcid = id();
    pagamentos.push({ id: pid, loja_id: L, tutor_id: p.tutor, forma: pick(['pix', 'credito']), total_centavos: mod.preco, pontos_ganhos: Math.floor(mod.preco / 100), dia_caixa: dia, recebido_em: atSP(dia, '10:30'), idempotency_key: id() });
    itens.push({ loja_id: L, pagamento_id: pid, agendamento_id: null, descricao: `Pacote ${mod.nome}`, valor_centavos: mod.preco, ajuste_motivo: null });
    pontos.push({ loja_id: L, tutor_id: p.tutor, delta: Math.floor(mod.preco / 100), motivo: `Pacote ${mod.nome}`, pagamento_id: pid, em: atSP(dia, '10:30') });
    pacotes.push({ id: pcid, loja_id: L, tutor_id: p.tutor, modelo_id: mod.id, nome: mod.nome, servico_id: serv[mod.servico].id, porte: mod.porte, total: mod.banhos, saldo, valido_ate: addDaysKey(dia, mod.validade), vendido_em: atSP(dia, '10:30') });
    diasPassados.add(dia);
  }
  // Bob usa o pacote no serviço dele
  pacotes.find((x) => x.tutor_id === pet('Bob').tutor)!.servico_id = serv['Banho + hidratação'].id;
  for (const [n, s] of [['Pipoca', 520], ['Mel', 380], ['Princesa', 260], ['Simba', 640]] as const) {
    pontos.push({ loja_id: L, tutor_id: pet(n).tutor, delta: s, motivo: 'Saldo inicial', pagamento_id: null, em: atSP(addDaysKey(hoje, -90), '12:00') });
  }

  ins('agendamentos', agendamentos);
  ins('agendamento_blocos', blocos);
  ins('pagamentos', pagamentos);
  ins('pagamento_itens', itens);
  ins('movimentos_pontos', pontos);
  ins('pacotes_cliente', pacotes);

  // Caixas dos dias anteriores fechados (um com R$ 5 faltando)
  const caixas = [...diasPassados].filter((d) => d < hoje).sort().map((d, i) => {
    const dinheiro = pagamentos.filter((p) => p.dia_caixa === d && p.forma === 'dinheiro').reduce((a, p) => a + (p.total_centavos as number), 0);
    const dif = i % 9 === 4 ? -500 : 0;
    return { loja_id: L, dia: d, fechado_em: atSP(d, '18:05'), fechado_por: DEMO.recepcao, contado_centavos: dinheiro + dif, esperado_centavos: dinheiro, diferenca_centavos: dif };
  });
  ins('caixa_dias', caixas);

  // WhatsApp: conversas, propostas e lembretes
  const conversas: Record<string, unknown>[] = [];
  const mensagens: Record<string, unknown>[] = [];
  const t = (h: string, dia = hoje) => atSP(dia, h);
  function conversa(tutor: Pet | null, telefone: string, naoLidas: number, msgs: [string, string, string, string | null, string][]) {
    const cid = id();
    conversas.push({ id: cid, loja_id: L, telefone_e164: telefone, tutor_id: tutor?.tutor ?? null, nao_lidas: naoLidas, ultima_em: t(msgs[msgs.length - 1][4]) });
    for (const [direcao, origem, texto, tipo, h] of msgs) {
      mensagens.push({ loja_id: L, conversa_id: cid, direcao, origem, tipo, automatica: origem === 'sistema', texto, status: direcao === 'in' ? 'recebida' : 'enviada', em: t(h) });
    }
  }
  const tel = (p: Pet) => tutores.find((x) => x.id === p.tutor)!.telefone_e164 as string;
  const kiara = pet('Kiara'), fred = pet('Fred'), mel = pet('Mel'), bob = pet('Bob'), zeca = pet('Zeca');
  const amanhaDia = new Date(`${reservaAna}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' }).replace('-feira', '');
  conversa(kiara, tel(kiara), 1, [
    ['out', 'sistema', `Oi Sônia! A Kiara já está no ponto do banho. Temos ${amanhaDia}, ${reservaAna.slice(8)}/${reservaAna.slice(5, 7)} às 16:30, pode ser?`, 'lembrete_retorno', '09:00'],
    ['in', 'tutor', 'Pode sim! Deixo ela lá às 16h30 😊', null, '10:31'],
  ]);
  conversa(mel, tel(mel), 0, [
    ['out', 'sistema', 'Oi Pedro! A Mel está pronta e cheirosa. Pode vir buscar quando quiser.', 'pronto', '09:05'],
    ['in', 'tutor', 'Obrigado! Passo às 11h', null, '09:12'],
  ]);
  conversa(bob, tel(bob), 0, [
    ['out', 'sistema', 'Oi Carla! Confirmando o banho do Bob amanhã às 11:00. Responda SIM para confirmar.', 'vespera', '08:00'],
    ['in', 'tutor', 'SIM', null, '08:20'],
  ].map((m, i) => (i < 2 ? ([...m.slice(0, 4), m[4]] as [string, string, string, string | null, string]) : m)) as [string, string, string, string | null, string][]);
  conversa(fred, tel(fred), 1, [
    ['out', 'sistema', 'Oi Marta! O pacote do Fred tem só 1 banho restante. Quer renovar?', 'pacote_acabando', '08:40'],
    ['in', 'tutor', 'Quero sim! Pode renovar que pago no balcão', null, '10:02'],
  ]);
  conversa(zeca, tel(zeca), 0, [
    ['out', 'celular', 'Oi Lucas, o Zeca ficou lindo hoje! Mandei foto no outro número 🐶', null, '08:10'],
  ]);
  conversa(null, '+5511900009001', 1, [['in', 'tutor', 'Oi! Vocês fazem tosa em gato? Quanto custa?', null, '10:21']]);
  ins('conversas', conversas);
  ins('mensagens', mensagens);
  ins('propostas_horario', [{ loja_id: L, tutor_id: kiara.tutor, pet_id: kiara.id, servico_id: serv[kiara.servico].id, inicio: t('16:30', reservaAna), status: 'respondida', criada_em: t('09:00') }]);
  ins('lembretes_enviados', [{ loja_id: L, tutor_id: kiara.tutor, enviado_em: t('09:00'), respondido: true }]);
  ins('execucoes_diarias', [{ loja_id: L, dia: hoje, tipo: 'lembretes' }]);

  out.push('commit;');
  return out.join('\n');
}

if (process.argv[1]?.endsWith('demo.ts')) {
  const local = process.argv.includes('--local');
  const hoje = process.env.DEMO_DIA ?? dayKeySP(new Date());
  process.stdout.write(gerarSqlDemo({ local, hoje }) + '\n');
}
