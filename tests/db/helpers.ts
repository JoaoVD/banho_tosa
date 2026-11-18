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
  const [{ id: lojaId }] = await sql<{ id: string }[]>`insert into lojas (nome) values (${nome}) returning id`;
  const donaId = crypto.randomUUID();
  const recepcaoId = crypto.randomUUID();
  await sql`insert into auth.users (id, email) values (${donaId}, ${`dona-${donaId}@t.dev`}), (${recepcaoId}, ${`rec-${recepcaoId}@t.dev`})`;
  await sql`insert into perfis (user_id, loja_id, nome, papel) values
    (${donaId}, ${lojaId}, 'Dona', 'dona'), (${recepcaoId}, ${lojaId}, 'Renata', 'recepcao')`;
  await sql`insert into configuracoes (loja_id) values (${lojaId})`;
  return { lojaId, donaId, recepcaoId };
}
