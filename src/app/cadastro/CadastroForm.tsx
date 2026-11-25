'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { cadastrarAction, type CadastroState } from './actions';
import s from '../entrar/entrar.module.css';

const CAMPOS = [
  { name: 'loja', label: 'Nome do pet shop', autoComplete: 'organization', placeholder: 'Ex.: Pet Spa Bela Vista' },
  { name: 'nome', label: 'Seu nome', autoComplete: 'name' },
  { name: 'usuario', label: 'Usuário', autoComplete: 'username', placeholder: 'Para entrar no sistema', usuario: true },
  { name: 'email', label: 'E-mail', autoComplete: 'email', type: 'email' },
  { name: 'senha', label: 'Senha', autoComplete: 'new-password', type: 'password', placeholder: 'Mínimo de 8 caracteres' },
] as const;

export function CadastroForm() {
  const [state, action, pending] = useActionState<CadastroState, FormData>(cadastrarAction, {});
  return (
    <form action={action} className={s.form} noValidate>
      {CAMPOS.map((c) => {
        const erro = state.fieldErrors?.[c.name];
        return (
          <div className={s.field} key={c.name}>
            <label htmlFor={c.name}>{c.label}</label>
            <input
              id={c.name} name={c.name} type={'type' in c ? c.type : 'text'} autoComplete={c.autoComplete}
              placeholder={'placeholder' in c ? c.placeholder : undefined}
              {...('usuario' in c ? { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } : {})}
              aria-invalid={erro ? true : undefined} aria-describedby={erro ? `${c.name}-erro` : undefined}
            />
            {erro && <span id={`${c.name}-erro`} className={s.fieldError}>{erro}</span>}
          </div>
        );
      })}
      {/* Armadilha para robôs: invisível para pessoas e leitores de tela. */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" className={s.hp} />
      {state.error && <p className={s.error} role="alert">{state.error}</p>}
      <button className={s.button} disabled={pending} aria-busy={pending}>{pending ? 'Criando…' : 'Criar conta'}</button>
      <p className={s.alt}>Já tem conta? <Link href="/entrar">Entrar</Link></p>
    </form>
  );
}
