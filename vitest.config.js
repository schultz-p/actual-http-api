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
      exclude: ['src/config/swagger.js', 'src/config/constants.js', 'node_modules/**'],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});
