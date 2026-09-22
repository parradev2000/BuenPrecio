import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/db-url.js';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret-not-for-prod',
      PORT: '3100',
    },
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
  },
});