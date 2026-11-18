import { BOARD_STAGES, boardEtapa, type BoardStage } from '@/domain/stages';
import { addDaysKey, atSP, hhmmSP } from '@/domain/time';
import type { Etapa } from '@/domain/types';
import type { Tx } from '../session';

export type CardPet = {
  agendamentoId: string;
  petId: string;
  petNome: string;
  raca: string | null;
  tutorNome: string;
  hora: string;
  servicoNome: string;
  incluiBanho: boolean;
  incluiTosa: boolean;
  etapa: Etapa;
  precoCentavos: number;
  nota: string;
  pago: boolean;
  avisoPendente: boolean;
  pacote: { usados: number; total: number } | null;
};

export type Hoje = {
  saudacao: string;
  widgets: { emAtendimento: number; agendados: number; paraReceber: string[]; respostas: number; recebidoCentavos: number; pagamentos: number };
  colunas: Record<BoardStage, CardPet[]>;
  noPontoDeVoltar: { petId: string; petNome: string }[];
};

export function saudacao(agora: Date): string {
  const h = Number(hhmmSP(agora).slice(0, 2));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export async function getHoje(tx: Tx, dia: string, agora: Date): Promise<Hoje> {
  const ini = atSP(dia, '00:00'), fim = atSP(addDaysKey(dia, 1), '00:00');
  const rows = await tx`
    select a.id, a.etapa, a.inicio, a.preco_centavos, a.aviso_pronto_em, a.aviso_pronto_enviado,
           p.id as pet_id, p.nome as pet, p.raca, p.cuidados, t.nome as tutor,
           s.nome as servico, s.inclui_banho, s.inclui_tosa,
           exists (select 1 from agendamentos x where x.pet_id = p.id and x.etapa = 'concluido' and x.id <> a.id) as veterano,
           (select pr.nome || '|' || extract(epoch from upper(b.periodo))::bigint
              from agendamento_blocos b join profissionais pr on pr.id = b.profissional_id
             where b.agendamento_id = a.id and pr.funcao = 'tosa' and b.ativo limit 1) as tosa_info
    from agendamentos a
    join pets p on p.id = a.pet_id join tutores t on t.id = p.tutor_id join servicos s on s.id = a.servico_id
    where a.loja_id = loja_atual() and not a.historico and a.inicio >= ${ini} and a.inicio < ${fim}
      and a.etapa not in ('cancelado', 'nao_compareceu')
    order by a.inicio`;

  const colunas = Object.fromEntries(BOARD_STAGES.map((s) => [s, [] as CardPet[]])) as Record<BoardStage, CardPet[]>;
  for (const r of rows) {
    const coluna = boardEtapa({ etapa: r.etapa, inicio: new Date(r.inicio) }, dia);
    if (!coluna) continue;
    const pronto = r.etapa === 'pronto' || r.etapa === 'concluido';
    let nota = r.cuidados[0] ?? (r.veterano ? '' : 'Primeira vez na loja');
    if (pronto && r.aviso_pronto_em) nota = r.aviso_pronto_enviado ? `Tutor avisado às ${hhmmSP(new Date(r.aviso_pronto_em))}` : 'Tutor não avisado';
    if (r.etapa === 'tosa' && r.tosa_info) {
      const [nome, fimEpoch] = String(r.tosa_info).split('|');
      const faltam = Math.round((Number(fimEpoch) * 1000 - agora.getTime()) / 60_000);
      nota = faltam > 0 ? `Com ${nome}, faltam ~${faltam} min` : `Com ${nome}`;
    }
    colunas[coluna].push({
      agendamentoId: r.id,
      petId: r.pet_id,
      petNome: r.pet,
      raca: r.raca,
      tutorNome: r.tutor,
      hora: hhmmSP(new Date(r.inicio)),
      servicoNome: r.servico,
      incluiBanho: r.inclui_banho,
      incluiTosa: r.inclui_tosa,
      etapa: r.etapa,
      precoCentavos: r.preco_centavos,
      nota,
      pago: r.etapa === 'concluido',
      avisoPendente: pronto && r.etapa !== 'concluido' && !r.aviso_pronto_em,
      pacote: null,
    });
  }
  const todos = Object.values(colunas).flat();
  return {
    saudacao: saudacao(agora),
    widgets: {
      emAtendimento: todos.filter((c) => c.etapa === 'banho' || c.etapa === 'tosa').length,
      agendados: todos.length,
      paraReceber: colunas.pronto.filter((c) => !c.pago).map((c) => c.petNome),
      respostas: 0,
      recebidoCentavos: 0,
      pagamentos: 0,
    },
    colunas,
    noPontoDeVoltar: [],
  };
}

/** Move o atendimento no quadro. Ao chegar em "pronto", a tela pergunta se avisa o tutor. */
export async function moverEtapa(tx: Tx, agendamentoId: string, para: BoardStage | 'agendado'): Promise<{ de: Etapa; pedirAviso: boolean }> {
  const [a] = await tx`select etapa from agendamentos where id = ${agendamentoId} for update`;
  if (!a) throw new Error('Atendimento não encontrado');
  if (a.etapa === 'concluido') throw new Error('Atendimento já recebido não muda de etapa');
  await tx`update agendamentos set etapa = ${para},
    aviso_pronto_em = case when ${para} = 'pronto' then aviso_pronto_em else null end,
    aviso_pronto_enviado = case when ${para} = 'pronto' then aviso_pronto_enviado else null end
    where id = ${agendamentoId}`;
  await tx`insert into etapas_historico (loja_id, agendamento_id, etapa, usuario_id)
    select loja_id, id, ${para}, auth.uid() from agendamentos where id = ${agendamentoId}`;
  return { de: a.etapa, pedirAviso: para === 'pronto' };
}

/** Registra a decisão de avisar (ou não) o tutor de que o pet está pronto. */
export async function concluirAviso(tx: Tx, agendamentoId: string, enviar: boolean, em: Date = new Date()): Promise<void> {
  await tx`update agendamentos set aviso_pronto_em = ${em}, aviso_pronto_enviado = ${enviar} where id = ${agendamentoId}`;
}
