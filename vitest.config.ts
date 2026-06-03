// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/routes/funnels.ts', 'src/routes/attribution.ts', 'src/routes/cohorts.ts'],
    },
    testTimeout: 10000,
  },
});
