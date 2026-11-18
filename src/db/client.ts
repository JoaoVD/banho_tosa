import postgres from 'postgres';

const g = globalThis as unknown as { __btDb?: postgres.Sql; __btService?: postgres.Sql };

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
export const db: postgres.Sql = preguicoso(() => (g.__btDb ??= connect(process.env.DATABASE_URL, 'DATABASE_URL')));

/** Conexão de serviço (ignora RLS). Só worker, webhook e login em modo dev. */
export function serviceDb(): postgres.Sql {
  return (g.__btService ??= connect(
    process.env.SUPABASE_SERVICE_DATABASE_URL ?? process.env.DATABASE_URL,
    'SUPABASE_SERVICE_DATABASE_URL',
  ));
}
