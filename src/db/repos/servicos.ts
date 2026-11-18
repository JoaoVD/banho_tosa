import { PORTES, type Porte } from '@/domain/types';
import type { Tx } from '../session';

export type PrecoPorte = { precoCentavos: number; duracaoMin: number };
export type ServicoInput = {
  id?: string;
  nome: string;
  incluiBanho: boolean;
  incluiTosa: boolean;
  cicloPadraoDias: number;
  ativo?: boolean;
  precos: Record<Porte, PrecoPorte>;
};
export type ServicoComPrecos = Required<Omit<ServicoInput, 'id'>> & { id: string };

export async function listServicos(tx: Tx, apenasAtivos = false): Promise<ServicoComPrecos[]> {
  const servicos = await tx`select id, nome, inclui_banho, inclui_tosa, ciclo_padrao_dias, ativo
    from servicos where loja_id = loja_atual() ${apenasAtivos ? tx`and ativo` : tx``} order by nome`;
  const precos = await tx`select servico_id, porte, preco_centavos, duracao_min from precos_servico where loja_id = loja_atual()`;
  return servicos.map((s) => ({
    id: s.id,
    nome: s.nome,
    incluiBanho: s.inclui_banho,
    incluiTosa: s.inclui_tosa,
    cicloPadraoDias: s.ciclo_padrao_dias,
    ativo: s.ativo,
    precos: Object.fromEntries(
      precos.filter((p) => p.servico_id === s.id).map((p) => [p.porte, { precoCentavos: p.preco_centavos, duracaoMin: p.duracao_min }]),
    ) as Record<Porte, PrecoPorte>,
  }));
}

export async function upsertServico(tx: Tx, lojaId: string, s: ServicoInput): Promise<{ id: string }> {
  let id = s.id;
  if (id) {
    const r = await tx`update servicos set nome = ${s.nome}, inclui_banho = ${s.incluiBanho}, inclui_tosa = ${s.incluiTosa},
      ciclo_padrao_dias = ${s.cicloPadraoDias}, ativo = ${s.ativo ?? true} where id = ${id} and loja_id = ${lojaId} returning id`;
    if (!r.length) throw new Error('Sem permissão para alterar o serviço');
  } else {
    const [r] = await tx`insert into servicos (loja_id, nome, inclui_banho, inclui_tosa, ciclo_padrao_dias, ativo)
      values (${lojaId}, ${s.nome}, ${s.incluiBanho}, ${s.incluiTosa}, ${s.cicloPadraoDias}, ${s.ativo ?? true}) returning id`;
    id = r.id as string;
  }
  for (const porte of PORTES) {
    const p = s.precos[porte];
    await tx`insert into precos_servico (servico_id, loja_id, porte, preco_centavos, duracao_min)
      values (${id}, ${lojaId}, ${porte}, ${p.precoCentavos}, ${p.duracaoMin})
      on conflict (servico_id, porte) do update set preco_centavos = excluded.preco_centavos, duracao_min = excluded.duracao_min`;
  }
  return { id: id! };
}
