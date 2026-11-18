'use client';
import { useActionState } from 'react';
import { entrarAction, type EntrarState } from './actions';
import s from './entrar.module.css';

export function LoginForm() {
  const [state, action, pending] = useActionState<EntrarState, FormData>(entrarAction, {});
  return (
    <form action={action} className={s.form} noValidate>
      <div className={s.field}>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className={s.field}>
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {state.error && (
        <p className={s.error} role="alert">
          {state.error}
        </p>
      )}
      <button className={s.button} disabled={pending} aria-busy={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
