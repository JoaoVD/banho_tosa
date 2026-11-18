'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Chip } from '@/ui/bits';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { avisarRenovacaoAction } from './actions';

export function AvisarRenovacao({ pacoteClienteId, avisado }: { pacoteClienteId: string; avisado: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  if (avisado) return <Chip tone="green" icon="check">Avisado</Chip>;
  return (
    <Button variant="tinted" size="sm" busy={pending} busyLabel="Enviando" onClick={() => start(async () => {
      const r = await avisarRenovacaoAction(pacoteClienteId);
      toast(r.msg);
      router.refresh();
    })}>Avisar no WhatsApp</Button>
  );
}
