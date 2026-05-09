'use client';

/**
 * DB 접속 정보 입력 폼 — REQ-INSTALL-013 클라이언트 진입점.
 */
import Link from 'next/link';
import { useActionState } from 'react';

import { initialActionState, type ActionState } from '@/lib/install/action-state';
import { validateDbConfig } from '../actions';

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  errors?: Record<string, string>;
}

function Field({ name, label, type = 'text', defaultValue, required, errors }: FieldProps) {
  const err = errors?.[name];
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={err ? 'true' : 'false'}
        className="rounded-md border px-3 py-2 text-sm"
      />
      {err ? (
        <span className="text-xs text-red-600" role="alert">
          {err}
        </span>
      ) : null}
    </label>
  );
}

export function DbConfigForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    validateDbConfig,
    initialActionState,
  );
  const fieldErrors = state.ok === false ? state.fieldErrors : undefined;
  const formError = state.ok === false ? state.formError : undefined;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="host" label="호스트" defaultValue="localhost" required errors={fieldErrors} />
        <Field
          name="port"
          label="포트"
          type="number"
          defaultValue="5432"
          required
          errors={fieldErrors}
        />
        <Field name="user" label="사용자" required errors={fieldErrors} />
        <Field name="pass" label="비밀번호" type="password" required errors={fieldErrors} />
        <Field name="database" label="데이터베이스" required errors={fieldErrors} />
        <Field name="schema" label="스키마" defaultValue="public" required errors={fieldErrors} />
      </div>

      {formError ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <Link
          href="/install/check-env"
          className="rounded-md border px-4 py-2 text-sm hover:bg-black/5"
        >
          이전
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[rgb(var(--color-primary))] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? '검증 중…' : '검증 후 다음'}
        </button>
      </div>
    </form>
  );
}
