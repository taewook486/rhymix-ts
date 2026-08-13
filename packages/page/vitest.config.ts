import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    // sanitizePageBody 가 isomorphic-dompurify 를 지연 로드한다. environment: 'node' 에서는
    // 이 로드가 끝나지 않아(60초에도 타임아웃) packages/document 와 동일하게 jsdom 을 쓴다.
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // WSL2 에서 jsdom 초기화가 느리므로 packages/document 와 같은 여유를 준다.
    testTimeout: 60000,
  },
});
