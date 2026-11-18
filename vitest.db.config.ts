import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/db/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      DATABASE_URL: 'postgres://postgres@localhost:54329/postgres',
      ...loadEnv(mode, process.cwd(), ''),
    },
  },
}));
