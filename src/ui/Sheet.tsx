'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Icon } from './icons';

/** Janela central no estilo iOS. Prende o foco, fecha com Esc e devolve o foco a quem abriu. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  leading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  children: ReactNode;
}) {
  // Sem Dialog.Trigger, o Radix não sabe para onde devolver o foco: guardamos quem abriu.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim" />
        <Dialog.Content
          className="sheet"
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
        >
          <div className="sh-head">
            {leading}
            <div>
              <Dialog.Title className="title3">{title}</Dialog.Title>
              {subtitle && <div className="cap">{subtitle}</div>}
            </div>
            <Dialog.Close className="close" aria-label="Fechar">
              <Icon name="x" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
