import { expect, test } from '@playwright/test';
import { entrar } from '../helpers';

test('folha de agendar sobe de baixo, em largura total', async ({ page }) => {
  await entrar(page);
  await page.goto('/agenda?novo=1');
  const folha = page.getByRole('dialog');
  await expect(folha).toBeVisible();
  await page.waitForTimeout(600); // fim da animação de subida
  const box = (await folha.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x).toBe(0);
  expect(box.width).toBe(vp.width);
  expect(Math.abs(box.y + box.height - vp.height)).toBeLessThanOrEqual(1);
  const agendar = folha.getByRole('button', { name: /^Agendar/ });
  await agendar.scrollIntoViewIfNeeded();
  await expect(agendar).toBeInViewport();
});

test('folha fica por cima da barra de abas', async ({ page }) => {
  await entrar(page);
  await page.goto('/agenda?novo=1');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(600);
  // Com a folha aberta, a barra fica escondida dos leitores de tela; o toque no centro da aba Agenda cai na folha.
  const hoje = (await page.locator('.tabbar a[href="/agenda"]').boundingBox())!;
  const alvo = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[role="dialog"]') !== null, [hoje.x + hoje.width / 2, hoje.y + hoje.height / 2]);
  const quem = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.outerHTML.slice(0, 160) : 'nada'; }, [hoje.x + hoje.width / 2, hoje.y + hoje.height / 2]);
  expect(alvo, quem + JSON.stringify(hoje)).toBe(true);
});

test('campos com 16 px (sem zoom do iPhone)', async ({ page }) => {
  await entrar(page);
  await page.goto('/agenda?novo=1');
  const campo = page.getByRole('dialog').locator('input, select').first();
  await expect(campo).toBeVisible();
  expect(await campo.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
});
