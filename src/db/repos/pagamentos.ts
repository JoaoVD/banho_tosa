import { usablePackage } from '@/domain/packages';
import { availablePrizes, pointsEarned } from '@/domain/points';
import type { FormaPagamento, PacoteCliente, Porte, Premio } from '@/domain/types';
import type { Tx } from '../session';

export class AjusteSemMotivo extends Error {
  constructor() {
    super('Ajuste de preço sem motivo');
  }
}
export class FormaObrigatoria extends Error {
  constructor() {
    super('Escolha a forma de pagamento');
  }
}

export type ItemReceber = { agendamentoId: string; petId: string; petNome: string; descricao: string; valorCentavos: number; servicoId: string; porte: Porte };
export type Preview = {
  tutor: { id: string; nome: string };
  itens: ItemReceber[];
  pacoteUsavel: (PacoteCliente & { nome: string; total: number }) | null;
  saldoPontos: number;
  premiosDisponiveis: Premio[];
  outrosProntosDoTutor: { agendamentoId: string; petNome: string; valorCentavos: number }[];
};

async function itens(tx: Tx, ids: string[]): Promise<(ItemReceber & { tutorId: string; tutorNome: string; etapa: string })[]> {
  const rows = await tx`
    select a.id, a.etapa, a.preco_centavos, a.servico_id, p.id as pet_id, p.nome as pet, p.porte, t.id as tutor_id, t.nome as tutor, s.nome as servico
    from agendamentos a join pets p on p.id = a.pet_id join tutores t on t.id = p.tutor_id join servicos s on s.id = a.servico_id
    where a.id = any(${ids}) order by a.inicio`;
  return rows.map((r) => ({
    agendamentoId: r.id, etapa: r.etapa, petId: r.pet_id, petNome: r.pet, porte: r.porte, tutorId: r.tutor_id, tutorNome: r.tutor,
    descricao: `${r.pet}, ${r.servico}`, valorCentavos: r.preco_centavos, servicoId: r.servico_id,
  }));
}

async function pacotesDoTutor(tx: Tx, tutorId: string) {
  const rows = await tx`select id, nome, saldo, total, valido_ate, servico_id, porte from pacotes_cliente where tutor_id = ${tutorId}`;
  return rows.map((r) => ({ id: r.id, nome: r.nome, total: r.total, saldo: r.saldo, validoAte: new Date(r.valido_ate).toISOString().slice(0, 10), servicoId: r.servico_id, porte: r.porte }));
}

export async function saldoPontos(tx: Tx, tutorId: string): Promise<number> {
  const [r] = await tx`select coalesce(sum(delta), 0)::int as s from movimentos_pontos where tutor_id = ${tutorId}`;
  return r.s;
}

async function premios(tx: Tx): Promise<Premio[]> {
  const rows = await tx`select id, nome, pontos, servico_id from premios where loja_id = loja_atual() and ativo order by pontos`;
  return rows.map((r) => ({ id: r.id, nome: r.nome, pontos: r.pontos, servicoId: r.servico_id }));
}

function pacoteParaItens(pacotes: Awaited<ReturnType<typeof pacotesDoTutor>>, its: ItemReceber[], hoje: string) {
  for (const it of its) {
    const p = usablePackage(pacotes, { servicoId: it.servicoId, porte: it.porte, hoje });
    if (p) return { pacote: pacotes.find((x) => x.id === p.id)!, item: it };
  }
  return null;
}

export async function previewRecebimento(tx: Tx, agendamentoIds: string[], hoje: string): Promise<Preview> {
  const its = await itens(tx, agendamentoIds);
  if (!its.length) throw new Error('Atendimento não encontrado');
  const tutorId = its[0].tutorId;
  const [pacotes, saldo, lista] = await Promise.all([pacotesDoTutor(tx, tutorId), saldoPontos(tx, tutorId), premios(tx)]);
  const outros = await tx`
    select a.id, p.nome, a.preco_centavos from agendamentos a join pets p on p.id = a.pet_id
    where p.tutor_id = ${tutorId} and a.etapa = 'pronto' and not (a.id = any(${agendamentoIds})) order by a.inicio`;
  return {
    tutor: { id: tutorId, nome: its[0].tutorNome },
    itens: its.map(({ agendamentoId, petId, petNome, descricao, valorCentavos, servicoId, porte }) => ({ agendamentoId, petId, petNome, descricao, valorCentavos, servicoId, porte })),
    pacoteUsavel: pacoteParaItens(pacotes, its, hoje)?.pacote ?? null,
    saldoPontos: saldo,
    premiosDisponiveis: availablePrizes(saldo, lista),
    outrosProntosDoTutor: outros.map((o) => ({ agendamentoId: o.id, petNome: o.nome, valorCentavos: o.preco_centavos })),
  };
}

export type ReceberInput = {
  idempotencyKey: string;
  agendamentoIds: string[];
  usarPacote: boolean;
  premioId?: string;
  forma: Exclude<FormaPagamento, 'pacote'> | null;
  ajustes?: { agendamentoId: string; valorCentavos: number; motivo: string }[];
  diaCaixa: string;
};
export type ResultadoReceber = { pagamentoId: string; totalCentavos: number; pontosGanhos: number };

async function existente(tx: Tx, key: string): Promise<ResultadoReceber | null> {
  const [p] = await tx`select id, total_centavos, pontos_ganhos from pagamentos where idempotency_key = ${key}`;
  return p ? { pagamentoId: p.id, totalCentavos: p.total_centavos, pontosGanhos: p.pontos_ganhos } : null;
}

/**
 * Registra o pagamento de um ou mais atendimentos do mesmo tutor, numa transação.
 * Idempotente pela chave gerada quando a tela de receber abre (clique duplo não duplica).
 */
export async function receber(tx: Tx, lojaId: string, userId: string, input: ReceberInput): Promise<ResultadoReceber> {
  const ja = await existente(tx, input.idempotencyKey);
  if (ja) return ja;
  for (const aj of input.ajustes ?? []) if (!aj.motivo?.trim()) throw new AjusteSemMotivo();

  // Um recebimento por tutor de cada vez (antes de qualquer insert, para não haver deadlock):
  // pacote e pontos não podem ser usados duas vezes em paralelo.
  const [dono] = await tx`select t.id from agendamentos a join pets p on p.id = a.pet_id join tutores t on t.id = p.tutor_id
    where a.id = ${input.agendamentoIds[0] ?? null} for update of t`;
  if (!dono) throw new Error('Atendimento não encontrado');
  const ja2 = await existente(tx, input.idempotencyKey);
  if (ja2) return ja2;

  // Reserva a chave: uma segunda chamada concorrente espera aqui e depois devolve este pagamento.
  const [reserva] = await tx`insert into pagamentos (loja_id, tutor_id, forma, total_centavos, dia_caixa, usuario_id, idempotency_key)
    select ${lojaId}, p.tutor_id, 'pix', 0, ${input.diaCaixa}, ${userId}, ${input.idempotencyKey}
    from agendamentos a join pets p on p.id = a.pet_id where a.id = ${input.agendamentoIds[0]}
    on conflict (idempotency_key) do nothing returning id`;
  if (!reserva) return (await existente(tx, input.idempotencyKey))!;
  const pagamentoId: string = reserva.id;

  await tx`select id from agendamentos where id = any(${input.agendamentoIds}) for update`;
  const its = await itens(tx, input.agendamentoIds);
  const tutorId = its[0].tutorId;
  if (its.some((i) => i.tutorId !== tutorId)) throw new Error('Os atendimentos precisam ser do mesmo tutor');
  if (its.some((i) => i.etapa === 'concluido')) throw new Error('Atendimento já recebido');

  const valores = new Map(its.map((i) => [i.agendamentoId, i.valorCentavos]));
  const motivos = new Map<string, string>();
  for (const aj of input.ajustes ?? []) {
    valores.set(aj.agendamentoId, aj.valorCentavos);
    motivos.set(aj.agendamentoId, aj.motivo.trim());
  }

  let usouPacote = false;
  if (input.usarPacote) {
    const achou = pacoteParaItens(await pacotesDoTutor(tx, tutorId), its, input.diaCaixa);
    const baixou = achou ? await tx`update pacotes_cliente set saldo = saldo - 1 where id = ${achou.pacote.id} and saldo > 0 returning id` : [];
    if (achou && baixou.length) {
      await tx`insert into movimentos_pacote (loja_id, pacote_cliente_id, delta, agendamento_id, pagamento_id)
        values (${lojaId}, ${achou.pacote.id}, -1, ${achou.item.agendamentoId}, ${pagamentoId})`;
      valores.set(achou.item.agendamentoId, 0);
      motivos.set(achou.item.agendamentoId, `Pacote: ${achou.pacote.nome}`);
      usouPacote = true;
    }
  }

  let pontosUsados = 0;
  if (input.premioId) {
    const [pr] = await tx`select nome, pontos, servico_id from premios where id = ${input.premioId}`;
    if (!pr || (await saldoPontos(tx, tutorId)) < pr.pontos) throw new Error('Pontos insuficientes para o prêmio');
    pontosUsados = pr.pontos;
    const coberto = pr.servico_id && its.find((i) => i.servicoId === pr.servico_id && valores.get(i.agendamentoId)! > 0);
    if (coberto) {
      valores.set(coberto.agendamentoId, 0);
      motivos.set(coberto.agendamentoId, `Prêmio: ${pr.nome}`);
    }
    await tx`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo, pagamento_id) values (${lojaId}, ${tutorId}, ${-pr.pontos}, ${`Prêmio: ${pr.nome}`}, ${pagamentoId})`;
  }

  const total = [...valores.values()].reduce((a, b) => a + b, 0);
  if (total > 0 && !input.forma) throw new FormaObrigatoria();
  const forma: FormaPagamento = total === 0 && usouPacote ? 'pacote' : (input.forma ?? 'pix');
  const ganhos = pointsEarned(total);

  for (const it of its) {
    await tx`insert into pagamento_itens (loja_id, pagamento_id, agendamento_id, descricao, valor_centavos, ajuste_motivo)
      values (${lojaId}, ${pagamentoId}, ${it.agendamentoId}, ${it.descricao}, ${valores.get(it.agendamentoId)!}, ${motivos.get(it.agendamentoId) ?? null})`;
    await tx`update agendamentos set etapa = 'concluido' where id = ${it.agendamentoId}`;
    await tx`insert into etapas_historico (loja_id, agendamento_id, etapa, usuario_id) values (${lojaId}, ${it.agendamentoId}, 'concluido', ${userId})`;
  }
  if (ganhos > 0) {
    await tx`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo, pagamento_id) values (${lojaId}, ${tutorId}, ${ganhos}, 'Atendimento', ${pagamentoId})`;
  }
  await tx`update pagamentos set tutor_id = ${tutorId}, forma = ${forma}, total_centavos = ${total}, pontos_ganhos = ${ganhos}, pontos_usados = ${pontosUsados}
    where id = ${pagamentoId}`;
  return { pagamentoId, totalCentavos: total, pontosGanhos: ganhos };
}
