import { CATALOGO } from '@/domain/catalogo';
import { PORTES, type Porte } from '@/domain/types';
import type { Tx } from '../session';
import { listServicos, upsertServico } from './servicos';

export type PrecosPorNome = Record<string, Record<Porte, number>>;

/** Preços atuais da loja por serviço, ou os sugeridos do catálogo se a loja ainda não tem serviços. */
export async function precosParaAjuste(tx: Tx): Promise<PrecosPorNome> {
  const existentes = await listServicos(tx, true);
  if (!existentes.length) {
    return Object.fromEntries(CATALOGO.map((s) => [s.nome, Object.fromEntries(PORTES.map((p) => [p, s.precos[p][0]]))])) as PrecosPorNome;
  }
  return Object.fromEntries(existentes.map((s) => [s.nome, Object.fromEntries(PORTES.map((p) => [p, s.precos[p]?.precoCentavos ?? 0]))])) as PrecosPorNome;
}

/**
 * Cria os serviços do catálogo (se a loja ainda não tem) e aplica os preços informados.
 * Rodar de novo não duplica: serviços com o mesmo nome só têm os preços atualizados.
 */
export async function aplicarCatalogo(tx: Tx, lojaId: string, precos: PrecosPorNome = {}): Promise<number> {
  const existentes = new Map((await listServicos(tx)).map((s) => [s.nome, s]));
  let total = 0;
  for (const c of CATALOGO) {
    const atual = existentes.get(c.nome);
    const ajuste = precos[c.nome] ?? {};
    await upsertServico(tx, lojaId, {
      id: atual?.id,
      nome: c.nome,
      incluiBanho: atual?.incluiBanho ?? c.banho,
      incluiTosa: atual?.incluiTosa ?? c.tosa,
      cicloPadraoDias: atual?.cicloPadraoDias ?? c.ciclo,
      ativo: true,
      precos: Object.fromEntries(PORTES.map((p) => [p, {
        precoCentavos: ajuste[p] ?? atual?.precos[p]?.precoCentavos ?? c.precos[p][0],
        duracaoMin: atual?.precos[p]?.duracaoMin ?? c.precos[p][1],
      }])) as Record<Porte, { precoCentavos: number; duracaoMin: number }>,
    });
    total++;
  }
  return total;
}
