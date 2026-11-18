import { pointsEarned } from '@/domain/points';
import { addDaysKey } from '@/domain/time';
import type { FormaPagamento, Porte } from '@/domain/types';
import type { Tx } from '../session';
import { enqueueMessage, type EnqueueResult } from '@/whatsapp/enqueue';

export type ModeloInput = { id?: string; nome: string; precoCentavos: number; banhos: number; servicoId: string; porte: Porte | null; validadeDias: number; ativo?: boolean };
export type Modelo = Required<Omit<ModeloInput, 'id'>> & { id: string; servicoNome: string; ativos: number };

export async function listModelos(tx: Tx, hoje: string, apenasAtivos = false): Promise<Modelo[]> {
  const rows = await tx`
    select m.*, s.nome as servico_nome,
      (select count(*)::int from pacotes_cliente pc where pc.modelo_id = m.id and pc.saldo > 0 and pc.valido_ate >= ${hoje}::date) as ativos
    from pacotes_modelo m join servicos s on s.id = m.servico_id
    where m.loja_id = loja_atual() ${apenasAtivos ? tx`and m.ativo` : tx``} order by m.preco_centavos`;
  return rows.map((r) => ({
    id: r.id, nome: r.nome, precoCentavos: r.preco_centavos, banhos: r.banhos, servicoId: r.servico_id, servicoNome: r.servico_nome,
    porte: r.porte, validadeDias: r.validade_dias, ativo: r.ativo, ativos: r.ativos,
  }));
}

export async function upsertModelo(tx: Tx, lojaId: string, m: ModeloInput): Promise<{ id: string }> {
  if (m.id) {
    const r = await tx`update pacotes_modelo set nome = ${m.nome}, preco_centavos = ${m.precoCentavos}, banhos = ${m.banhos}, servico_id = ${m.servicoId},
      porte = ${m.porte}, validade_dias = ${m.validadeDias}, ativo = ${m.ativo ?? true} where id = ${m.id} returning id`;
    if (!r.length) throw new Error('Sem permissão para alterar o pacote');
    return { id: m.id };
  }
  const [r] = await tx`insert into pacotes_modelo (loja_id, nome, preco_centavos, banhos, servico_id, porte, validade_dias, ativo)
    values (${lojaId}, ${m.nome}, ${m.precoCentavos}, ${m.banhos}, ${m.servicoId}, ${m.porte}, ${m.validadeDias}, ${m.ativo ?? true}) returning id`;
  return { id: r.id };
}

export type VendaInput = { idempotencyKey: string; tutorId: string; modeloId: string; forma: Exclude<FormaPagamento, 'pacote'>; diaCaixa: string };

/** Vende um pacote: entra no caixa do dia da venda e gera pontos sobre o valor pago. Idempotente. */
export async function venderPacote(tx: Tx, lojaId: string, userId: string, v: VendaInput): Promise<{ pacoteClienteId: string; pagamentoId: string }> {
  const [m] = await tx`select * from pacotes_modelo where id = ${v.modeloId}`;
  if (!m) throw new Error('Pacote não encontrado');
  const [pg] = await tx`insert into pagamentos (loja_id, tutor_id, forma, total_centavos, pontos_ganhos, dia_caixa, usuario_id, idempotency_key)
    values (${lojaId}, ${v.tutorId}, ${v.forma}, ${m.preco_centavos}, ${pointsEarned(m.preco_centavos)}, ${v.diaCaixa}, ${userId}, ${v.idempotencyKey})
    on conflict (idempotency_key) do nothing returning id`;
  if (!pg) {
    const [e] = await tx`select p.id, mp.pacote_cliente_id from pagamentos p join movimentos_pacote mp on mp.pagamento_id = p.id where p.idempotency_key = ${v.idempotencyKey}`;
    return { pagamentoId: e.id, pacoteClienteId: e.pacote_cliente_id };
  }
  const [pc] = await tx`insert into pacotes_cliente (loja_id, tutor_id, modelo_id, nome, servico_id, porte, total, saldo, valido_ate)
    values (${lojaId}, ${v.tutorId}, ${m.id}, ${m.nome}, ${m.servico_id}, ${m.porte}, ${m.banhos}, ${m.banhos}, ${addDaysKey(v.diaCaixa, m.validade_dias)}) returning id`;
  await tx`insert into movimentos_pacote (loja_id, pacote_cliente_id, delta, pagamento_id) values (${lojaId}, ${pc.id}, ${m.banhos}, ${pg.id})`;
  await tx`insert into pagamento_itens (loja_id, pagamento_id, descricao, valor_centavos) values (${lojaId}, ${pg.id}, ${`Pacote ${m.nome}`}, ${m.preco_centavos})`;
  const pts = pointsEarned(m.preco_centavos);
  if (pts) await tx`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo, pagamento_id) values (${lojaId}, ${v.tutorId}, ${pts}, ${`Pacote ${m.nome}`}, ${pg.id})`;
  return { pacoteClienteId: pc.id, pagamentoId: pg.id };
}

export type Acabando = { pacoteClienteId: string; tutorId: string; tutorNome: string; petsNomes: string; nome: string; validoAte: string; avisado: boolean };

export async function listAcabando(tx: Tx, hoje: string): Promise<Acabando[]> {
  const rows = await tx`
    select pc.id, pc.nome, pc.valido_ate, pc.aviso_renovacao_em, t.id as tutor_id, t.nome as tutor,
      (select string_agg(p.nome, ', ' order by p.nome) from pets p where p.tutor_id = t.id) as pets
    from pacotes_cliente pc join tutores t on t.id = pc.tutor_id
    where pc.loja_id = loja_atual() and pc.saldo = 1 and pc.valido_ate >= ${hoje}::date
    order by pc.valido_ate`;
  return rows.map((r) => ({
    pacoteClienteId: r.id, tutorId: r.tutor_id, tutorNome: r.tutor, petsNomes: r.pets ?? '', nome: r.nome,
    validoAte: new Date(r.valido_ate).toISOString().slice(0, 10), avisado: !!r.aviso_renovacao_em,
  }));
}

export async function estenderValidade(tx: Tx, pacoteClienteId: string, novaData: string) {
  await tx`update pacotes_cliente set valido_ate = ${novaData}::date where id = ${pacoteClienteId}`;
}

/** Avisa o tutor que o pacote está no último banho (uma vez por pacote). */
export async function avisarRenovacao(tx: Tx, lojaId: string, pacoteClienteId: string): Promise<EnqueueResult> {
  const [pc] = await tx`select pc.nome, pc.tutor_id, (select string_agg(p.nome, ' e ' order by p.nome) from pets p where p.tutor_id = pc.tutor_id) as pets
    from pacotes_cliente pc where pc.id = ${pacoteClienteId}`;
  const r = await enqueueMessage(tx, lojaId, {
    tutorId: pc.tutor_id, tipo: 'pacote_acabando', prioridade: 'imediata', dedupeKey: `pacote:${pacoteClienteId}`,
    vars: { pet: pc.pets ?? '', pacote: pc.nome },
  });
  if ('filaId' in r) await tx`update pacotes_cliente set aviso_renovacao_em = now() where id = ${pacoteClienteId}`;
  return r;
}
