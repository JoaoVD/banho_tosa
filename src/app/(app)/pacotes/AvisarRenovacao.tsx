'use client';
import { Chip } from '@/ui/bits';

/** O envio pelo WhatsApp entra com a fila de mensagens (Tarefa 20). */
export function AvisarRenovacao({ avisado }: { pacoteClienteId: string; avisado: boolean }) {
  if (avisado) return <Chip tone="green" icon="check">Avisado</Chip>;
  return (
    <button type="button" className="btn tinted sm" disabled title="Disponível quando o WhatsApp estiver conectado">
      Avisar no WhatsApp
    </button>
  );
}
