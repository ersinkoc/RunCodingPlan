import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts', 'src/constants.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 95,
        statements: 100,
      },
    },
  },
});
