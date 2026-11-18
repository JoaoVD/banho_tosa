import { blocksFor, type Bloco } from '@/domain/pricing';
import { freeGaps } from '@/domain/slots';
import { addDaysKey, atSP, dayKeySP } from '@/domain/time';
import type { Etapa, Porte } from '@/domain/types';
import type { Tx } from '../session';
import { enqueueMessage } from '@/whatsapp/enqueue';
import { diaCurtoSP, hhmmSP } from '@/domain/time';

export type ProfissionalAgenda = { id: string; nome: string; funcao: 'banho' | 'tosa' };
export type BlocoAgenda = {
  id: string; agendamentoId: string; servicoId: string; profissionalId: string; inicio: Date; fim: Date;
  petId: string; petNome: string; tutorNome: string; servicoNome: string; etapa: Etapa;
};
type Intervalo = { inicio: Date; fim: Date };
type ServicoInfo = { id: string; nome: string; incluiBanho: boolean; incluiTosa: boolean; precos: Record<Porte, { precoCentavos: number; duracaoMin: number }> };
type Ocupado = Intervalo & { profissionalId: string };

const CANCELADAS = ['cancelado', 'nao_compareceu'];

export async function profissionaisAtivos(tx: Tx): Promise<ProfissionalAgenda[]> {
  return tx<ProfissionalAgenda[]>`select id, nome, funcao from profissionais where loja_id = loja_atual() and ativo order by funcao, nome`;
}

/** Expediente do dia (null = fechado). */
export async function expediente(tx: Tx, dia: string): Promise<{ abre: string; fecha: string } | null> {
  const dow = new Date(`${dia}T12:00:00Z`).getUTCDay();
  const [h] = await tx`select abre, fecha from horarios_funcionamento where loja_id = loja_atual() and dia_semana = ${dow}`;
  return h ? { abre: h.abre.slice(0, 5), fecha: h.fecha.slice(0, 5) } : null;
}

async function ocupados(tx: Tx, desde: Date, ate: Date, ignorarAgendamento?: string): Promise<Ocupado[]> {
  const rows = await tx`select profissional_id, lower(periodo) as ini, upper(periodo) as fim from agendamento_blocos
    where loja_id = loja_atual() and ativo and periodo && tstzrange(${desde}, ${ate})
    ${ignorarAgendamento ? tx`and agendamento_id <> ${ignorarAgendamento}` : tx``}`;
  return rows.map((r) => ({ profissionalId: r.profissional_id, inicio: new Date(r.ini), fim: new Date(r.fim) }));
}

async function servicoInfo(tx: Tx, servicoId: string): Promise<ServicoInfo> {
  const [s] = await tx`select id, nome, inclui_banho, inclui_tosa from servicos where id = ${servicoId}`;
  if (!s) throw new Error('Serviço não encontrado');
  const precos = await tx`select porte, preco_centavos, duracao_min from precos_servico where servico_id = ${servicoId}`;
  return {
    id: s.id, nome: s.nome, incluiBanho: s.inclui_banho, incluiTosa: s.inclui_tosa,
    precos: Object.fromEntries(precos.map((p) => [p.porte, { precoCentavos: p.preco_centavos, duracaoMin: p.duracao_min }])) as ServicoInfo['precos'],
  };
}

const conflita = (b: Bloco, ocup: Ocupado[]) =>
  ocup.some((o) => o.profissionalId === b.profissionalId && b.inicio < o.fim && b.fim > o.inicio);

/** Primeira combinação de profissionais em que o atendimento cabe, ou null. */
function encaixar(s: ServicoInfo, porte: Porte, inicio: Date, profs: ProfissionalAgenda[], ocup: Ocupado[]): Bloco[] | null {
  const banhistas = profs.filter((p) => p.funcao === 'banho').map((p) => p.id);
  const tosadores = profs.filter((p) => p.funcao === 'tosa').map((p) => p.id);
  const bs = s.incluiBanho ? banhistas : [''];
  const ts = s.incluiTosa ? tosadores : [''];
  for (const banho of bs) {
    for (const tosa of ts) {
      const blocos = blocksFor(s, porte, inicio, { banho, tosa });
      if (blocos.every((b) => b.profissionalId && !conflita(b, ocup))) return blocos;
    }
  }
  return null;
}

async function petPorte(tx: Tx, petId: string): Promise<Porte> {
  const [p] = await tx`select porte from pets where id = ${petId}`;
  if (!p) throw new Error('Pet não encontrado');
  return p.porte;
}

export type HorarioLivre = { inicio: Date; profissionalNome: string };

/** Inícios (de 30 em 30 min) em que o serviço cabe no dia, já escolhendo os profissionais. */
export async function horariosLivres(tx: Tx, input: { petId: string; servicoId: string; dia: string; depoisDe?: Date; ignorarAgendamento?: string }): Promise<HorarioLivre[]> {
  const exp = await expediente(tx, input.dia);
  if (!exp) return [];
  const [s, porte, profs] = await Promise.all([servicoInfo(tx, input.servicoId), petPorte(tx, input.petId), profissionaisAtivos(tx)]);
  const abre = atSP(input.dia, exp.abre), fecha = atSP(input.dia, exp.fecha);
  const ocup = await ocupados(tx, abre, fecha, input.ignorarAgendamento);
  const dur = s.precos[porte].duracaoMin * 60_000;
  const nome = new Map(profs.map((p) => [p.id, p.nome]));
  const out: HorarioLivre[] = [];
  for (let t = abre.getTime(); t + dur <= fecha.getTime(); t += 30 * 60_000) {
    if (input.depoisDe && t < input.depoisDe.getTime()) continue;
    const blocos = encaixar(s, porte, new Date(t), profs, ocup);
    if (blocos) out.push({ inicio: new Date(t), profissionalNome: nome.get(blocos[0].profissionalId) ?? '' });
  }
  return out;
}

async function proximoLivre(tx: Tx, petId: string, servicoId: string, aPartirDe: Date, ignorarAgendamento?: string): Promise<Date | null> {
  const dia0 = dayKeySP(aPartirDe);
  for (let i = 0; i < 14; i++) {
    const dia = addDaysKey(dia0, i);
    const livres = await horariosLivres(tx, { petId, servicoId, dia, depoisDe: aPartirDe, ignorarAgendamento });
    if (livres.length) return livres[0].inicio;
  }
  return null;
}

export type ResultadoAgendar = { id: string; inicio: Date; profissionalNome: string } | { erro: 'horario_ocupado'; proximo: Date | null };

async function gravarBlocos(tx: Tx, lojaId: string, agendamentoId: string, blocos: Bloco[]) {
  for (const b of blocos) {
    await tx`insert into agendamento_blocos (loja_id, agendamento_id, profissional_id, periodo)
      values (${lojaId}, ${agendamentoId}, ${b.profissionalId}, tstzrange(${b.inicio}, ${b.fim}))`;
  }
}

const ehConflito = (e: unknown) => (e as { code?: string })?.code === '23P01';

export async function criarAgendamento(
  tx: Tx,
  lojaId: string,
  userId: string,
  input: { petId: string; servicoId: string; inicio: Date; confirmarWhatsApp: boolean },
): Promise<ResultadoAgendar> {
  const [s, porte, profs] = await Promise.all([servicoInfo(tx, input.servicoId), petPorte(tx, input.petId), profissionaisAtivos(tx)]);
  const dur = s.precos[porte].duracaoMin * 60_000;
  const ocup = await ocupados(tx, input.inicio, new Date(input.inicio.getTime() + dur));
  const blocos = encaixar(s, porte, input.inicio, profs, ocup);
  const ocupado = async () => ({ erro: 'horario_ocupado' as const, proximo: await proximoLivre(tx, input.petId, input.servicoId, input.inicio) });
  if (!blocos) return ocupado();
  try {
    const id = await tx.savepoint(async (sp) => {
      const [a] = await sp`insert into agendamentos (loja_id, pet_id, servico_id, preco_centavos, inicio, fim, criado_por)
        values (${lojaId}, ${input.petId}, ${input.servicoId}, ${s.precos[porte].precoCentavos}, ${input.inicio},
                ${new Date(input.inicio.getTime() + dur)}, ${userId}) returning id`;
      await gravarBlocos(sp as unknown as Tx, lojaId, a.id, blocos);
      return a.id as string;
    });
    const nome = profs.find((p) => p.id === blocos[0].profissionalId)?.nome ?? '';
    if (input.confirmarWhatsApp) {
      const [p] = await tx`select nome, tutor_id from pets where id = ${input.petId}`;
      await enqueueMessage(tx, lojaId, {
        tutorId: p.tutor_id, tipo: 'confirmacao', prioridade: 'imediata', dedupeKey: `confirmacao:${id}`,
        vars: { pet: p.nome, dia: diaCurtoSP(input.inicio), hora: hhmmSP(input.inicio), servico: s.nome },
      });
    }
    return { id, inicio: input.inicio, profissionalNome: nome };
  } catch (e) {
    if (ehConflito(e)) return ocupado();
    throw e;
  }
}

export async function remarcar(tx: Tx, lojaId: string, id: string, inicio: Date): Promise<ResultadoAgendar> {
  const [a] = await tx`select pet_id, servico_id from agendamentos where id = ${id}`;
  const [s, porte, profs] = await Promise.all([servicoInfo(tx, a.servico_id), petPorte(tx, a.pet_id), profissionaisAtivos(tx)]);
  const dur = s.precos[porte].duracaoMin * 60_000;
  const ocup = await ocupados(tx, inicio, new Date(inicio.getTime() + dur), id);
  const blocos = encaixar(s, porte, inicio, profs, ocup);
  const ocupado = async () => ({ erro: 'horario_ocupado' as const, proximo: await proximoLivre(tx, a.pet_id, a.servico_id, inicio, id) });
  if (!blocos) return ocupado();
  try {
    await tx.savepoint(async (sp) => {
      await sp`delete from agendamento_blocos where agendamento_id = ${id}`;
      await gravarBlocos(sp as unknown as Tx, lojaId, id, blocos);
      await sp`update agendamentos set inicio = ${inicio}, fim = ${new Date(inicio.getTime() + dur)}, etapa = 'agendado' where id = ${id}`;
    });
  } catch (e) {
    if (ehConflito(e)) return ocupado();
    throw e;
  }
  return { id, inicio, profissionalNome: profs.find((p) => p.id === blocos[0].profissionalId)?.nome ?? '' };
}

async function encerrar(tx: Tx, id: string, etapa: 'cancelado' | 'nao_compareceu', motivo: string | null) {
  await tx`update agendamentos set etapa = ${etapa}, cancelado_motivo = ${motivo} where id = ${id}`;
  await tx`update agendamento_blocos set ativo = false where agendamento_id = ${id}`;
  await tx`insert into etapas_historico (loja_id, agendamento_id, etapa, usuario_id) select loja_id, id, ${etapa}, auth.uid() from agendamentos where id = ${id}`;
}

export const cancelar = (tx: Tx, id: string, motivo: string) => encerrar(tx, id, 'cancelado', motivo || null);
export const marcarNaoCompareceu = (tx: Tx, id: string) => encerrar(tx, id, 'nao_compareceu', null);

export async function listDia(tx: Tx, dia: string): Promise<{ profissionais: ProfissionalAgenda[]; expediente: { abre: string; fecha: string } | null; blocos: BlocoAgenda[]; livres: Record<string, Intervalo[]> }> {
  const [profissionais, exp] = await Promise.all([profissionaisAtivos(tx), expediente(tx, dia)]);
  const ini = atSP(dia, '00:00'), fim = atSP(addDaysKey(dia, 1), '00:00');
  const rows = await tx`
    select b.id, b.agendamento_id, a.servico_id, b.profissional_id, lower(b.periodo) as ini, upper(b.periodo) as fim,
           p.id as pet_id, p.nome as pet, t.nome as tutor, s.nome as servico, a.etapa
    from agendamento_blocos b
    join agendamentos a on a.id = b.agendamento_id
    join pets p on p.id = a.pet_id join tutores t on t.id = p.tutor_id join servicos s on s.id = a.servico_id
    where b.loja_id = loja_atual() and b.ativo and a.etapa <> all(${CANCELADAS}) and b.periodo && tstzrange(${ini}, ${fim})
    order by lower(b.periodo)`;
  const blocos: BlocoAgenda[] = rows.map((r) => ({
    id: r.id, agendamentoId: r.agendamento_id, servicoId: r.servico_id, profissionalId: r.profissional_id, inicio: new Date(r.ini), fim: new Date(r.fim),
    petId: r.pet_id, petNome: r.pet, tutorNome: r.tutor, servicoNome: r.servico, etapa: r.etapa,
  }));
  const livres: Record<string, Intervalo[]> = {};
  for (const p of profissionais) {
    livres[p.id] = exp ? freeGaps({ dia, abre: exp.abre, fecha: exp.fecha, ocupados: blocos.filter((b) => b.profissionalId === p.id) }) : [];
  }
  return { profissionais, expediente: exp, blocos, livres };
}

/** Resumo da semana: por dia e profissional, quantos atendimentos e o primeiro horário livre. */
export async function resumoSemana(tx: Tx, dias: string[]) {
  const out: Record<string, Record<string, { total: number; primeiroLivre: Date | null }>> = {};
  for (const dia of dias) {
    const d = await listDia(tx, dia);
    out[dia] = Object.fromEntries(
      d.profissionais.map((p) => [p.id, { total: new Set(d.blocos.filter((b) => b.profissionalId === p.id).map((b) => b.agendamentoId)).size, primeiroLivre: d.livres[p.id][0]?.inicio ?? null }]),
    );
  }
  return out;
}
