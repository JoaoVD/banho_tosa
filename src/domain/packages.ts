import type { PacoteCliente, Porte } from './types';

export const isExpired = (p: PacoteCliente, hoje: string): boolean => p.validoAte < hoje;

/** Pacote do tutor que cobre este serviço/porte, vencendo primeiro. */
export function usablePackage(pacotes: PacoteCliente[], ctx: { servicoId: string; porte: Porte; hoje: string }): PacoteCliente | null {
  return (
    pacotes
      .filter((p) => p.saldo > 0 && !isExpired(p, ctx.hoje) && p.servicoId === ctx.servicoId && (!p.porte || p.porte === ctx.porte))
      .sort((a, b) => a.validoAte.localeCompare(b.validoAte))[0] ?? null
  );
}
