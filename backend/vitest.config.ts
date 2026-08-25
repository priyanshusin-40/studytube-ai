import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      GEMINI_API_KEY: 'test-key',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      CLIENT_URL: 'http://localhost:5173',
    },
  },
});
