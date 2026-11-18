'use client';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { convidarUsuario } from '../actions';

export function ConvidarForm() {
  return (
    <ActionForm action={convidarUsuario} className="card pad">
      {(s, pending) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, alignItems: 'end' }}>
          <Field label="Nome" error={s.fieldErrors?.nome}><input className="input" name="nome" /></Field>
          <Field label="E-mail" error={s.fieldErrors?.email}><input className="input" type="email" name="email" /></Field>
          <Field label="Acesso">
            <select className="input" name="papel" defaultValue="recepcao"><option value="recepcao">Recepção</option><option value="dona">Dona (administração)</option></select>
          </Field>
          <Button busy={pending} busyLabel="Convidando">Convidar</Button>
        </div>
      )}
    </ActionForm>
  );
}
