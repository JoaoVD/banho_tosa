import { businessDayFor, drawerDiff, summarizeDay } from '@/domain/cash';
import { addDaysKey, dayKeySP, hhmmSP } from '@/domain/time';
import type { FormaPagamento } from '@/domain/types';
import type { Tx } from '../session';
import { enqueueMessage } from '@/whatsapp/enqueue';
import { formatBRL } from '@/domain/money';

export type LinhaCaixa = { id: string; hora: string; titulo: string; detalhe: string; forma: FormaPagamento; valorCentavos: number; estornado: boolean; estornoMotivo: string | null };
export type CaixaDia = {
  dia: string;
  pagamentos: LinhaCaixa[];
  resumo: ReturnType<typeof summarizeDay>;
  fundoTrocoCentavos: number;
  fechamento: { fechadoEm: Date; contadoCentavos: number; diferencaCentavos: number } | null;
};

/** Dia do caixa em que entra um recebimento agora (pula dias já fechados). */
export async function diaCaixaAtual(tx: Tx, agora: Date): Promise<string> {
  const hoje = dayKeySP(agora);
  const rows = await tx`select dia from caixa_dias where loja_id = loja_atual() and fechado_em is not null and dia between ${hoje}::date and ${addDaysKey(hoje, 7)}::date`;
  return businessDayFor(agora, new Set(rows.map((r) => new Date(r.dia).toISOString().slice(0, 10))));
}

export async function getCaixaDia(tx: Tx, dia: string): Promise<CaixaDia> {
  const rows = await tx`
    select p.id, p.forma, p.total_centavos, p.recebido_em, p.estornado_em, p.estorno_motivo, t.nome as tutor,
      (select string_agg(i.descricao, ' + ' order by i.descricao) from pagamento_itens i where i.pagamento_id = p.id) as itens
    from pagamentos p join tutores t on t.id = p.tutor_id
    where p.loja_id = loja_atual() and p.dia_caixa = ${dia}::date order by p.recebido_em desc`;
  const pagamentos: LinhaCaixa[] = rows.map((r) => {
    const itens = String(r.itens ?? '');
    const [titulo, ...resto] = itens.split(', ');
    return {
      id: r.id, hora: hhmmSP(new Date(r.recebido_em)),
      titulo: itens.startsWith('Pacote ') ? r.tutor : titulo || r.tutor,
      detalhe: itens.startsWith('Pacote ') ? itens : resto.join(', '),
      forma: r.forma, valorCentavos: r.total_centavos, estornado: !!r.estornado_em, estornoMotivo: r.estorno_motivo,
    };
  });
  const [cfg] = await tx`select fundo_troco_centavos from configuracoes where loja_id = loja_atual()`;
  const [f] = await tx`select fechado_em, contado_centavos, diferenca_centavos from caixa_dias where loja_id = loja_atual() and dia = ${dia}::date and fechado_em is not null`;
  return {
    dia,
    pagamentos,
    resumo: summarizeDay(pagamentos.map((p) => ({ forma: p.forma, totalCentavos: p.valorCentavos, estornado: p.estornado }))),
    fundoTrocoCentavos: cfg?.fundo_troco_centavos ?? 0,
    fechamento: f ? { fechadoEm: new Date(f.fechado_em), contadoCentavos: f.contado_centavos, diferencaCentavos: f.diferenca_centavos } : null,
  };
}

export async function fecharCaixa(tx: Tx, lojaId: string, userId: string, input: { dia: string; contadoCentavos: number; em?: Date }) {
  const c = await getCaixaDia(tx, input.dia);
  if (c.fechamento) throw new Error('O caixa deste dia já está fechado');
  const { diferenca } = drawerDiff(c.resumo.porForma.dinheiro, c.fundoTrocoCentavos, input.contadoCentavos);
  const em = input.em ?? new Date();
  await tx`insert into caixa_dias (loja_id, dia, fechado_em, fechado_por, contado_centavos, esperado_centavos, diferenca_centavos)
    values (${lojaId}, ${input.dia}::date, ${em}, ${userId}, ${input.contadoCentavos}, ${c.resumo.porForma.dinheiro}, ${diferenca})
    on conflict (loja_id, dia) do update set fechado_em = excluded.fechado_em, fechado_por = excluded.fechado_por,
      contado_centavos = excluded.contado_centavos, esperado_centavos = excluded.esperado_centavos, diferenca_centavos = excluded.diferenca_centavos`;
  const [loja] = await tx`select telefone_dona from lojas where id = ${lojaId}`;
  if (loja?.telefone_dona) {
    const gaveta = diferenca === 0 ? 'confere' : diferenca > 0 ? `sobram ${formatBRL(diferenca)}` : `faltam ${formatBRL(-diferenca)}`;
    const f = (n: number) => formatBRL(n).replace(/\u00a0/g, ' ');
    await enqueueMessage(tx, lojaId, {
      telefoneE164: loja.telefone_dona, tipo: 'resumo_caixa', prioridade: 'imediata', dedupeKey: `caixa:${lojaId}:${input.dia}:${em.getTime()}`,
      vars: { dia: `${input.dia.slice(8)}/${input.dia.slice(5, 7)}`, total: f(c.resumo.totalCentavos), pix: f(c.resumo.porForma.pix), credito: f(c.resumo.porForma.credito), debito: f(c.resumo.porForma.debito), dinheiro: f(c.resumo.porForma.dinheiro), gaveta },
    });
  }
  return { totalCentavos: c.resumo.totalCentavos, porForma: c.resumo.porForma, esperadoCentavos: c.resumo.porForma.dinheiro, diferencaCentavos: diferenca };
}

export async function reabrirCaixa(tx: Tx, dia: string) {
  const [{ dona }] = await tx`select e_dona() as dona`;
  if (!dona) throw new Error('Só a dona pode reabrir o caixa');
  await tx`update caixa_dias set fechado_em = null, reaberto_em = now() where loja_id = loja_atual() and dia = ${dia}::date`;
}

/** Desfaz um recebimento: sai do caixa, devolve pontos, banho de pacote e prêmio; o atendimento volta a "pronto". */
export async function estornar(tx: Tx, pagamentoId: string, motivo: string) {
  const [p] = await tx`select loja_id, tutor_id, pontos_ganhos, pontos_usados, estornado_em, dia_caixa from pagamentos where id = ${pagamentoId} for update`;
  if (!p || p.estornado_em) return;
  const [fechado] = await tx`select 1 from caixa_dias where loja_id = ${p.loja_id} and dia = ${p.dia_caixa} and fechado_em is not null`;
  if (fechado) throw new Error('O caixa desse dia está fechado. A dona precisa reabrir antes de estornar.');
  await tx`update pagamentos set estornado_em = now(), estorno_motivo = ${motivo.trim() || 'Sem motivo'} where id = ${pagamentoId}`;
  const ajuste = -p.pontos_ganhos + p.pontos_usados;
  if (ajuste) await tx`insert into movimentos_pontos (loja_id, tutor_id, delta, motivo, pagamento_id) values (${p.loja_id}, ${p.tutor_id}, ${ajuste}, 'Estorno', ${pagamentoId})`;
  const usos = await tx`select pacote_cliente_id, delta from movimentos_pacote where pagamento_id = ${pagamentoId}`;
  for (const u of usos) {
    await tx`update pacotes_cliente set saldo = greatest(saldo - ${u.delta}, 0) where id = ${u.pacote_cliente_id}`;
    await tx`insert into movimentos_pacote (loja_id, pacote_cliente_id, delta, pagamento_id) values (${p.loja_id}, ${u.pacote_cliente_id}, ${-u.delta}, ${pagamentoId})`;
  }
  await tx`update agendamentos set etapa = 'pronto' where id in (select agendamento_id from pagamento_itens where pagamento_id = ${pagamentoId} and agendamento_id is not null)`;
}
