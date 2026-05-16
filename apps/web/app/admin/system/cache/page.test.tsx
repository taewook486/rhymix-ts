// @vitest-environment jsdom
/**
 * 캐시 관리 페이지 기본 렌더 테스트 — SPEC-ADMIN-001 Slice F.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Server Action 은 테스트 환경에서 mock
vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn(),
}));

describe('AdminCachePage (Slice F)', () => {
  it('F-UI-2: 캐시 관리 버튼들을 렌더한다', async () => {
    const { default: AdminCachePage } = await import('./page');
    // Server Component 는 동기 컴포넌트로 바로 렌더
    const { getByText } = render(React.createElement(AdminCachePage));

    expect(getByText('캐시 관리')).toBeTruthy();
    expect(getByText('전체 캐시 비우기')).toBeTruthy();
    expect(getByText('모듈 캐시')).toBeTruthy();
    expect(getByText('메뉴 캐시')).toBeTruthy();
    expect(getByText('위젯 캐시')).toBeTruthy();
    expect(getByText('도메인 캐시')).toBeTruthy();
  });
});
