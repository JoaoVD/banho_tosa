/** Usuário de login: 3 a 30 caracteres, minúsculas sem acento, números, ponto, hífen ou sublinhado. */
export const USUARIO_RE = /^[a-z0-9._-]{3,30}$/;
export const ERRO_USUARIO = 'Use de 3 a 30 letras sem acento, números, ponto, hífen ou sublinhado.';
export const SENHA_MIN = 8;

export const normalizarUsuario = (u: string) => u.trim().toLowerCase();

/** E-mail interno da conta no Supabase (ninguém vê nem usa). */
export const emailInterno = (usuario: string) => `${usuario}@usuarios.banhotosa.local`;
