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
