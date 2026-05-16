// @vitest-environment jsdom
/**
 * TRPCProvider smoke test — SPEC-ADMIN-001 Slice E-1.
 *
 * TRPCProvider 가 children 을 렌더하는지 확인.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// @trpc/react-query mock
vi.mock('@trpc/react-query', () => ({
  createTRPCReact: () => ({
    createClient: vi.fn(() => ({})),
    Provider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }),
}));

// @trpc/client mock
vi.mock('@trpc/client', () => ({
  httpBatchLink: vi.fn(() => ({})),
}));

// @tanstack/react-query mock
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// superjson mock
vi.mock('superjson', () => ({
  default: {},
}));

describe('TRPCProvider (Slice E-1)', () => {
  it('E-1-1: children 을 렌더한다 (smoke test)', async () => {
    // 동적 import 로 mock 이 적용된 후 로드
    const { TRPCProvider } = await import('./TRPCProvider');

    const { getByTestId } = render(
      React.createElement(
        TRPCProvider,
        null,
        React.createElement('div', { 'data-testid': 'child' }, 'Hello'),
      ),
    );

    expect(getByTestId('child')).toBeTruthy();
    expect(getByTestId('child').textContent).toBe('Hello');
  });
});
