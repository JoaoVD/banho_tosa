import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/*.test.ts'],
    exclude: ['tests/db/**', 'tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    setupFiles: ['./tests/setup-unit.ts'],
  },
});
