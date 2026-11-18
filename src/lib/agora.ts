/**
 * Relógio do servidor. Em desenvolvimento/teste, APP_NOW fixa a hora (ex.: e2e).
 * Em produção, APP_NOW é ignorado.
 */
export function agora(): Date {
  const fixo = process.env.APP_NOW;
  if (fixo && process.env.NODE_ENV !== 'production') return new Date(fixo);
  return new Date();
}
