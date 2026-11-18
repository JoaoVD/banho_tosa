'use client';
import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useToast } from './Toast';

export type FormResult = { ok?: boolean; msg?: string; error?: string; fieldErrors?: Record<string, string>; at?: number };
export type FormAction = (prev: FormResult, data: FormData) => Promise<FormResult>;

/** Formulário ligado a uma server action: mostra aviso no sucesso e erros embaixo dos campos. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: FormAction;
  children: (state: FormResult, pending: boolean) => ReactNode;
  className?: string;
}) {
  const [state, run, pending] = useActionState<FormResult, FormData>(action, {});
  const toast = useToast();
  const last = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (state.ok && state.msg && state.at !== last.current) {
      last.current = state.at;
      toast(state.msg);
    }
  }, [state, toast]);
  return (
    <form action={run} className={className} noValidate>
      {children(state, pending)}
      {state.error && <p className="err" role="alert">{state.error}</p>}
    </form>
  );
}
