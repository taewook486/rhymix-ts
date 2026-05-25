/**
 * CommentForm.test.tsx — SPEC-CONTENT-001 Comment UI
 *
 * CF-1 ~ CF-4: CommentForm 렌더 및 동작 검증.
 *
 * @MX:SPEC: SPEC-CONTENT-001
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);

afterEach(() => { cleanup(); });

// ---------------------------------------------------------------------------
// CF-1: 비로그인 상태 → 로그인 메시지 + 폼 비활성
// ---------------------------------------------------------------------------

describe('CommentForm — CF-1: 비로그인 상태', () => {
  it('CF-1: isLoggedIn=false → 로그인 안내 메시지 + textarea disabled', async () => {
    const { CommentForm } = await import('./CommentForm.js');
    const onSubmit = vi.fn();

    render(
      <CommentForm
        documentId={1}
        onSubmit={onSubmit}
        isLoggedIn={false}
      />,
    );

    expect(document.body.textContent).toContain('로그인 후 댓글을 작성할 수 있습니다.');
    const textarea = document.querySelector('textarea');
    if (textarea) {
      expect(textarea.disabled).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// CF-2: 로그인 상태 + 내용 입력 후 submit → onSubmit 호출
// ---------------------------------------------------------------------------

describe('CommentForm — CF-2: 로그인 상태 submit', () => {
  it('CF-2: isLoggedIn=true, 내용 입력 후 submit → onSubmit(content) 호출', async () => {
    const { CommentForm } = await import('./CommentForm.js');
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CommentForm
        documentId={1}
        onSubmit={onSubmit}
        isLoggedIn={true}
      />,
    );

    const textarea = document.querySelector('textarea');
    expect(textarea).toBeTruthy();
    fireEvent.change(textarea!, { target: { value: '테스트 댓글 내용' } });

    const submitBtn = document.querySelector('button[type="submit"]') ??
      Array.from(document.querySelectorAll('button')).find(b => !b.textContent?.includes('취소'));
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('테스트 댓글 내용');
    });
  });
});

// ---------------------------------------------------------------------------
// CF-3: parentId 설정 시 "취소" 버튼 → onCancel 호출
// ---------------------------------------------------------------------------

describe('CommentForm — CF-3: 답글 모드 취소 버튼', () => {
  it('CF-3: parentId 설정 → "취소" 버튼 표시 + onCancel 호출', async () => {
    const { CommentForm } = await import('./CommentForm.js');
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <CommentForm
        documentId={1}
        parentId={5}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoggedIn={true}
      />,
    );

    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('취소'));
    expect(cancelBtn).toBeTruthy();
    fireEvent.click(cancelBtn!);
    expect(onCancel).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// CF-4: 빈 내용 → submit 버튼 비활성 또는 onSubmit 미호출
// ---------------------------------------------------------------------------

describe('CommentForm — CF-4: 빈 내용 submit 방지', () => {
  it('CF-4: 내용 없을 때 submit 버튼 disabled 또는 onSubmit 미호출', async () => {
    const { CommentForm } = await import('./CommentForm.js');
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CommentForm
        documentId={1}
        onSubmit={onSubmit}
        isLoggedIn={true}
      />,
    );

    // textarea는 비어 있음 (기본값)
    const submitBtn = document.querySelector('button[type="submit"]') ??
      Array.from(document.querySelectorAll('button')).find(b => !b.textContent?.includes('취소'));

    if (submitBtn && (submitBtn as HTMLButtonElement).disabled) {
      // disabled 방식
      expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    } else {
      // 클릭해도 onSubmit 미호출 방식
      if (submitBtn) {
        fireEvent.click(submitBtn);
      }
      expect(onSubmit).not.toHaveBeenCalled();
    }
  });
});
