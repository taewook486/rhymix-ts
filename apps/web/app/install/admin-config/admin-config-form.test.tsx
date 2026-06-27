// @vitest-environment jsdom
/**
 * AdminConfigForm — SiteLock 확인 모달 테스트 (REQ-INSTALL-041).
 *
 * SiteLock 체크박스를 체크하면 위험 안내 모달이 표시되고,
 * "이해했습니다"를 클릭해야 체크박스가 실제로 활성화된다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    useActionState: vi.fn(),
  };
});

vi.mock('../actions', () => ({
  performInstall: vi.fn(),
}));

describe('AdminConfigForm — SiteLock 확인 모달 (REQ-INSTALL-041)', () => {
  beforeEach(async () => {
    cleanup(); // resetModules 전에 DOM 정리 — 모듈 교체 후 afterEach cleanup이 이전 트리를 놓치는 문제 방지
    vi.resetModules();
    vi.clearAllMocks();
    const { useActionState } = await import('react');
    (useActionState as ReturnType<typeof vi.fn>).mockReturnValue([
      { ok: true },
      vi.fn(),
      false,
    ]);
  });

  afterEach(cleanup);

  it('SM-1: SiteLock 체크박스 클릭 시 확인 모달이 표시된다', async () => {
    const { AdminConfigForm } = await import('./admin-config-form');
    render(React.createElement(AdminConfigForm, { timeZones: ['UTC'], defaultTimeZone: 'UTC' }));

    const checkbox = screen.getByRole('checkbox', { name: /SiteLock 사용/ });
    fireEvent.click(checkbox);

    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('SM-2: "이해했습니다" 클릭 시 모달이 닫히고 체크박스가 활성화된다', async () => {
    const { AdminConfigForm } = await import('./admin-config-form');
    render(React.createElement(AdminConfigForm, { timeZones: ['UTC'], defaultTimeZone: 'UTC' }));

    const checkbox = screen.getByRole('checkbox', { name: /SiteLock 사용/ });
    fireEvent.click(checkbox);

    const confirmBtn = screen.getByRole('button', { name: /이해했습니다/ });
    fireEvent.click(confirmBtn);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('SM-3: "취소" 클릭 시 모달이 닫히고 체크박스는 비활성화 상태를 유지한다', async () => {
    const { AdminConfigForm } = await import('./admin-config-form');
    render(React.createElement(AdminConfigForm, { timeZones: ['UTC'], defaultTimeZone: 'UTC' }));

    const checkbox = screen.getByRole('checkbox', { name: /SiteLock 사용/ });
    fireEvent.click(checkbox);

    const cancelBtn = screen.getByRole('button', { name: /취소/ });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });
});
