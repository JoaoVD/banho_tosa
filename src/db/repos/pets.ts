import { cycleStatus, suggestCycle, type CycleStatus } from '@/domain/cycle';
import { atSP } from '@/domain/time';
import type { Porte } from '@/domain/types';
import type { Tx } from '../session';

export type PetListItem = { id: string; nome: string; tutorNome: string; fotoUrl: string | null };

export type PetInput = {
  tutorId: string;
  nome: string;
  especie: 'cao' | 'gato';
  raca?: string | null;
  porte: Porte;
  nascimento?: string | null;
  cuidados?: string[];
  observacoes?: string | null;
};

export type PetFicha = {
  id: string;
  nome: string;
  especie: 'cao' | 'gato';
  raca: string | null;
  porte: Porte;
  nascimento: string | null;
  cuidados: string[];
  observacoes: string | null;
  fotoUrl: string | null;
  cicloDias: number | null;
  cicloFixo: boolean;
  tutor: { id: string; nome: string; telefone: string; lembretesAtivos: boolean };
};

export async function searchPets(tx: Tx, q: string, limite = 200): Promise<PetListItem[]> {
  const termo = q.trim();
  const digitos = termo.replace(/\D/g, '');
  const rows = await tx`
    select p.id, p.nome, p.foto_url, t.nome as tutor_nome
    from pets p join tutores t on t.id = p.tutor_id
    where ${termo === ''}
       or p.nome ilike ${'%' + termo + '%'}
       or t.nome ilike ${'%' + termo + '%'}
       or (${digitos.length >= 4} and t.telefone_e164 like ${'%' + digitos + '%'})
    order by p.nome
    limit ${limite}`;
  return rows.map((r) => ({ id: r.id, nome: r.nome, tutorNome: r.tutor_nome, fotoUrl: r.foto_url }));
}

export async function createPet(tx: Tx, lojaId: string, p: PetInput): Promise<{ id: string }> {
  const [r] = await tx`insert into pets (loja_id, tutor_id, nome, especie, raca, porte, nascimento, cuidados, observacoes)
    values (${lojaId}, ${p.tutorId}, ${p.nome.trim()}, ${p.especie}, ${p.raca ?? null}, ${p.porte}, ${p.nascimento ?? null},
            ${p.cuidados ?? []}, ${p.observacoes ?? null}) returning id`;
  return { id: r.id };
}

export async function updatePet(tx: Tx, id: string, patch: Partial<Omit<PetInput, 'tutorId'>> & { fotoUrl?: string | null; cicloDias?: number | null; cicloFixo?: boolean }) {
  const map: Record<string, string> = { nome: 'nome', especie: 'especie', raca: 'raca', porte: 'porte', nascimento: 'nascimento', cuidados: 'cuidados', observacoes: 'observacoes', fotoUrl: 'foto_url', cicloDias: 'ciclo_dias', cicloFixo: 'ciclo_fixo' };
  const row = Object.fromEntries(Object.entries(patch).filter(([k]) => k in map).map(([k, v]) => [map[k], v]));
  if (Object.keys(row).length) await tx`update pets set ${tx(row)} where id = ${id}`;
}

export async function getPetFicha(tx: Tx, id: string): Promise<PetFicha | null> {
  const [r] = await tx`
    select p.*, t.id as t_id, t.nome as t_nome, t.telefone_e164, t.lembretes_ativos
    from pets p join tutores t on t.id = p.tutor_id where p.id = ${id}`;
  if (!r) return null;
  return {
    id: r.id,
    nome: r.nome,
    especie: r.especie,
    raca: r.raca,
    porte: r.porte,
    nascimento: r.nascimento ? new Date(r.nascimento).toISOString().slice(0, 10) : null,
    cuidados: r.cuidados,
    observacoes: r.observacoes,
    fotoUrl: r.foto_url,
    cicloDias: r.ciclo_dias,
    cicloFixo: r.ciclo_fixo,
    tutor: { id: r.t_id, nome: r.t_nome, telefone: r.telefone_e164, lembretesAtivos: r.lembretes_ativos },
  };
}


export type Ciclo = CycleStatus & { cicloDias: number; ultimaVisita: Date | null; sugerido: boolean };

type LinhaCiclo = { pet_id: string; nome: string; tutor_id: string; lembretes_ativos: boolean; ciclo_dias: number | null; ciclo_fixo: boolean; visitas: Date[] | null; padrao: number | null; futuro: boolean };

async function linhasCiclo(tx: Tx, hoje: string, petId?: string): Promise<LinhaCiclo[]> {
  const amanha = atSP(hoje, '00:00');
  return tx<LinhaCiclo[]>`
    select p.id as pet_id, p.nome, p.tutor_id, t.lembretes_ativos, p.ciclo_dias, p.ciclo_fixo,
      (select array_agg(a.inicio order by a.inicio) from agendamentos a where a.pet_id = p.id and a.etapa = 'concluido') as visitas,
      (select s.ciclo_padrao_dias from agendamentos a join servicos s on s.id = a.servico_id
        where a.pet_id = p.id and a.etapa = 'concluido' order by a.inicio desc limit 1) as padrao,
      exists (select 1 from agendamentos a where a.pet_id = p.id and a.inicio >= ${amanha}
        and a.etapa not in ('concluido', 'cancelado', 'nao_compareceu')) as futuro
    from pets p join tutores t on t.id = p.tutor_id
    where p.loja_id = loja_atual() ${petId ? tx`and p.id = ${petId}` : tx``}`;
}

function calcular(l: LinhaCiclo, hoje: string): Ciclo {
  const visitas = (l.visitas ?? []).map((v) => new Date(v));
  const sugerido = !l.ciclo_fixo;
  const cicloDias = l.ciclo_fixo && l.ciclo_dias ? l.ciclo_dias : suggestCycle(visitas, l.padrao ?? 15);
  const ultimaVisita = visitas.at(-1) ?? null;
  return { ...cycleStatus({ ultimaVisita, cicloDias, temAgendamentoFuturo: l.futuro, hoje }), cicloDias, ultimaVisita, sugerido };
}

export async function cicloDoPet(tx: Tx, petId: string, hoje: string): Promise<Ciclo | null> {
  const [l] = await linhasCiclo(tx, hoje, petId);
  return l ? calcular(l, hoje) : null;
}

export type PetParaVoltar = { petId: string; petNome: string; tutorId: string; lembretesAtivos: boolean; ciclo: Ciclo };

/** Pets cujo ciclo de retorno já venceu e sem agendamento futuro (mais atrasados primeiro). */
export async function petsNoPontoDeVoltar(tx: Tx, hoje: string): Promise<PetParaVoltar[]> {
  return (await linhasCiclo(tx, hoje))
    .map((l) => ({ petId: l.pet_id, petNome: l.nome, tutorId: l.tutor_id, lembretesAtivos: l.lembretes_ativos, ciclo: calcular(l, hoje) }))
    .filter((p) => p.ciclo.noPonto)
    .sort((a, b) => (a.ciclo.voltaEm ?? 0) - (b.ciclo.voltaEm ?? 0));
}

export type Atendimento = { id: string; dia: Date; servico: string; valorCentavos: number | null; pacote: boolean; profissional: string | null };

export async function historicoDoPet(tx: Tx, petId: string): Promise<Atendimento[]> {
  const rows = await tx`
    select a.id, a.inicio, s.nome as servico, coalesce(pi.valor_centavos, a.preco_centavos) as preco_centavos,
      coalesce(pi.ajuste_motivo like 'Pacote:%', false) as pacote,
      (select pr.nome from agendamento_blocos b join profissionais pr on pr.id = b.profissional_id
        where b.agendamento_id = a.id order by lower(b.periodo) limit 1) as profissional
    from agendamentos a join servicos s on s.id = a.servico_id
    left join pagamento_itens pi on pi.agendamento_id = a.id
    where a.pet_id = ${petId} and a.etapa = 'concluido' order by a.inicio desc limit 50`;
  return rows.map((r) => ({ id: r.id, dia: new Date(r.inicio), servico: r.servico, valorCentavos: r.preco_centavos, pacote: r.pacote, profissional: r.profissional }));
}

export async function fixarCiclo(tx: Tx, petId: string, dias: number | null) {
  await tx`update pets set ciclo_dias = ${dias}, ciclo_fixo = ${dias !== null} where id = ${petId}`;
}

export async function fidelidadeDoTutor(tx: Tx, tutorId: string, hoje: string): Promise<{ pacote: { saldo: number; total: number; validoAte: string } | null; pontos: number }> {
  const [p] = await tx`select saldo, total, valido_ate from pacotes_cliente where tutor_id = ${tutorId} and saldo > 0 and valido_ate >= ${hoje}::date order by valido_ate limit 1`;
  const [s] = await tx`select coalesce(sum(delta), 0)::int as s from movimentos_pontos where tutor_id = ${tutorId}`;
  return { pacote: p ? { saldo: p.saldo, total: p.total, validoAte: new Date(p.valido_ate).toISOString().slice(0, 10) } : null, pontos: s.s };
}

/** Atendimento do pet pronto e ainda não recebido (para o atalho "Receber" da ficha). */
export async function prontoParaReceber(tx: Tx, petId: string): Promise<string | null> {
  const [a] = await tx`select id from agendamentos where pet_id = ${petId} and etapa = 'pronto' order by inicio desc limit 1`;
  return a?.id ?? null;
}
