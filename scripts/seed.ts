/* Dados de exemplo (os do protótipo). Apaga tudo antes. Só para desenvolvimento. */
import postgres from 'postgres';
import { PORTES, type Porte } from '../src/domain/types';

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
  for (const p of PETS) {
    const [{ id: tutor }] = await sql`insert into tutores (loja_id, nome, telefone_e164) values (${loja}, ${p.tutor}, ${p.tel}) returning id`;
    await sql`insert into pets (loja_id, tutor_id, nome, raca, porte, cuidados) values (${loja}, ${tutor}, ${p.pet}, ${p.raca}, ${p.porte}, ${p.cuidados})`;
  }
  return { loja, dona, rec };
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => console.log('seed ok: dona@exemplo.dev / recepcao@exemplo.dev (senha: dev)'))
    .finally(() => sql.end());
}
