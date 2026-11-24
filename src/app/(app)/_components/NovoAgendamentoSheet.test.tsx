// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ToastProvider } from '@/ui/Toast';

vi.mock('../agenda/actions', () => ({
  agendar: vi.fn(),
  buscarHorarios: vi.fn(() => Promise.reject(new Error('rede caiu'))),
}));

test('se a busca de horários falhar, o botão Agendar não fica travado', async () => {
  const { NovoAgendamentoSheet } = await import('./NovoAgendamentoSheet');
  render(
    <ToastProvider>
      <NovoAgendamentoSheet open onClose={() => {}} pets={[{ id: 'p1', label: 'Nina, Rafael' }]} servicos={[{ id: 's1', nome: 'Banho' }]} dia="2026-11-20" />
    </ToastProvider>,
  );
  await userEvent.selectOptions(screen.getByLabelText('Pet'), 'p1');
  await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Agendar' })).toBeEnabled());
});
