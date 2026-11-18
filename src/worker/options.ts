import type postgres from 'postgres';

/** Opções da conexão do worker. prepare: false é obrigatório no pooler de transação do Supabase. */
export const WORKER_SQL_OPTIONS: postgres.Options<Record<string, postgres.PostgresType>> = { max: 4, prepare: false, onnotice: () => {} };
