/* Dados de exemplo (os do protótipo). Apaga tudo antes. Só para desenvolvimento. */
import postgres from 'postgres';
import { PORTES, type Porte } from '../src/domain/types';
import { atSP, dayKeySP } from '../src/domain/time';

const url = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:54329/postgres';
if (process.env.NODE_ENV === 'production') throw new Error('seed não roda em produção');
const sql = postgres(url, { onnotice: () => {} });

type Tabela = Partial<Record<Porte, [number, number]>>;
const SERVICOS: { nome: string; banho: boolean; tosa: boolean; ciclo: number; precos: Tabela }[] = [
  { nome: 'Banho', banho: true, tosa: false, ciclo: 15, precos: { mini: [5000, 45], pequeno: [7000, 60], medio: [8500, 75], grande: [11000, 90], gigante: [14000, 120] } },
  { nome: 'Banho + tosa higiênica', banho: true, tosa: true, ciclo: 15, precos: { mini: [7000, 75], pequeno: [8500, 90], medio: [10000, 105], grande: [13000, 120], gigante: [16000, 150] } },
  { nome: 'Banho + hidratação', banho: true, tosa: false, ciclo: 15, precos: { mini: [9000, 60], pequeno: [11000, 75], medio: [12500, 90], grande: [15000, 105], gigante: [18000, 135] } },
  { nome: 'Banho + escovação', banho: true, tosa: false, ciclo: 15, precos: { mini: [7000, 60], pequeno: [9000, 75], medio: [11000, 90], grande: [13000, 105], gigante: [16000, 135] } },
  { nome: 'Banho + tosa bebê', banho: true, tosa: true, ciclo: 21, precos: { mini: [8000, 90], pequeno: [9500, 105], medio: [11500, 120], grande: [14500, 150], gigante: [17500, 180] } },
  { nome: 'Tosa na tesoura', banho: false, tosa: true, ciclo: 30, precos: { mini: [10000, 75], pequeno: [12000, 90], medio: [14000, 105], grande: [17000, 120], gigante: [20000, 150] } },
  { nome: 'Tosa da raça', banho: false, tosa: true, ciclo: 30, precos: { mini: [10000, 75], pequeno: [12000, 90], medio: [14000, 105], grande: [17000, 120], gigante: [20000, 150] } },
];

const PETS = [
  { tutor: 'Ana Souza', tel: '+5511987650000', pet: 'Thor', raca: 'Shih-tzu', porte: 'pequeno', cuidados: ['Sensível nas orelhas', 'Secador no morno', 'Gosta de petisco de frango'] },
  { tutor: 'Beatriz Lima', tel: '+5511987650001', pet: 'Pipoca', raca: 'Poodle', porte: 'pequeno', cuidados: ['Idosa, fazer pausas na tosa'] },
  { tutor: 'Carla Mendes', tel: '+5511987650002', pet: 'Bob', raca: 'Spitz alemão', porte: 'pequeno', cuidados: ['Late no secador, começar com toalha'] },
  { tutor: 'Rafael Costa', tel: '+5511987650003', pet: 'Nina', raca: 'Yorkshire', porte: 'mini', cuidados: [] },
  { tutor: 'Juliana Rocha', tel: '+5511987650004', pet: 'Luna', raca: 'Sem raça definida', porte: 'medio', cuidados: ['Medrosa com barulho'] },
  { tutor: 'Pedro Alves', tel: '+5511987650005', pet: 'Mel', raca: 'Golden retriever', porte: 'grande', cuidados: ['Solta muito pelo, escovar antes'] },
];

// O dia de exemplo (SEED_DIA, padrão: hoje em São Paulo), igual ao protótipo.
const AGENDA: { pet: string; servico: string; etapa: string; blocos: [string, string, string][]; aviso?: string }[] = [
  { pet: 'Mel', servico: 'Banho + escovação', etapa: 'pronto', blocos: [['Júlia', '08:00', '09:00']], aviso: '10:05' },
  { pet: 'Luna', servico: 'Banho', etapa: 'pronto', blocos: [['Júlia', '09:00', '10:00']], aviso: '10:12' },
  { pet: 'Pipoca', servico: 'Tosa na tesoura', etapa: 'tosa', blocos: [['Marcos', '09:30', '10:55']] },
  { pet: 'Thor', servico: 'Banho + tosa higiênica', etapa: 'banho', blocos: [['Júlia', '10:00', '10:55'], ['Marcos', '10:55', '11:30']] },
  { pet: 'Bob', servico: 'Banho + hidratação', etapa: 'agendado', blocos: [['Júlia', '11:00', '12:00']] },
  { pet: 'Nina', servico: 'Banho + tosa bebê', etapa: 'agendado', blocos: [['Júlia', '12:30', '13:30'], ['Marcos', '13:30', '14:00']] },
];

async function agendaDoDia(loja: string, petIds: Record<string, string>) {
  const dia = process.env.SEED_DIA ?? dayKeySP(new Date());
  const profs = Object.fromEntries((await sql`select id, nome from profissionais where loja_id = ${loja}`).map((r) => [r.nome, r.id]));
  const servs = Object.fromEntries((await sql`select id, nome from servicos where loja_id = ${loja}`).map((r) => [r.nome, r.id]));
  for (const a of AGENDA) {
    const inicio = atSP(dia, a.blocos[0][1]);
    const fim = atSP(dia, a.blocos[a.blocos.length - 1][2]);
    const [{ preco }] = await sql`select ps.preco_centavos as preco from precos_servico ps join pets p on p.porte = ps.porte
      where ps.servico_id = ${servs[a.servico]} and p.id = ${petIds[a.pet]}`;
    const aviso = a.aviso ? atSP(dia, a.aviso) : null;
    const [{ id }] = await sql`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim, aviso_pronto_em, aviso_pronto_enviado)
      values (${loja}, ${petIds[a.pet]}, ${servs[a.servico]}, ${preco}, ${a.etapa}, ${inicio}, ${fim}, ${aviso}, ${aviso ? true : null}) returning id`;
    for (const [prof, de, ate] of a.blocos) {
      await sql`insert into agendamento_blocos (loja_id, agendamento_id, profissional_id, periodo)
        values (${loja}, ${id}, ${profs[prof]}, tstzrange(${atSP(dia, de)}, ${atSP(dia, ate)}))`;
    }
  }
}

async function fidelidade(loja: string) {
  const dia = process.env.SEED_DIA ?? dayKeySP(new Date());
  const serv = Object.fromEntries((await sql`select id, nome from servicos where loja_id = ${loja}`).map((r) => [r.nome, r.id]));
  const tutor = Object.fromEntries((await sql`select id, nome from tutores where loja_id = ${loja}`).map((r) => [r.nome, r.id]));
  await sql`insert into premios (loja_id, nome, pontos, servico_id) values
    (${loja}, 'Perfume e laço de brinde', 300, null), (${loja}, 'Hidratação grátis', 500, null), (${loja}, 'Banho grátis', 800, ${serv['Banho']})`;
  await sql`insert into pacotes_modelo (loja_id, nome, preco_centavos, banhos, servico_id, porte, validade_dias) values
    (${loja}, '4 banhos no mês', 26000, 4, ${serv['Banho']}, 'pequeno', 35),
    (${loja}, '4 banhos + tosa higiênica', 29000, 4, ${serv['Banho + tosa higiênica']}, null, 45),
    (${loja}, '4 banhos, porte grande', 42000, 4, ${serv['Banho']}, 'grande', 35)`;
  const validade = new Date(Date.parse(`${dia}T12:00:00Z`) + 17 * 86_400_000).toISOString().slice(0, 10);
  await sql`insert into pacotes_cliente (loja_id, tutor_id, nome, servico_id, total, saldo, valido_ate) values
    (${loja}, ${tutor['Ana Souza']}, '4 banhos + tosa higiênica', ${serv['Banho + tosa higiênica']}, 4, 2, ${validade}),
    (${loja}, ${tutor['Carla Mendes']}, '4 banhos + hidratação', ${serv['Banho + hidratação']}, 4, 2, ${validade})`;
  for (const [nome, pts] of [['Ana Souza', 340], ['Beatriz Lima', 820], ['Juliana Rocha', 260], ['Pedro Alves', 480], ['Carla Mendes', 150]] as const) {
    await sql`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo) values (${loja}, ${tutor[nome]}, ${pts}, 'Saldo inicial')`;
  }
  // Mel já foi paga (como no protótipo).
  const [mel] = await sql`select a.id, a.preco_centavos, p.tutor_id from agendamentos a join pets p on p.id = a.pet_id where p.nome = 'Mel' and a.loja_id = ${loja}`;
  const [pg] = await sql`insert into pagamentos (loja_id, tutor_id, forma, total_centavos, pontos_ganhos, dia_caixa, recebido_em, idempotency_key)
    values (${loja}, ${mel.tutor_id}, 'pix', ${mel.preco_centavos}, ${Math.floor(mel.preco_centavos / 100)}, ${dia}, ${atSP(dia, '10:40')}, gen_random_uuid()) returning id`;
  await sql`insert into pagamento_itens (loja_id, pagamento_id, agendamento_id, descricao, valor_centavos) values (${loja}, ${pg.id}, ${mel.id}, 'Mel, Banho + escovação', ${mel.preco_centavos})`;
  await sql`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo, pagamento_id) values (${loja}, ${mel.tutor_id}, ${Math.floor(mel.preco_centavos / 100)}, 'Atendimento', ${pg.id})`;
  await sql`update agendamentos set etapa = 'concluido' where id = ${mel.id}`;
}

export async function seed() {
  await sql`truncate lojas cascade`;
  await sql`delete from auth.users`;
  const [{ id: loja }] = await sql`insert into lojas (nome, telefone_dona, onboarding_concluido)
    values ('Banho e Tosa', '+5511987659999', true) returning id`;
  const dona = crypto.randomUUID();
  const rec = crypto.randomUUID();
  await sql`insert into auth.users (id, email) values (${dona}, 'dona@exemplo.dev'), (${rec}, 'recepcao@exemplo.dev')`;
  await sql`insert into perfis (user_id, loja_id, nome, papel) values (${dona}, ${loja}, 'Dona', 'dona'), (${rec}, ${loja}, 'Renata', 'recepcao')`;
  await sql`insert into configuracoes (loja_id) values (${loja})`;
  for (const d of [1, 2, 3, 4, 5, 6]) {
    await sql`insert into horarios_funcionamento (loja_id, dia_semana, abre, fecha) values (${loja}, ${d}, '08:00', ${d === 6 ? '14:00' : '18:00'})`;
  }
  await sql`insert into profissionais (loja_id, nome, funcao) values (${loja}, 'Júlia', 'banho'), (${loja}, 'Marcos', 'tosa')`;
  for (const s of SERVICOS) {
    const [{ id }] = await sql`insert into servicos (loja_id, nome, inclui_banho, inclui_tosa, ciclo_padrao_dias)
      values (${loja}, ${s.nome}, ${s.banho}, ${s.tosa}, ${s.ciclo}) returning id`;
    for (const p of PORTES) {
      const [preco, dur] = s.precos[p]!;
      await sql`insert into precos_servico (servico_id, loja_id, porte, preco_centavos, duracao_min) values (${id}, ${loja}, ${p}, ${preco}, ${dur})`;
    }
  }
  const petIds: Record<string, string> = {};
  for (const p of PETS) {
    const [{ id: tutor }] = await sql`insert into tutores (loja_id, nome, telefone_e164) values (${loja}, ${p.tutor}, ${p.tel}) returning id`;
    const [{ id }] = await sql`insert into pets (loja_id, tutor_id, nome, raca, porte, cuidados) values (${loja}, ${tutor}, ${p.pet}, ${p.raca}, ${p.porte}, ${p.cuidados}) returning id`;
    petIds[p.pet] = id;
  }
  await agendaDoDia(loja, petIds);
  await fidelidade(loja);
  return { loja, dona, rec };
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => console.log('seed ok: dona@exemplo.dev / recepcao@exemplo.dev (senha: dev)'))
    .finally(() => sql.end());
}
