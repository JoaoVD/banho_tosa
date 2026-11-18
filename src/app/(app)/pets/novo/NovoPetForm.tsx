'use client';
import { PORTES, PORTE_LABEL } from '@/domain/types';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { cadastrarPet } from '../actions';

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 } as const;

export function NovoPetForm() {
  return (
    <ActionForm action={cadastrarPet}>
      {(s, pending) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p className="glabel" style={{ marginBottom: -8 }}>Tutor</p>
          <div className="card pad" style={grid}>
            <Field label="Nome do tutor" error={s.fieldErrors?.tutorNome}><input className="input" name="tutorNome" autoComplete="off" /></Field>
            <Field label="WhatsApp do tutor" error={s.fieldErrors?.telefone} help="Se o telefone já existir, o pet entra no mesmo tutor."><input className="input" name="telefone" inputMode="tel" placeholder="(11) 98765-4321" /></Field>
          </div>
          <p className="glabel" style={{ marginBottom: -8 }}>Pet</p>
          <div className="card pad" style={grid}>
            <Field label="Nome do pet" error={s.fieldErrors?.petNome}><input className="input" name="petNome" autoComplete="off" /></Field>
            <Field label="Espécie"><select className="input" name="especie" defaultValue="cao"><option value="cao">Cão</option><option value="gato">Gato</option></select></Field>
            <Field label="Raça"><input className="input" name="raca" /></Field>
            <Field label="Porte" error={s.fieldErrors?.porte}>
              <select className="input" name="porte" defaultValue=""><option value="" disabled>Escolha o porte</option>{PORTES.map((p) => <option key={p} value={p}>{PORTE_LABEL[p]}</option>)}</select>
            </Field>
            <Field label="Nascimento (aproximado)"><input className="input" type="date" name="nascimento" /></Field>
            <Field label="Cuidados" help="Separe por vírgula. Ex.: sensível nas orelhas, medroso"><input className="input" name="cuidados" /></Field>
          </div>
          <Button size="lg" busy={pending} busyLabel="Cadastrando">Cadastrar</Button>
        </div>
      )}
    </ActionForm>
  );
}
