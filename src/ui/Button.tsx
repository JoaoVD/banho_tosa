import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'gray' | 'tinted' | 'orange' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  busy?: boolean;
  busyLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', block, busy, busyLabel, className, children, disabled, ...rest },
  ref,
) {
  const cls = ['btn', variant !== 'primary' && variant, size !== 'md' && size, block && 'block', className].filter(Boolean).join(' ');
  return (
    <button ref={ref} className={cls} aria-busy={busy || undefined} disabled={disabled || busy} {...rest}>
      {busy ? (
        <>
          <span className="spin" aria-hidden="true" />
          {busyLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
});
