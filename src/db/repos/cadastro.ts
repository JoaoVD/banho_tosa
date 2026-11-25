import type postgres from 'postgres';

/**
 * Cria uma loja nova com a dona (conexão de serviço: a pessoa ainda não tem loja, a RLS não deixaria).
 * Tudo numa transação: se o usuário já existir, nada fica pela metade.
 */
export async function criarLoja(sql: postgres.Sql, d: { nomeLoja: string; nome: string; usuario: string; userId: string }): Promise<string> {
  return (await sql.begin(async (tx) => {
    const [{ id }] = await tx<{ id: string }[]>`insert into lojas (nome) values (${d.nomeLoja}) returning id`;
    await tx`insert into perfis (user_id, loja_id, nome, papel, usuario) values (${d.userId}, ${id}, ${d.nome}, 'dona', ${d.usuario})`;
    await tx`insert into configuracoes (loja_id) values (${id})`;
    return id;
  })) as string;
}

export type TipoRegistro = 'cadastro' | 'tentativa';

/** Registros deste IP (ou faixa) na última hora: cadastros concluídos ou tentativas. */
export async function cadastrosRecentes(sql: postgres.Sql, ip: string, agora = new Date(), tipo: TipoRegistro = 'cadastro'): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from cadastros_tentativas
    where ip = ${ip} and tipo = ${tipo} and em > ${new Date(agora.getTime() - 3_600_000)} and em <= ${agora}`;
  return n;
}

export async function registrarCadastro(sql: postgres.Sql, ip: string, em = new Date(), tipo: TipoRegistro = 'cadastro'): Promise<number> {
  const [{ id }] = await sql<{ id: number }[]>`insert into cadastros_tentativas (ip, em, tipo) values (${ip}, ${em}, ${tipo}) returning id`;
  return id;
}

export async function removerRegistro(sql: postgres.Sql, id: number): Promise<void> {
  await sql`delete from cadastros_tentativas where id = ${id}`;
}
