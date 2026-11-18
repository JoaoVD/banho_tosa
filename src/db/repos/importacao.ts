import type { LinhaImport } from '@/domain/import';
import { addDaysKey, atSP, dayKeySP } from '@/domain/time';
import type { Tx } from '../session';
import { upsertTutor } from './tutores';

export type ResultadoImport = { tutores: number; pets: number; historicos: number; pacotes: number; ignorados: number };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Grava as linhas validadas. Idempotente: tutor pelo telefone, pet pelo nome dentro do tutor,
 * visita pelo pet + data. A última visita vira um atendimento concluído "histórico" (não ocupa agenda).
 */
export async function commitImport(tx: Tx, lojaId: string, linhas: LinhaImport[]): Promise<ResultadoImport> {
  const r: ResultadoImport = { tutores: 0, pets: 0, historicos: 0, pacotes: 0, ignorados: 0 };
  const servicos = await tx<{ id: string; nome: string; inclui_banho: boolean }[]>`
    select id, nome, inclui_banho from servicos where loja_id = ${lojaId} and ativo order by nome`;
  const padrao = servicos.find((s) => norm(s.nome) === 'banho') ?? servicos.find((s) => s.inclui_banho) ?? servicos[0];

  for (const l of linhas) {
    const tutor = await upsertTutor(tx, lojaId, { nome: l.tutorNome, telefone: l.telefone });
    if (tutor.criado) r.tutores++;
    let [pet] = await tx`select id from pets where tutor_id = ${tutor.id} and lower(nome) = lower(${l.petNome})`;
    if (!pet) {
      [pet] = await tx`insert into pets (loja_id, tutor_id, nome, especie, raca, porte)
        values (${lojaId}, ${tutor.id}, ${l.petNome}, ${l.especie}, ${l.raca}, ${l.porte}) returning id`;
      r.pets++;
    }
    if (l.ultimaVisita && padrao) {
      const servico = (l.servico && servicos.find((s) => norm(s.nome) === norm(l.servico!))) || padrao;
      const inicio = atSP(l.ultimaVisita, '12:00');
      const [ja] = await tx`select 1 from agendamentos where pet_id = ${pet.id} and historico and inicio = ${inicio}`;
      if (!ja) {
        const [{ preco }] = await tx`select coalesce((select preco_centavos from precos_servico where servico_id = ${servico.id} and porte = ${l.porte}), 0) as preco`;
        await tx`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, etapa, inicio, fim, historico)
          values (${lojaId}, ${pet.id}, ${servico.id}, ${preco}, 'concluido', ${inicio}, ${new Date(inicio.getTime() + 3_600_000)}, true)`;
        r.historicos++;
      }
    }
    if (l.pacote && l.pacoteSaldo && padrao) {
      const [modelo] = await tx`select id, banhos, servico_id, porte, validade_dias from pacotes_modelo
        where loja_id = ${lojaId} and lower(nome) = lower(${l.pacote}) limit 1`;
      const validade = l.pacoteValidade ?? addDaysKey(dayKeySP(new Date()), modelo?.validade_dias ?? 35);
      const [ja] = await tx`select 1 from pacotes_cliente where tutor_id = ${tutor.id} and lower(nome) = lower(${l.pacote}) and saldo = ${l.pacoteSaldo} and valido_ate = ${validade}::date`;
      if (!ja) {
        await tx`insert into pacotes_cliente (loja_id, tutor_id, modelo_id, nome, servico_id, porte, total, saldo, valido_ate)
          values (${lojaId}, ${tutor.id}, ${modelo?.id ?? null}, ${l.pacote}, ${modelo?.servico_id ?? padrao.id}, ${modelo?.porte ?? null},
                  ${Math.max(modelo?.banhos ?? l.pacoteSaldo, l.pacoteSaldo)}, ${l.pacoteSaldo}, ${validade}::date)`;
        r.pacotes++;
      }
    }
    if (l.pontos) {
      const [ja] = await tx`select 1 from movimentos_pontos where tutor_id = ${tutor.id} and motivo = 'Importação'`;
      if (!ja) await tx`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo) values (${lojaId}, ${tutor.id}, ${l.pontos}, 'Importação')`;
    }
  }
  return r;
}
