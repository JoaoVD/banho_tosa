// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { Sheet } from './Sheet';

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Sheet open={open} onClose={() => { onClose?.(); setOpen(false); }} title="Receber de Ana">
        <input aria-label="Primeiro" />
        <button>Último</button>
      </Sheet>
    </>
  );
}

test('Esc fecha a janela e o foco volta para quem abriu', async () => {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<Harness onClose={onClose} />);
  const opener = screen.getByRole('button', { name: 'Abrir' });
  await user.click(opener);
  expect(screen.getByRole('dialog', { name: 'Receber de Ana' })).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledOnce();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test('Tab fica preso dentro da janela', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Abrir' }));
  const dialog = screen.getByRole('dialog');
  for (let i = 0; i < 6; i++) {
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
  }
});
