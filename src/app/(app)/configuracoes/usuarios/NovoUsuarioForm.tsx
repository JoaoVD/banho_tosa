'use client';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { criarUsuario } from '../actions';

export function NovoUsuarioForm() {
  return (
    <ActionForm action={criarUsuario} className="card pad">
      {(s, pending) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="title3">Novo usuário</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, alignItems: 'start' }}>
            <Field label="Nome" error={s.fieldErrors?.nome}><input className="input" name="nome" autoComplete="off" /></Field>
            <Field label="Usuário" error={s.fieldErrors?.usuario}>
              <input className="input" name="usuario" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="ex.: carla" />
            </Field>
            <Field label="Senha inicial" error={s.fieldErrors?.senha}><input className="input" name="senha" type="password" autoComplete="new-password" /></Field>
            <Field label="Acesso">
              <select className="input" name="papel" defaultValue="recepcao"><option value="recepcao">Recepção</option><option value="dona">Dona (administração)</option></select>
            </Field>
          </div>
          <div><Button busy={pending} busyLabel="Criando">Criar usuário</Button></div>
        </div>
      )}
    </ActionForm>
  );
}
