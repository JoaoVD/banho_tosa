import postgres from 'postgres';

const g = globalThis as unknown as { __btDb?: postgres.Sql; __btService?: postgres.Sql };

/**
 * A integração Supabase da Vercel cria POSTGRES_URL (pooler, senha sempre certa).
 * Ela tem preferência; DATABASE_URL fica para o ambiente local.
 */
export function urlDoBanco(env: Record<string, string | undefined> = process.env, servico = false): string | undefined {
  const url = env.POSTGRES_URL || (servico && env.SUPABASE_SERVICE_DATABASE_URL) || env.DATABASE_URL || undefined;
  return url ? limparUrl(url) : undefined;
}

/** Tira parâmetros que a integração acrescenta e o postgres.js mandaria ao servidor (ex.: supa=base-pooler.x). */
function limparUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const p of ['supa', 'pgbouncer']) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return url;
  }
}

function connect(url: string | undefined, name: string): postgres.Sql {
  if (!url) throw new Error(`${name} não configurado`);
  return postgres(url, { max: 10, prepare: false, onnotice: () => {} });
}

/**
 * Conexão criada só no primeiro uso. Importar este módulo nunca abre conexão nem exige
 * DATABASE_URL — o build (ex.: Vercel) carrega as rotas sem banco disponível.
 */
function preguicoso(criar: () => postgres.Sql): postgres.Sql {
  const real = () => criar();
  return new Proxy(function () {} as unknown as postgres.Sql, {
    apply: (_alvo, thisArg, args) => Reflect.apply(real() as unknown as (...a: unknown[]) => unknown, thisArg, args),
    get: (_alvo, prop) => {
      const inst = real() as unknown as Record<PropertyKey, unknown>;
      const v = inst[prop];
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(inst) : v;
    },
  });
}

/** Conexão usada pelas telas. Toda consulta passa por withSession (RLS). */
export const db: postgres.Sql = preguicoso(() => (g.__btDb ??= connect(urlDoBanco(), 'DATABASE_URL')));

/** Conexão de serviço (ignora RLS). Só worker, webhook e login em modo dev. */
export function serviceDb(): postgres.Sql {
  return (g.__btService ??= connect(urlDoBanco(process.env, true), 'SUPABASE_SERVICE_DATABASE_URL'));
}
