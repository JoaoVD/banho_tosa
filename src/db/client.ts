import postgres from 'postgres';

const g = globalThis as unknown as { __btDb?: postgres.Sql; __btService?: postgres.Sql };

function connect(url: string | undefined, name: string): postgres.Sql {
  if (!url) throw new Error(`${name} não configurado`);
  return postgres(url, { max: 10, prepare: false, onnotice: () => {} });
}

/** Conexão usada pelas telas. Toda consulta passa por withSession (RLS). */
export const db: postgres.Sql = g.__btDb ?? (g.__btDb = connect(process.env.DATABASE_URL, 'DATABASE_URL'));

/** Conexão de serviço (ignora RLS). Só worker, webhook e login em modo dev. */
export function serviceDb(): postgres.Sql {
  return (g.__btService ??= connect(
    process.env.SUPABASE_SERVICE_DATABASE_URL ?? process.env.DATABASE_URL,
    'SUPABASE_SERVICE_DATABASE_URL',
  ));
}
