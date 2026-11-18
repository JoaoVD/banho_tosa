'use server';
import { revalidatePath } from 'next/cache';
import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { TIPOS_MENSAGEM, unknownVars, type TipoMensagem } from '@/domain/templates';

export async function salvarTexto(tipo: TipoMensagem, texto: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireDona();
  if (!TIPOS_MENSAGEM.includes(tipo)) return { ok: false, error: 'Tipo de mensagem inválido.' };
  if (!texto.trim()) return { ok: false, error: 'Escreva o texto da mensagem.' };
  const desconhecidas = unknownVars(texto, tipo);
  if (desconhecidas.length) return { ok: false, error: `Variável desconhecida: ${desconhecidas.map((v) => `{${v}}`).join(', ')}` };
  await withSession(user, (tx) => tx`insert into modelos_mensagem (loja_id, tipo, texto) values (${user.lojaId}, ${tipo}, ${texto.trim()})
    on conflict (loja_id, tipo) do update set texto = excluded.texto`);
  revalidatePath('/configuracoes/mensagens');
  return { ok: true };
}

export async function restaurarTexto(tipo: TipoMensagem) {
  const user = await requireDona();
  await withSession(user, (tx) => tx`delete from modelos_mensagem where loja_id = ${user.lojaId} and tipo = ${tipo}`);
  revalidatePath('/configuracoes/mensagens');
}
