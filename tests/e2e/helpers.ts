import { expect, type Page } from '@playwright/test';

export async function entrar(page: Page, email = 'recepcao@exemplo.dev') {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('dev');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}

import AxeBuilder from '@axe-core/playwright';

/** Ids das violações sérias ou críticas de acessibilidade na página atual. */
export async function violacoesGraves(page: Page): Promise<string[]> {
  // @axe-core/playwright tipa contra outra versão do Playwright; a API usada é a mesma.
  const res = await new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0]).analyze();
  return res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
}
