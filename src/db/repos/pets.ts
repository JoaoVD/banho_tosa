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
