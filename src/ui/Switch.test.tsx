// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { Switch } from './Switch';

function Harness() {
  const [on, setOn] = useState(true);
  return <Switch checked={on} onChange={setOn} label="Mensagem no WhatsApp" />;
}

test('é uma chave acessível que alterna', async () => {
  render(<Harness />);
  const sw = screen.getByRole('switch', { name: 'Mensagem no WhatsApp' });
  expect(sw).toBeChecked();
  await userEvent.click(sw);
  expect(sw).not.toBeChecked();
});
