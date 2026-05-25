'use client';

/**
 * 라이선스 동의 폼 — REQ-INSTALL-011 클라이언트 진입점.
 *
 * `useActionState`로 server action `agreeLicense`의 결과를 폼에 연결하며,
 * 제출 중에는 버튼을 비활성화합니다.
 */
import { useActionState } from 'react';

import { agreeLicense } from './actions';
import { initialActionState, type ActionState } from '@/lib/install/action-state';

export function LicenseForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    agreeLicense,
    initialActionState,
  );
  const fieldError = state.ok === false ? state.fieldErrors?.accepted : undefined;
  const formError = state.ok === false ? state.formError : undefined;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      {formError ? (
        <p className="text-sm text-red-600" role="alert">{formError}</p>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="accepted"
          value="true"
          required
          aria-invalid={fieldError ? 'true' : 'false'}
          aria-describedby={fieldError ? 'accepted-error' : undefined}
        />
        <span>사용권에 동의합니다.</span>
      </label>
      {fieldError ? (
        <p id="accepted-error" className="text-sm text-red-600" role="alert">
          {fieldError}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[rgb(var(--color-primary))] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? '진행 중…' : '다음'}
        </button>
      </div>
    </form>
  );
}
