'use client';

/**
 * 관리자 계정 + 사이트 옵션 입력 폼 — REQ-INSTALL-014 클라이언트 진입점.
 *
 * SiteLock 활성 시 인라인 경고를 노출하며, 제출은 `performInstall` server
 * action으로 처리됩니다. 시간대 목록은 서버에서 prop으로 주입.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useActionState } from 'react';

import { initialActionState, type ActionState } from '@/lib/install/action-state';

import { performInstall } from '../actions';

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  errors?: Record<string, string>;
  autoComplete?: string;
}

function Field({
  name,
  label,
  type = 'text',
  defaultValue,
  required,
  errors,
  autoComplete,
}: FieldProps) {
  const err = errors?.[name];
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        autoComplete={autoComplete}
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

interface AdminConfigFormProps {
  timeZones: string[];
  defaultTimeZone: string;
}

export function AdminConfigForm({ timeZones, defaultTimeZone }: AdminConfigFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    performInstall,
    initialActionState,
  );
  const fieldErrors = state.ok === false ? state.fieldErrors : undefined;
  const formError = state.ok === false ? state.formError : undefined;
  const [siteLockConfirmed, setSiteLockConfirmed] = useState(false);
  const [siteLockModalOpen, setSiteLockModalOpen] = useState(false);
  // 비제어(defaultChecked) 라디오는 액션 제출 후 폼이 리셋될 때 기본값(always)으로
  // 되돌아가 로컬 개발 환경에서 강제 HTTPS 리다이렉트 루프를 유발했다 — 제어 컴포넌트로 전환.
  const [useSsl, setUseSsl] = useState<'always' | 'none'>('always');

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="email"
          label="이메일"
          type="email"
          required
          autoComplete="email"
          errors={fieldErrors}
        />
        <Field
          name="userId"
          label="사용자 ID"
          required
          autoComplete="username"
          errors={fieldErrors}
        />
        <Field
          name="password"
          label="비밀번호"
          type="password"
          required
          autoComplete="new-password"
          errors={fieldErrors}
        />
        <Field
          name="password2"
          label="비밀번호 확인"
          type="password"
          required
          autoComplete="new-password"
          errors={fieldErrors}
        />
        <Field name="nickName" label="닉네임" required errors={fieldErrors} />

        <label className="flex flex-col gap-1 text-sm">
          <span>시간대</span>
          <select
            name="timeZone"
            defaultValue={defaultTimeZone}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {timeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-2 flex flex-col gap-2 rounded-md border p-3 text-sm">
        <legend className="px-1 text-xs">SSL 사용</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="useSsl"
            value="always"
            checked={useSsl === 'always'}
            onChange={() => setUseSsl('always')}
          />
          <span>항상 HTTPS 사용 (권장)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="useSsl"
            value="none"
            checked={useSsl === 'none'}
            onChange={() => setUseSsl('none')}
          />
          <span>HTTPS 미사용 (개발/로컬 전용)</span>
        </label>
      </fieldset>

      <fieldset className="mt-2 flex flex-col gap-2 rounded-md border p-3 text-sm">
        <legend className="px-1 text-xs">SiteLock</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="useSitelock"
            value="true"
            checked={siteLockConfirmed}
            onChange={(e) => {
              if (e.target.checked) {
                setSiteLockModalOpen(true);
              } else {
                setSiteLockConfirmed(false);
              }
            }}
          />
          <span>SiteLock 사용 (현재 IP만 사이트 접근 허용)</span>
        </label>
        <p className="text-xs text-amber-700" role="note">
          현재 IP만 사이트 접근 가능. 잘못 설정 시 DB 직접 수정으로만 잠금
          해제 가능합니다.
        </p>
      </fieldset>

      {siteLockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sitelock-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="w-full max-w-md rounded-md bg-white p-6 shadow-lg">
            <h3 id="sitelock-modal-title" className="mb-3 text-base font-semibold">
              SiteLock 활성화 확인
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              SiteLock을 활성화하면 현재 IP 주소만 사이트에 접근할 수 있습니다.
              IP가 변경되면 DB를 직접 수정해야만 잠금을 해제할 수 있습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSiteLockModalOpen(false)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-black/5"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setSiteLockConfirmed(true);
                  setSiteLockModalOpen(false);
                }}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:opacity-90"
              >
                이해했습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {formError ? (
        <p
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <Link
          href="/install/db-config"
          className="rounded-md border px-4 py-2 text-sm hover:bg-black/5"
        >
          이전
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[rgb(var(--color-primary))] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? '설치 중…' : '설치 완료'}
        </button>
      </div>
    </form>
  );
}
