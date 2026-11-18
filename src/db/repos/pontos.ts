import type { Premio } from '@/domain/types';
import type { Tx } from '../session';

export async function listPremios(tx: Tx): Promise<(Premio & { ativo: boolean })[]> {
  const rows = await tx`select id, nome, pontos, servico_id, ativo from premios where loja_id = loja_atual() order by pontos`;
  return rows.map((r) => ({ id: r.id, nome: r.nome, pontos: r.pontos, servicoId: r.servico_id, ativo: r.ativo }));
}

export async function upsertPremio(tx: Tx, lojaId: string, p: { id?: string; nome: string; pontos: number; servicoId: string | null; ativo?: boolean }) {
  if (p.id) {
    const r = await tx`update premios set nome = ${p.nome}, pontos = ${p.pontos}, servico_id = ${p.servicoId}, ativo = ${p.ativo ?? true} where id = ${p.id} returning id`;
    if (!r.length) throw new Error('Sem permissão para alterar o prêmio');
    return { id: p.id };
  }
  const [r] = await tx`insert into premios (loja_id, nome, pontos, servico_id) values (${lojaId}, ${p.nome}, ${p.pontos}, ${p.servicoId}) returning id`;
  return { id: r.id as string };
}
