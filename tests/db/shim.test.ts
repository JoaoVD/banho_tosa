import { randomUUID } from 'node:crypto';
import { afterAll, expect, test } from 'vitest';
import { asUser, sql } from './helpers';

afterAll(() => sql.end());

test('auth.uid() returns the claim sub inside asUser', async () => {
  const id = randomUUID();
  const rows = await asUser(id, (tx) => tx`select auth.uid() as u`);
  expect(rows[0].u).toBe(id);
});

test('asUser runs as the authenticated role', async () => {
  const rows = await asUser(randomUUID(), (tx) => tx`select current_user as r`);
  expect(rows[0].r).toBe('authenticated');
});
