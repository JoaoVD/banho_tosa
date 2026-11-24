/**
 * Usuário de login: 3 a 30 caracteres, minúsculas sem acento, números, ponto, hífen ou sublinhado.
 * Sem ponto no começo, no fim ou repetido: vira o e-mail interno da conta, e o Supabase recusaria.
 */
export const USUARIO_RE = /^(?!.*\.\.)[a-z0-9_-][a-z0-9._-]{1,28}[a-z0-9_-]$/;
export const ERRO_USUARIO = 'Use de 3 a 30 letras sem acento, números, ponto, hífen ou sublinhado.';
export const SENHA_MIN = 8;

export const normalizarUsuario = (u: string) => u.trim().toLowerCase();

/** E-mail interno da conta no Supabase (ninguém vê nem usa). */
export const emailInterno = (usuario: string) => `${usuario}@usuarios.banhotosa.local`;
