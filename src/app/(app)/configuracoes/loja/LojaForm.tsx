'use client';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { salvarLoja } from '../actions';

export function LojaForm({ nome, telefone }: { nome: string; telefone: string }) {
  return (
    <ActionForm action={salvarLoja} className="card pad">
      {(s, pending) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Nome da loja" error={s.fieldErrors?.nome}><input className="input" name="nome" defaultValue={nome} /></Field>
          <Field label="WhatsApp da dona" error={s.fieldErrors?.telefoneDona} help="Recebe o resumo do caixa no fim do dia."><input className="input" name="telefoneDona" inputMode="tel" defaultValue={telefone} /></Field>
          <Button size="lg" busy={pending} busyLabel="Salvando">Salvar</Button>
        </div>
      )}
    </ActionForm>
  );
}
