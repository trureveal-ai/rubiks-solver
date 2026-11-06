import { defineConfig } from 'vitest/config';

// Tests here cover pure logic (reducers, validation, step categorization), so the
// lightweight Node environment is all we need — no jsdom.
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('test'),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
});
