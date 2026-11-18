import type postgres from 'postgres';
import { db } from './client';
import type { SessionUser } from '@/auth/provider';

export type Tx = postgres.TransactionSql;

/** Executa `fn` numa transação com a mesma identidade que o Supabase usa (role + claims), aplicando o RLS. */
export async function withClaims<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await db.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    await tx`set local role authenticated`;
    return fn(tx);
  })) as T;
}

export function withSession<T>(user: SessionUser, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withClaims(user.id, fn);
}
