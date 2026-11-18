'use client';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { salvarProfissional } from '../actions';

export function NovoProfissional() {
  return (
    <ActionForm action={salvarProfissional} className="card pad">
      {(s, pending) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, alignItems: 'end' }}>
          <Field label="Nome" error={s.fieldErrors?.nome}><input className="input" name="nome" /></Field>
          <Field label="Função">
            <select className="input" name="funcao" defaultValue="banho"><option value="banho">Banho</option><option value="tosa">Tosa</option></select>
          </Field>
          <Button busy={pending} busyLabel="Adicionando">Adicionar profissional</Button>
        </div>
      )}
    </ActionForm>
  );
}
