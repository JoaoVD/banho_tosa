import { execSync } from 'node:child_process';

/** Banco local no ar e dados de exemplo frescos antes de cada rodada de e2e. */
export default function globalSetup() {
  execSync('bash scripts/db-local.sh up', { stdio: 'ignore' });
  execSync('npx tsx scripts/seed.ts', { stdio: 'ignore', env: { ...process.env, SEED_DIA: '2026-11-18' } });
}
