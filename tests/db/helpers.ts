import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:54329/postgres';

/** Conexão de serviço (superusuário local), usada para preparar dados de teste. */
export const sql = postgres(url, { max: 4, onnotice: () => {} });

export type Tx = postgres.TransactionSql;

/** Executa `fn` como um usuário logado do Supabase (role authenticated + claims). */
export async function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    await tx`set local role authenticated`;
    return fn(tx);
  })) as T;
}

/** Apaga os dados de todas as tabelas do schema public. */
export async function resetDb(): Promise<void> {
  const tables = await sql<{ t: string }[]>`
    select quote_ident(tablename) as t from pg_tables where schemaname = 'public'`;
  if (tables.length) await sql.unsafe(`truncate ${tables.map((r) => r.t).join(', ')} restart identity cascade`);
  await sql`delete from auth.users`;
}

export interface LojaSeed {
  lojaId: string;
  donaId: string;
  recepcaoId: string;
}

/** Cria uma loja com uma dona e uma recepcionista (via conexão de serviço). */
export async function seedLoja(nome = 'Loja Teste'): Promise<LojaSeed> {
  const [{ id: lojaId }] = await sql<{ id: string }[]>`insert into lojas (nome, whatsapp_liberado) values (${nome}, true) returning id`;
  const donaId = crypto.randomUUID();
  const recepcaoId = crypto.randomUUID();
  await sql`insert into auth.users (id, email) values (${donaId}, ${`dona-${donaId}@t.dev`}), (${recepcaoId}, ${`rec-${recepcaoId}@t.dev`})`;
  await sql`insert into perfis (user_id, loja_id, nome, papel) values
    (${donaId}, ${lojaId}, 'Dona', 'dona'), (${recepcaoId}, ${lojaId}, 'Renata', 'recepcao')`;
  await sql`insert into configuracoes (loja_id) values (${lojaId})`;
  return { lojaId, donaId, recepcaoId };
}

/** Cria profissionais, um serviço e um pet de exemplo na loja (via serviço). */
export async function seedOperacao(lojaId: string) {
  const [julia] = await sql`insert into profissionais (loja_id, nome, funcao) values (${lojaId}, 'Júlia', 'banho') returning id`;
  const [marcos] = await sql`insert into profissionais (loja_id, nome, funcao) values (${lojaId}, 'Marcos', 'tosa') returning id`;
  const [banho] = await sql`insert into servicos (loja_id, nome, inclui_banho, inclui_tosa, ciclo_padrao_dias) values (${lojaId}, 'Banho', true, false, 15) returning id`;
  const [banhoTosa] = await sql`insert into servicos (loja_id, nome, inclui_banho, inclui_tosa, ciclo_padrao_dias) values (${lojaId}, 'Banho + tosa higiênica', true, true, 15) returning id`;
  for (const s of [banho.id, banhoTosa.id]) {
    for (const porte of ['mini', 'pequeno', 'medio', 'grande', 'gigante']) {
      await sql`insert into precos_servico (servico_id, loja_id, porte, preco_centavos, duracao_min) values (${s}, ${lojaId}, ${porte}, 7000, 60)`;
    }
  }
  for (const d of [0, 1, 2, 3, 4, 5, 6]) {
    await sql`insert into horarios_funcionamento (loja_id, dia_semana, abre, fecha) values (${lojaId}, ${d}, '08:00', '18:00')`;
  }
  const [tutor] = await sql`insert into tutores (loja_id, nome, telefone_e164) values (${lojaId}, 'Ana Souza', '+5511987654321') returning id`;
  const [pet] = await sql`insert into pets (loja_id, tutor_id, nome, raca, porte) values (${lojaId}, ${tutor.id}, 'Thor', 'Shih-tzu', 'pequeno') returning id`;
  return { juliaId: julia.id as string, marcosId: marcos.id as string, banhoId: banho.id as string, banhoTosaId: banhoTosa.id as string, tutorId: tutor.id as string, petId: pet.id as string };
}
