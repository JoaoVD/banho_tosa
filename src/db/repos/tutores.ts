import { normalizePhone } from '@/domain/phone';
import type { Tx } from '../session';

export class TelefoneInvalido extends Error {
  constructor(public telefone: string) {
    super(`Telefone inválido: ${telefone}`);
  }
}

/** Cria o tutor ou devolve o existente com o mesmo telefone (normalizado). */
export async function upsertTutor(tx: Tx, lojaId: string, t: { nome: string; telefone: string }): Promise<{ id: string; criado: boolean }> {
  const tel = normalizePhone(t.telefone);
  if (!tel) throw new TelefoneInvalido(t.telefone);
  const [existente] = await tx`select id from tutores where loja_id = ${lojaId} and telefone_e164 = ${tel}`;
  if (existente) return { id: existente.id, criado: false };
  const [novo] = await tx`insert into tutores (loja_id, nome, telefone_e164) values (${lojaId}, ${t.nome.trim()}, ${tel}) returning id`;
  return { id: novo.id, criado: true };
}

export async function setLembretesAtivos(tx: Tx, tutorId: string, ativo: boolean): Promise<void> {
  await tx`update tutores set lembretes_ativos = ${ativo} where id = ${tutorId}`;
}

export async function updateTutor(tx: Tx, tutorId: string, patch: { nome?: string; telefone?: string }) {
  if (patch.nome !== undefined) await tx`update tutores set nome = ${patch.nome.trim()} where id = ${tutorId}`;
  if (patch.telefone !== undefined) {
    const tel = normalizePhone(patch.telefone);
    if (!tel) throw new TelefoneInvalido(patch.telefone);
    await tx`update tutores set telefone_e164 = ${tel} where id = ${tutorId}`;
  }
}
