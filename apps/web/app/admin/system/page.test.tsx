// @vitest-environment jsdom
/**
 * 시스템 헬스 페이지 기본 렌더 테스트 — SPEC-ADMIN-001 Slice F.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      system: {
        health: vi.fn().mockResolvedValue({
          node: { version: 'v22.0.0', platform: 'linux' },
          db: { connected: true, latencyMs: 5 },
          env: [
            { key: 'NODE_ENV', value: 'test' },
            { key: 'DB_PASSWORD', value: '***' },
          ],
        }),
      },
    },
  }),
}));

describe('AdminSystemPage (Slice F)', () => {
  it('F-UI-1: 시스템 헬스 정보를 렌더한다', async () => {
    const { default: AdminSystemPage } = await import('./page');
    const result = await AdminSystemPage();

    const { getByText } = render(result as React.ReactElement);

    expect(getByText('시스템 헬스')).toBeTruthy();
    expect(getByText('v22.0.0')).toBeTruthy();
    expect(getByText('linux')).toBeTruthy();
    expect(getByText('✓ 연결됨')).toBeTruthy();
    expect(getByText('NODE_ENV')).toBeTruthy();
  });
});
