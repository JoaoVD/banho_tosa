'use client';
import { useState } from 'react';
import { ActionForm, type FormResult } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { useToast } from '@/ui/Toast';
import { redefinirSenha } from '../actions';

export function RedefinirSenha({ userId, nome }: { userId: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const toast = useToast();
  const titulo = `Redefinir senha de ${nome}`;
  return (
    <>
      <Button variant="gray" size="sm" onClick={() => setAberto(true)} aria-label={titulo}>Redefinir senha</Button>
      <Sheet open={aberto} onClose={() => setAberto(false)} title={titulo} subtitle="Passe a nova senha para a pessoa. Ela entra com ela na próxima vez.">
        <ActionForm
          action={async (prev: FormResult, fd: FormData) => {
            const r = await redefinirSenha(prev, fd);
            if (!r.ok) return r;
            // O aviso sai daqui: a janela fecha antes de o formulário conseguir mostrá-lo.
            toast(r.msg ?? 'Senha redefinida');
            setAberto(false);
            return {};
          }}
        >
          {(s, pending) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="hidden" name="userId" value={userId} />
              <Field label="Nova senha" error={s.fieldErrors?.senha}><input className="input" name="senha" type="password" autoComplete="new-password" /></Field>
              <Button size="lg" busy={pending} busyLabel="Salvando">Redefinir senha</Button>
            </div>
          )}
        </ActionForm>
      </Sheet>
    </>
  );
}
