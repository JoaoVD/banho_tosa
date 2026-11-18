'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/ui/icons';
import { ReceberSheet } from '../_components/ReceberSheet';
import s from './pets.module.css';

export function ReceberAtalho({ agendamentoId }: { agendamentoId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" className={s.qbtn} onClick={() => setAberto(true)}><Icon name="wallet" size="lg" />Receber</button>
      {aberto && <ReceberSheet agendamentoId={agendamentoId} onClose={() => setAberto(false)} onDone={() => router.refresh()} />}
    </>
  );
}
