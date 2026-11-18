'use client';
import { useState, useTransition } from 'react';
import { Switch } from '@/ui/Switch';
import { useToast } from '@/ui/Toast';
import { alterarLembretes } from './actions';

export function LembretesSwitch({ tutorId, ativo }: { tutorId: string; ativo: boolean }) {
  const [on, setOn] = useState(ativo);
  const [, start] = useTransition();
  const toast = useToast();
  return (
    <Switch
      label="Lembretes automáticos"
      checked={on}
      onChange={(v) => {
        setOn(v);
        start(async () => {
          await alterarLembretes(tutorId, v);
          toast(v ? 'Lembretes ligados' : 'Lembretes desligados');
        });
      }}
    />
  );
}
