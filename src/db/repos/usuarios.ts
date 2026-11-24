import type { Tx } from '@/db/session';

export type UsuarioLoja = { id: string; nome: string; usuario: string; papel: 'dona' | 'recepcao' };

/** Usuários da loja de quem está logado (RLS). */
export function listUsuarios(tx: Tx) {
  return tx<UsuarioLoja[]>`select user_id as id, nome, usuario, papel from perfis where loja_id = loja_atual() order by papel, nome`;
}

/** Perfil da própria loja, ou null se for de outra loja (ou não existir). */
export async function perfilDaLoja(tx: Tx, userId: string): Promise<UsuarioLoja | null> {
  const [p] = await tx<UsuarioLoja[]>`select user_id as id, nome, usuario, papel from perfis where user_id = ${userId} and loja_id = loja_atual()`;
  return p ?? null;
}
