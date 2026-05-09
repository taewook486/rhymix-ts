/**
 * 위저드 server action들의 공통 반환 타입.
 *
 * `useActionState`와 호환되며, 성공/실패가 같은 형태로 직렬화됩니다.
 */
export type ActionState =
  | { ok: true }
  | {
      ok: false;
      formError?: string;
      fieldErrors?: Record<string, string>;
    };

/** 초기 상태 — 폼 첫 렌더 시 사용. */
export const initialActionState: ActionState = { ok: true };
