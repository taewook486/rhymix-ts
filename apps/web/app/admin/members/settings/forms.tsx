'use client';
/**
 * 회원 설정 폼 (Client Components) — SPEC-ADMIN-002 Slice 1D.
 *
 * useActionState로 Server Action(actions.ts)을 바인딩한다.
 * page.tsx는 Server Component로 초기 설정값만 조회해서 props로 넘긴다.
 */
import { useActionState } from 'react';
import {
  updateSignupSettingsAction,
  updateLoginSettingsAction,
  updateAgreementSettingsAction,
  updateDesignSettingsAction,
  type ActionState,
} from './actions';

const initialActionState: ActionState = {};

export function SignupSettingsForm({
  initial,
}: {
  initial: {
    enabled: boolean;
    requireEmailVerification: boolean;
    requireAdminApproval: boolean;
    allowDuplicateNickname: boolean;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateSignupSettingsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="enabled" defaultChecked={initial.enabled} className="rounded" />
          <span className="text-sm font-medium">회원 가입 허용</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="requireEmailVerification"
            defaultChecked={initial.requireEmailVerification}
            className="rounded"
          />
          <span className="text-sm">이메일 인증 필수</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="requireAdminApproval"
            defaultChecked={initial.requireAdminApproval}
            className="rounded"
          />
          <span className="text-sm">관리자 승인 필요</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowDuplicateNickname"
            defaultChecked={initial.allowDuplicateNickname}
            className="rounded"
          />
          <span className="text-sm">중복 닉네임 허용</span>
        </label>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}

export function LoginSettingsForm({
  initial,
}: {
  initial: {
    allowAutoLogin: boolean;
    autoLoginDuration: number;
    maxFailedAttempts: number;
    redirectAfterLogin: string;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateLoginSettingsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowAutoLogin"
            defaultChecked={initial.allowAutoLogin}
            className="rounded"
          />
          <span className="text-sm font-medium">자동 로그인 허용</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="autoLoginDuration">
          자동 로그인 유지 기간 (일)
        </label>
        <input
          type="number"
          id="autoLoginDuration"
          name="autoLoginDuration"
          defaultValue={initial.autoLoginDuration}
          min={1}
          max={365}
          className="w-full border border-zinc-300 rounded px-3 py-2 max-w-xs"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="maxFailedAttempts">
          로그인 실패 잠금 임계값
        </label>
        <input
          type="number"
          id="maxFailedAttempts"
          name="maxFailedAttempts"
          defaultValue={initial.maxFailedAttempts}
          min={1}
          max={10}
          className="w-full border border-zinc-300 rounded px-3 py-2 max-w-xs"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="redirectAfterLogin">
          로그인 후 리디렉션
        </label>
        <select
          id="redirectAfterLogin"
          name="redirectAfterLogin"
          defaultValue={initial.redirectAfterLogin}
          className="w-full border border-zinc-300 rounded px-3 py-2 max-w-xs"
        >
          <option value="homepage">홈페이지</option>
          <option value="last_page">이전 페이지</option>
          <option value="dashboard">대시보드</option>
        </select>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}

export function AgreementSettingsForm({
  initial,
}: {
  initial: {
    terms: string;
    privacy: string;
    termsRequired: boolean;
    privacyRequired: boolean;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateAgreementSettingsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="max-w-4xl space-y-4">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="termsRequired"
            defaultChecked={initial.termsRequired}
            className="rounded"
          />
          <span className="text-sm font-medium">이용약관 동의 필수</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="terms">
          이용약관 내용
        </label>
        <textarea
          id="terms"
          name="terms"
          rows={10}
          defaultValue={initial.terms}
          className="w-full border border-zinc-300 rounded px-3 py-2 font-mono text-sm"
          placeholder="이용약관 내용을 입력하세요 (Markdown/HTML 지원)"
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="privacyRequired"
            defaultChecked={initial.privacyRequired}
            className="rounded"
          />
          <span className="text-sm font-medium">개인정보처리방침 동의 필수</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="privacy">
          개인정보처리방침 내용
        </label>
        <textarea
          id="privacy"
          name="privacy"
          rows={10}
          defaultValue={initial.privacy}
          className="w-full border border-zinc-300 rounded px-3 py-2 font-mono text-sm"
          placeholder="개인정보처리방침 내용을 입력하세요 (Markdown/HTML 지원)"
        />
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}

export function DesignSettingsForm({
  initial,
}: {
  initial: {
    memberSkinId: string;
    memberTemplateId: string;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateDesignSettingsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="memberSkinId">
          회원 영역 스킨
        </label>
        <select
          id="memberSkinId"
          name="memberSkinId"
          defaultValue={initial.memberSkinId}
          className="w-full border border-zinc-300 rounded px-3 py-2 max-w-xs"
        >
          <option value="">기본 스킨</option>
          {/* TODO: 실제 스킨 목록을 API로 가져와서 렌더링 */}
          <option value="default">기본 스킨</option>
        </select>
        <p className="text-xs text-zinc-500 mt-1">
          회원 영역(프로필, 가입 페이지 등)에 사용할 스킨을 선택합니다.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="memberTemplateId">
          회원 영역 템플릿
        </label>
        <select
          id="memberTemplateId"
          name="memberTemplateId"
          defaultValue={initial.memberTemplateId}
          className="w-full border border-zinc-300 rounded px-3 py-2 max-w-xs"
        >
          <option value="">기본 템플릿</option>
          {/* TODO: 실제 템플릿 목록을 API로 가져와서 렌더링 */}
          <option value="default">기본 템플릿</option>
        </select>
        <p className="text-xs text-zinc-500 mt-1">
          회원 영역의 레이아웃 템플릿을 선택합니다.
        </p>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
