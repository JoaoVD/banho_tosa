// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

afterEach(() => vi.useRealTimers());

function Trigger({ undo }: { undo?: () => void }) {
  const toast = useToast();
  return <button onClick={() => toast('Pipoca em “Pronto para buscar”', { undo })}>disparar</button>;
}

test('Desfazer chama a função de desfazer', () => {
  const undo = vi.fn();
  render(<ToastProvider><Trigger undo={undo} /></ToastProvider>);
  act(() => screen.getByText('disparar').click());
  act(() => screen.getByRole('button', { name: 'Desfazer' }).click());
  expect(undo).toHaveBeenCalledOnce();
  expect(screen.queryByText('Pipoca em “Pronto para buscar”')).not.toBeInTheDocument();
});

test('o aviso com desfazer some depois de 5 segundos', () => {
  vi.useFakeTimers();
  render(<ToastProvider><Trigger undo={() => {}} /></ToastProvider>);
  act(() => screen.getByText('disparar').click());
  act(() => vi.advanceTimersByTime(4900));
  expect(screen.getByText('Pipoca em “Pronto para buscar”')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText('Pipoca em “Pronto para buscar”')).not.toBeInTheDocument();
});

test('sem desfazer, some depois de 3,2 segundos', () => {
  vi.useFakeTimers();
  render(<ToastProvider><Trigger /></ToastProvider>);
  act(() => screen.getByText('disparar').click());
  act(() => vi.advanceTimersByTime(3300));
  expect(screen.queryByText('Pipoca em “Pronto para buscar”')).not.toBeInTheDocument();
});
