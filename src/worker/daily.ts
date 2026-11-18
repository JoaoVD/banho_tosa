import type postgres from 'postgres';
import { horariosLivres, expediente } from '@/db/repos/agenda';
import { petsNoPontoDeVoltar } from '@/db/repos/pets';
import type { Tx } from '@/db/session';
import { selectReminderCandidates, type HistLembrete } from '@/domain/reminders';
import { pickDistinctSlots } from '@/domain/slots';
import { addDaysKey, atSP, diaCurtoSP, hhmmSP } from '@/domain/time';
import { enqueueMessage } from '@/whatsapp/enqueue';
import type { Clock } from './clock';

export type DailyDeps = { sql: postgres.Sql; clock: Clock; lojaId: string };

/** Roda `fn` com a identidade da dona da loja, para reaproveitar as consultas com RLS. */
export async function comoLoja<T>(sql: postgres.Sql, lojaId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const [dona] = await sql`select user_id from perfis where loja_id = ${lojaId} order by (papel = 'dona') desc limit 1`;
  if (!dona) throw new Error(`Loja ${lojaId} sem usuários`);
  return (await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: dona.user_id, role: 'authenticated' })}, true)`;
    await tx`set local role authenticated`;
    return fn(tx as unknown as Tx);
  })) as T;
}

/** Lembretes de retorno e de véspera do dia. Idempotente: cada tipo roda uma vez por loja e dia. */
export async function runDaily({ sql, clock, lojaId }: DailyDeps, dia: string): Promise<{ lembretes: number; vesperas: number }> {
  const agora = clock.now();
  return comoLoja(sql, lojaId, async (tx) => {
    // A marca fica na mesma transação: se algo falhar, o dia não é dado como feito.
    const [ok] = await tx`insert into execucoes_diarias (loja_id, dia, tipo) values (${lojaId}, ${dia}, 'lembretes')
      on conflict do nothing returning 1`;
    if (!ok) return { lembretes: 0, vesperas: 0 };

    // Retorno ---------------------------------------------------------
    const pets = await petsNoPontoDeVoltar(tx, dia);
    const histRows = await tx`select tutor_id, enviado_em, respondido from lembretes_enviados where loja_id = ${lojaId}`;
    const hist = new Map<string, HistLembrete[]>();
    for (const h of histRows) hist.set(h.tutor_id, [...(hist.get(h.tutor_id) ?? []), { enviadoEm: new Date(h.enviado_em), respondido: h.respondido }]);
    const pulados = await tx`select tutor_id from lembretes_pulados where loja_id = ${lojaId} and dia = ${dia}::date`;
    const removidos = new Set<string>(pulados.map((r) => r.tutor_id));
    // Quem ainda tem lembrete esperando na fila (ex.: segurado pelo teto diário) não recebe outro.
    for (const r of await tx`select tutor_id from fila_envio where loja_id = ${lojaId} and tipo = 'lembrete_retorno'
      and status in ('pendente', 'enviando') and tutor_id is not null`) removidos.add(r.tutor_id);
    const candidatos = selectReminderCandidates(
      pets.map((p) => ({ petId: p.petId, tutorId: p.tutorId, lembretesAtivos: p.lembretesAtivos, status: p.ciclo })),
      hist,
      agora,
    ).filter((c) => !removidos.has(c.tutorId));

    // Próximos 2 dias em que a loja abre, a partir de amanhã.
    const dias: string[] = [];
    for (let i = 1; dias.length < 2 && i <= 14; i++) if (await expediente(tx, addDaysKey(dia, i))) dias.push(addDaysKey(dia, i));

    const servicos: string[] = [];
    const opcoes: Date[][] = [];
    for (const c of candidatos) {
      const [ult] = await tx`select servico_id from agendamentos where pet_id = ${c.petId} and etapa = 'concluido' order by inicio desc limit 1`;
      const servicoId = ult?.servico_id ?? (await tx`select id from servicos where loja_id = ${lojaId} and ativo order by inclui_tosa, nome limit 1`)[0]?.id;
      servicos.push(servicoId);
      const livres: Date[] = [];
      for (const d of dias) livres.push(...(await horariosLivres(tx, { petId: c.petId, servicoId, dia: d })).map((h) => h.inicio));
      opcoes.push(livres);
    }
    const escolhidos = pickDistinctSlots(opcoes, candidatos.length);
    let lembretes = 0;
    for (const [i, c] of candidatos.entries()) {
      const inicio = escolhidos[i];
      if (!inicio) continue;
      const [pet] = await tx`select nome from pets where id = ${c.petId}`;
      const [prop] = await tx`insert into propostas_horario (loja_id, tutor_id, pet_id, servico_id, inicio) values (${lojaId}, ${c.tutorId}, ${c.petId}, ${servicos[i]}, ${inicio}) returning id`;
      const r = await enqueueMessage(tx, lojaId, {
        tutorId: c.tutorId, tipo: 'lembrete_retorno', prioridade: 'lote', dedupeKey: `lembrete:${c.tutorId}:${dia}`, propostaId: prop.id,
        vars: { pet: pet.nome, dia: diaCurtoSP(inicio), hora: hhmmSP(inicio) },
      });
      if ('filaId' in r) lembretes++;
    }

    // Véspera ---------------------------------------------------------
    const amanha = addDaysKey(dia, 1);
    const ags = await tx`select a.id, a.inicio, p.nome as pet, p.tutor_id, s.nome as servico
      from agendamentos a join pets p on p.id = a.pet_id join servicos s on s.id = a.servico_id
      where a.loja_id = ${lojaId} and a.etapa = 'agendado' and not a.historico
        and a.inicio >= ${atSP(amanha, '00:00')} and a.inicio < ${atSP(addDaysKey(amanha, 1), '00:00')}`;
    let vesperas = 0;
    for (const a of ags) {
      const r = await enqueueMessage(tx, lojaId, {
        tutorId: a.tutor_id, tipo: 'vespera', prioridade: 'lote', dedupeKey: `vespera:${a.id}`,
        vars: { pet: a.pet, hora: hhmmSP(new Date(a.inicio)), servico: a.servico },
      });
      if ('filaId' in r) vesperas++;
    }
    return { lembretes, vesperas };
  });
}
