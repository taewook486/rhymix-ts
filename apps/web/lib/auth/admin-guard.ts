/**
 * 관리자 Server Action 가드 (D-7).
 *
 * tRPC 를 거치지 않는 Server Action 도 `protectedAdminProcedure` 와 같은 판정
 * (관리자 세션 → 관리자 IP 제어/사이트 잠금 → 2FA)을 받게 한다. 판정 로직은
 * `server/api/admin-guard.ts` 하나를 tRPC 와 공유하므로 두 경로가 어긋나지 않는다.
 *
 * 컨텍스트(세션·ip·siteId)는 `getServerCaller()` 와 같은 방식(`createContext`)으로 만든다.
 *
 * 거부를 다루는 방식은 호출 함수의 기존 계약에 맞춰 고른다:
 *   - throw 계약:    `await assertAdminServerAction()`
 *   - redirect/결과: `const denied = await adminServerActionDenied(); if (denied) …`
 */
import { headers } from 'next/headers';
import { TRPCError } from '@trpc/server';
import { createContext } from '@/server/api/context';
import { assertAdminAccess } from '@/server/api/admin-guard';

/**
 * 관리자 가드를 통과해야 한다. 거부되면 TRPCError(FORBIDDEN) 를 던진다.
 * 통과하면 관리자 세션을 돌려준다.
 */
export async function assertAdminServerAction() {
  const h = await headers();
  const headerInit: Record<string, string> = {};
  h.forEach((value, key) => {
    headerInit[key] = value;
  });
  const ctx = await createContext({ req: new Request('http://internal', { headers: headerInit }) });
  await assertAdminAccess(ctx);
  // assertAdminAccess 가 관리자 세션임을 보장한다.
  return ctx.session as NonNullable<typeof ctx.session>;
}

/**
 * throw 하지 않는 형태. 통과하면 `{ ok: true, session }`, 거부되면 `{ ok: false, message }`.
 * redirect·`{ error }` 같은 기존 실패 계약을 유지해야 하는 함수용.
 * 가드 자체의 예기치 않은 오류(TRPCError 가 아닌 것)는 그대로 던진다.
 */
export async function adminServerActionCheck(): Promise<
  { ok: true; session: Awaited<ReturnType<typeof assertAdminServerAction>> } | { ok: false; message: string }
> {
  try {
    return { ok: true, session: await assertAdminServerAction() };
  } catch (err) {
    if (err instanceof TRPCError) return { ok: false, message: err.message };
    throw err;
  }
}

/** 사유만 필요할 때: 통과하면 null, 거부되면 사유 메시지. */
export async function adminServerActionDenied(): Promise<string | null> {
  const result = await adminServerActionCheck();
  return result.ok ? null : result.message;
}
