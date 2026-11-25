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

/** Cadastros concluídos a partir deste IP na última hora. */
export async function cadastrosRecentes(sql: postgres.Sql, ip: string, agora = new Date()): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from cadastros_tentativas
    where ip = ${ip} and em > ${new Date(agora.getTime() - 3_600_000)} and em <= ${agora}`;
  return n;
}

export async function registrarCadastro(sql: postgres.Sql, ip: string, em = new Date()): Promise<void> {
  await sql`insert into cadastros_tentativas (ip, em) values (${ip}, ${em})`;
}
