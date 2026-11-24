'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireDona } from '@/auth/current';
import { serviceDb } from '@/db/client';
import { withSession } from '@/db/session';
import { setHorarios, updateConfig, updateLoja, upsertProfissional } from '@/db/repos/config';
import { upsertServico } from '@/db/repos/servicos';
import { perfilDaLoja } from '@/db/repos/usuarios';
import { ERRO_USUARIO, SENHA_MIN, USUARIO_RE, emailInterno, normalizarUsuario } from '@/domain/usuario';
import { parseBRL } from '@/domain/money';
import { normalizePhone } from '@/domain/phone';
import { PORTES, PORTE_LABEL, type Porte } from '@/domain/types';
import type { FormResult } from '@/ui/ActionForm';

const ok = (msg: string): FormResult => ({ ok: true, msg, at: Date.now() });
const HHMM = /^\d{2}:\d{2}$/;

export async function salvarLoja(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const nome = String(f.get('nome') ?? '').trim();
  const telRaw = String(f.get('telefoneDona') ?? '').trim();
  const fieldErrors: Record<string, string> = {};
  if (!nome) fieldErrors.nome = 'Informe o nome da loja.';
  const tel = telRaw ? normalizePhone(telRaw) : null;
  if (telRaw && !tel) fieldErrors.telefoneDona = 'Telefone inválido. Use DDD + número.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  await withSession(user, (tx) => updateLoja(tx, user.lojaId, { nome, telefoneDona: tel }));
  revalidatePath('/', 'layout');
  return ok('Loja salva');
}

export async function salvarEnvio(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const schema = z.object({
    horaLembrete: z.string().regex(HHMM),
    envioInicio: z.string().regex(HHMM),
    envioFim: z.string().regex(HHMM),
    tetoDiario: z.coerce.number().int().min(0).max(1000),
    intervaloMinS: z.coerce.number().int().min(0).max(600),
    intervaloMaxS: z.coerce.number().int().min(0).max(1800),
  });
  const p = schema.safeParse(Object.fromEntries(f));
  const fundo = parseBRL(String(f.get('fundoTroco') ?? '0') || '0');
  const fieldErrors: Record<string, string> = {};
  if (!p.success) for (const i of p.error.issues) fieldErrors[String(i.path[0])] = 'Valor inválido.';
  if (fundo === null) fieldErrors.fundoTroco = 'Digite um valor como 80,00';
  if (p.success && p.data.intervaloMaxS < p.data.intervaloMinS) fieldErrors.intervaloMaxS = 'Precisa ser maior ou igual ao mínimo.';
  if (p.success && p.data.envioFim <= p.data.envioInicio) fieldErrors.envioFim = 'O fim precisa ser depois do início.';
  if (Object.keys(fieldErrors).length || !p.success) return { fieldErrors };
  await withSession(user, (tx) => updateConfig(tx, user.lojaId, { ...p.data, fundoTrocoCentavos: fundo! }));
  return ok('Configurações salvas');
}

export async function salvarHorarios(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const horarios: { diaSemana: number; abre: string; fecha: string }[] = [];
  for (let d = 0; d < 7; d++) {
    if (f.get(`aberto-${d}`) !== 'on') continue;
    const abre = String(f.get(`abre-${d}`)), fecha = String(f.get(`fecha-${d}`));
    if (!HHMM.test(abre) || !HHMM.test(fecha) || fecha <= abre) return { fieldErrors: { [`dia-${d}`]: 'Horário inválido.' } };
    horarios.push({ diaSemana: d, abre, fecha });
  }
  await withSession(user, (tx) => setHorarios(tx, user.lojaId, horarios));
  return ok('Horários salvos');
}

export async function salvarProfissional(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const nome = String(f.get('nome') ?? '').trim();
  const funcao = f.get('funcao') === 'tosa' ? 'tosa' : 'banho';
  const id = String(f.get('id') ?? '') || undefined;
  if (!nome) return { fieldErrors: { nome: 'Informe o nome.' } };
  await withSession(user, (tx) => upsertProfissional(tx, user.lojaId, { id, nome, funcao, ativo: f.get('ativo') !== 'off' }));
  revalidatePath('/configuracoes/profissionais');
  return ok(id ? 'Profissional salvo' : 'Profissional adicionado');
}

export async function salvarServico(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const fieldErrors: Record<string, string> = {};
  const nome = String(f.get('nome') ?? '').trim();
  if (!nome) fieldErrors.nome = 'Informe o nome do serviço.';
  const ciclo = Number(f.get('ciclo'));
  if (!Number.isInteger(ciclo) || ciclo < 1) fieldErrors.ciclo = 'Informe o ciclo em dias.';
  const incluiBanho = f.get('incluiBanho') === 'on';
  const incluiTosa = f.get('incluiTosa') === 'on';
  if (!incluiBanho && !incluiTosa) fieldErrors.inclui = 'Marque banho, tosa ou os dois.';
  const precos = {} as Record<Porte, { precoCentavos: number; duracaoMin: number }>;
  for (const p of PORTES) {
    const preco = parseBRL(String(f.get(`preco-${p}`) ?? ''));
    const dur = Number(f.get(`duracao-${p}`));
    if (preco === null) fieldErrors[`preco-${p}`] = `Preço ${PORTE_LABEL[p]} inválido.`;
    if (!Number.isInteger(dur) || dur < 5) fieldErrors[`duracao-${p}`] = 'Duração em minutos.';
    precos[p] = { precoCentavos: preco ?? 0, duracaoMin: dur };
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const id = String(f.get('id') ?? '') || undefined;
  const res = await withSession(user, (tx) =>
    upsertServico(tx, user.lojaId, { id, nome, incluiBanho, incluiTosa, cicloPadraoDias: ciclo, ativo: f.get('ativo') === 'on', precos }),
  );
  revalidatePath('/configuracoes/servicos');
  if (!id) redirect(`/configuracoes/servicos/${res.id}?salvo=1`);
  return ok('Serviço salvo');
}

async function supabaseAdmin() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

/** A dona cria um usuário já com senha (sem e-mail). Em modo dev a senha de login continua "dev". */
export async function criarUsuario(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const nome = String(f.get('nome') ?? '').trim();
  const usuario = normalizarUsuario(String(f.get('usuario') ?? ''));
  const senha = String(f.get('senha') ?? '');
  const papel = f.get('papel') === 'dona' ? 'dona' : 'recepcao';
  const fieldErrors: Record<string, string> = {};
  if (!nome) fieldErrors.nome = 'Informe o nome.';
  if (!USUARIO_RE.test(usuario)) fieldErrors.usuario = ERRO_USUARIO;
  if (senha.length < SENHA_MIN) fieldErrors.senha = `Mínimo de ${SENHA_MIN} caracteres.`;
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  // Único no sistema inteiro (a RLS só mostraria a própria loja): checa pela conexão de serviço.
  const [existe] = await serviceDb()`select 1 from perfis where lower(usuario) = ${usuario}`;
  if (existe) return { fieldErrors: { usuario: 'Esse usuário já existe.' } };
  let userId: string;
  if (process.env.AUTH_MODE === 'supabase') {
    const { data, error } = await (await supabaseAdmin()).auth.admin.createUser({ email: emailInterno(usuario), password: senha, email_confirm: true });
    if (error || !data.user) return { error: 'Não foi possível criar o usuário. Tente outro nome de usuário.' };
    userId = data.user.id;
  } else {
    const [u] = await serviceDb()`insert into auth.users (id, email) values (gen_random_uuid(), ${emailInterno(usuario)}) returning id`;
    userId = u.id;
  }
  await withSession(user, (tx) => tx`insert into perfis (user_id, loja_id, nome, papel, usuario) values (${userId}, ${user.lojaId}, ${nome}, ${papel}, ${usuario})`);
  revalidatePath('/configuracoes/usuarios');
  return ok('Usuário criado');
}

/** A dona troca a senha de alguém da loja (quem esqueceu a senha). */
export async function redefinirSenha(_: FormResult, f: FormData): Promise<FormResult> {
  const user = await requireDona();
  const userId = String(f.get('userId') ?? '');
  const senha = String(f.get('senha') ?? '');
  if (senha.length < SENHA_MIN) return { fieldErrors: { senha: `Mínimo de ${SENHA_MIN} caracteres.` } };
  const alvo = await withSession(user, (tx) => perfilDaLoja(tx, userId));
  if (!alvo) return { error: 'Usuário não encontrado.' };
  if (process.env.AUTH_MODE === 'supabase') {
    const { error } = await (await supabaseAdmin()).auth.admin.updateUserById(alvo.id, { password: senha });
    if (error) return { error: 'Não foi possível redefinir a senha.' };
  }
  return ok('Senha redefinida');
}
