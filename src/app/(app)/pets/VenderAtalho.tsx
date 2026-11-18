'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/ui/icons';
import { VenderPacoteSheet } from '../_components/VenderPacoteSheet';
import s from './pets.module.css';

export function VenderAtalho({ tutorId, tutorNome }: { tutorId: string; tutorNome: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" className={s.qbtn} onClick={() => setAberto(true)}><Icon name="gift" size="lg" />Vender pacote</button>
      {aberto && <VenderPacoteSheet tutorId={tutorId} tutorNome={tutorNome} onClose={() => setAberto(false)} onDone={() => router.refresh()} />}
    </>
  );
}
