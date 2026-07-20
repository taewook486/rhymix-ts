'use client';
/**
 * 회원 설정 폼 (Client Components) — SPEC-ADMIN-002 Slice 1D + Slice 2C.
 *
 * useActionState로 Server Action(actions.ts)을 바인딩한다.
 * page.tsx는 Server Component로 초기 설정값만 조회해서 props로 넘긴다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-047, REQ-ADMIN2-048, REQ-ADMIN2-050, REQ-ADMIN2-051, REQ-ADMIN2-052
 */
import { useActionState, useState } from 'react';
import {
  updateDefaultSettingsAction,
  updateSignupSettingsAction,
  updateLoginSettingsAction,
  updateAgreementSettingsAction,
  updateDesignSettingsAction,
  updateFeatureSettingsAction,
  type ActionState,
} from './actions';

const initialActionState: ActionState = {};

export interface DefaultSettingsValue {
  signupAccessMode: 'ALLOW' | 'DENY' | 'SIGNUP_KEY';
  signupKey: string;
  emailAuthTtlHours: number;
  showProfilePhotoInList: boolean;
  nicknameChangeAllowed: boolean;
  nicknameSaveChangeLog: boolean;
  nicknameAllowSpecialChars: boolean;
  nicknameAllowedSpecialChars: string;
  nicknameAllowSpacing: boolean;
  allowDuplicateNickname: boolean;
  passwordPolicyLevel: 'NORMAL' | 'STRONG' | 'VERY_STRONG';
  argon2TimeCost: number;
  autoRehashEnabled: boolean;
}

/**
 * "기본 설정" 탭 — SPEC-MEMBER-ADMIN-001 Slice D (REQ-MADM-015~027).
 */
export function DefaultSettingsForm({ initial }: { initial: DefaultSettingsValue }) {
  const [state, formAction, isPending] = useActionState(
    updateDefaultSettingsAction,
    initialActionState,
  );
  const [accessMode, setAccessMode] = useState(initial.signupAccessMode);
  const [allowSpecialChars, setAllowSpecialChars] = useState(initial.nicknameAllowSpecialChars);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      {/* REQ-MADM-016/017: 가입 허가 모드 */}
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="signupAccessMode">
          회원가입 허가
        </label>
        <select
          id="signupAccessMode"
          name="signupAccessMode"
          defaultValue={initial.signupAccessMode}
          onChange={(e) => setAccessMode(e.target.value as DefaultSettingsValue['signupAccessMode'])}
          className="border border-zinc-300 rounded px-3 py-2 text-sm"
        >
          <option value="ALLOW">허용</option>
          <option value="DENY">거부</option>
          <option value="SIGNUP_KEY">가입키 일치 시에만 허용</option>
        </select>
      </div>

      {accessMode === 'SIGNUP_KEY' && (
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="signupKey">
            가입키
          </label>
          <input
            type="text"
            id="signupKey"
            name="signupKey"
            defaultValue={initial.signupKey}
            className="w-full border border-zinc-300 rounded px-3 py-2 text-sm"
            placeholder="가입 URL의 key 파라미터와 일치해야 가입이 허용됩니다"
          />
        </div>
      )}

      {/* REQ-MADM-018: 인증 메일 유효기간 */}
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="emailAuthTtlHours">
          인증 메일 유효기간(시간)
        </label>
        <input
          type="number"
          id="emailAuthTtlHours"
          name="emailAuthTtlHours"
          min={1}
          defaultValue={initial.emailAuthTtlHours}
          className="w-32 border border-zinc-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* REQ-MADM-019: 관리자 회원 목록 프로필사진 노출 */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="showProfilePhotoInList"
            defaultChecked={initial.showProfilePhotoInList}
            className="rounded"
          />
          <span className="text-sm">관리자 회원 목록에 프로필사진 표시</span>
        </label>
      </div>

      {/* REQ-MADM-020~023: 닉네임 변경 관련 */}
      <fieldset className="border border-zinc-200 rounded p-4 space-y-3">
        <legend className="text-sm font-medium px-1">닉네임 변경</legend>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="nicknameChangeAllowed"
            defaultChecked={initial.nicknameChangeAllowed}
            className="rounded"
          />
          <span className="text-sm">닉네임 변경 허용</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="nicknameSaveChangeLog"
            defaultChecked={initial.nicknameSaveChangeLog}
            className="rounded"
          />
          <span className="text-sm">닉네임 변경 기록 저장</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="nicknameAllowSpecialChars"
            defaultChecked={initial.nicknameAllowSpecialChars}
            onChange={(e) => setAllowSpecialChars(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">닉네임 특수문자 허용</span>
        </label>

        {allowSpecialChars && (
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="nicknameAllowedSpecialChars">
              허용 특수문자
            </label>
            <input
              type="text"
              id="nicknameAllowedSpecialChars"
              name="nicknameAllowedSpecialChars"
              defaultValue={initial.nicknameAllowedSpecialChars}
              className="w-48 border border-zinc-300 rounded px-3 py-2 text-sm"
              placeholder="예: -_."
            />
          </div>
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="nicknameAllowSpacing"
            defaultChecked={initial.nicknameAllowSpacing}
            className="rounded"
          />
          <span className="text-sm">닉네임 띄어쓰기 허용</span>
        </label>

        {/* REQ-MADM-024: 가입 설정 탭과 동일한 키(member.signup.allowDuplicateNickname) 재사용 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowDuplicateNickname"
            defaultChecked={initial.allowDuplicateNickname}
            className="rounded"
          />
          <span className="text-sm">닉네임 중복 허용 (가입 설정 탭과 동일한 값)</span>
        </label>
      </fieldset>

      {/* REQ-MADM-025~027: 비밀번호/보안 */}
      <fieldset className="border border-zinc-200 rounded p-4 space-y-3">
        <legend className="text-sm font-medium px-1">비밀번호 보안</legend>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="passwordPolicyLevel">
            비밀번호 보안수준
          </label>
          <select
            id="passwordPolicyLevel"
            name="passwordPolicyLevel"
            defaultValue={initial.passwordPolicyLevel}
            className="border border-zinc-300 rounded px-3 py-2 text-sm"
          >
            <option value="NORMAL">낮음</option>
            <option value="STRONG">보통</option>
            <option value="VERY_STRONG">높음</option>
          </select>
        </div>

        <div>
          <p className="text-sm text-zinc-500">
            현재 해시 알고리즘: <span className="font-mono">Argon2id</span> (읽기 전용)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="argon2TimeCost">
            Argon2id 시간 비용(time cost, 안전 범위 2~10)
          </label>
          <input
            type="number"
            id="argon2TimeCost"
            name="argon2TimeCost"
            min={2}
            max={10}
            defaultValue={initial.argon2TimeCost}
            className="w-32 border border-zinc-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="autoRehashEnabled"
            defaultChecked={initial.autoRehashEnabled}
            className="rounded"
          />
          <span className="text-sm">로그인 시 구버전 해시 자동 업그레이드</span>
        </label>
      </fieldset>

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
    termsVersion: string | null;
    privacyVersion: string | null;
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
        <p className="text-xs text-zinc-500 mt-1">
          마지막 수정: {initial.termsVersion ? new Date(initial.termsVersion).toLocaleString('ko-KR') : '없음'}
        </p>
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
        <p className="text-xs text-zinc-500 mt-1">
          마지막 수정: {initial.privacyVersion ? new Date(initial.privacyVersion).toLocaleString('ko-KR') : '없음'}
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

export function FeatureSettingsForm({
  initial,
}: {
  initial: {
    allowProfileImage: boolean;
    allowSignature: boolean;
    exposeInMemberSearch: boolean;
    allowMessages: boolean;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateFeatureSettingsAction,
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
            name="allowProfileImage"
            defaultChecked={initial.allowProfileImage}
            className="rounded"
          />
          <span className="text-sm font-medium">프로필 이미지 허용</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowSignature"
            defaultChecked={initial.allowSignature}
            className="rounded"
          />
          <span className="text-sm font-medium">서명 허용</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="exposeInMemberSearch"
            defaultChecked={initial.exposeInMemberSearch}
            className="rounded"
          />
          <span className="text-sm font-medium">회원 검색 노출</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowMessages"
            defaultChecked={initial.allowMessages}
            className="rounded"
          />
          <span className="text-sm font-medium">쪽지 시스템 사용</span>
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
