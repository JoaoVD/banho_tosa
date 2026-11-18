import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

/** Rótulo visível + controle + ajuda + erro embaixo do campo, ligados por aria. */
export function Field({ label, help, error, children, id: idProp }: { label: string; help?: ReactNode; error?: string | null; children: ReactElement; id?: string }) {
  const auto = useId();
  const id = idProp ?? auto;
  const helpId = help ? `${id}-help` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [errId, helpId].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })
    : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {error && <span className="err" id={errId}>{error}</span>}
      {help && <span className="help" id={helpId}>{help}</span>}
    </div>
  );
}
