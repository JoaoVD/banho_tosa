import { ERRO_USUARIO, SENHA_MIN, USUARIO_RE, normalizarUsuario } from './usuario';

export type CamposCadastro = { loja: string; nome: string; usuario: string; email: string; senha: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMINIO_INTERNO = '@usuarios.banhotosa.local';

/** Erros por campo do cadastro (vazio = tudo certo). Espera os campos já sem espaços nas pontas. */
export function validarCadastro(c: CamposCadastro): Record<string, string> {
  const e: Record<string, string> = {};
  if (!c.loja) e.loja = 'Informe o nome do pet shop.';
  else if (c.loja.length > 80) e.loja = 'Use até 80 caracteres.';
  if (!c.nome) e.nome = 'Informe o seu nome.';
  else if (c.nome.length > 60) e.nome = 'Use até 60 caracteres.';
  if (!USUARIO_RE.test(normalizarUsuario(c.usuario))) e.usuario = ERRO_USUARIO;
  // O domínio interno é reservado às contas criadas pela dona (usuário sem e-mail).
  if (!EMAIL_RE.test(c.email) || c.email.length > 254 || c.email.toLowerCase().endsWith(DOMINIO_INTERNO)) e.email = 'E-mail inválido.';
  if (c.senha.length < SENHA_MIN) e.senha = `Mínimo de ${SENHA_MIN} caracteres.`;
  else if (c.senha.length > 72) e.senha = 'Use até 72 caracteres.';
  return e;
}

/** Chave do limite por IP: IPv6 conta pela faixa /64 (trocar o fim do endereço não burla o limite). */
export function faixaDoIp(ip: string): string {
  const v4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4) return v4[1];
  if (!ip.includes(':')) return ip;
  const [cabeca, cauda] = ip.split('::');
  const partes = cabeca.split(':').filter(Boolean);
  const completas = cauda === undefined ? partes : [...partes, ...Array(Math.max(0, 8 - partes.length - cauda.split(':').filter(Boolean).length)).fill('0'), ...cauda.split(':').filter(Boolean)];
  return `${completas.slice(0, 4).map((h) => h.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`;
}
