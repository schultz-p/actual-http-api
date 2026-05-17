import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'vmThreads',
    setupFiles: ['./vitest.setup.js'],
    include: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/config/swagger.js', 'node_modules/**'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
