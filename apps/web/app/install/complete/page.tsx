/**
 * SPEC-INSTALL-001 / Step 5: 설치 완료 환영 페이지 (REQ-INSTALL-014 사후 UX).
 *
 * `performInstall` 직후 리다이렉트되어 1회성으로 환영 메시지를 표시합니다.
 * 본 페이지가 첫 렌더될 때 위저드 세션을 폐기하므로 (REQ-INSTALL-005),
 * 새로고침 시 두 번째 렌더는 "이미 설치 완료" 안내로 fallback합니다.
 *
 * 미들웨어는 `/install/complete` 경로를 INSTALL_LOCK 차단에서 예외 처리
 * 합니다(REQ-INSTALL-023 미세 조정 — Slice D7).
 */
import Link from 'next/link';

import { getWizardSession } from '@/lib/install/wizard-session';

export const dynamic = 'force-dynamic';

export default async function InstallCompletePage() {
  const session = await getWizardSession();
  const justCompleted = session.step === 'finish';
  // Next.js 16: Server Component 렌더 중 쿠키 수정 금지.
  // 위저드 세션은 60분 TTL로 자연 만료되며, 쿠키 scope=/install이라
  // 다른 라우트에 영향 없음. 명시 폐기는 Slice E의 "logout" server action
  // 또는 별도 cleanup hook으로 옮길 예정.

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">
        {justCompleted ? '설치가 완료되었습니다.' : '이미 설치가 완료된 사이트입니다.'}
      </h1>

      {justCompleted ? (
        <>
          <p className="mt-4 text-sm">Rhymix-TS에 오신 것을 환영합니다.</p>
          <section className="mt-8 rounded-md border bg-white/50 p-4 text-sm">
            <h2 className="font-semibold">다음 단계 안내</h2>
            <ul className="mt-2 list-disc pl-5 leading-7">
              <li>
                기본 모듈(board, notice, qna), 기본 메뉴, 샘플 문서가 이미 생성되어 있습니다.{' '}
                <Link href="/admin/modules" className="text-[rgb(var(--color-primary))] underline">
                  모듈 관리
                </Link>{' '}
               에서 기존 모듈을 편집하거나 새 모듈을 추가하세요.
              </li>
              <li>
                회원 그룹 권한을 설정하세요.{' '}
                <Link href="/admin/members/settings" className="text-[rgb(var(--color-primary))] underline">
                  회원 설정
                </Link>
               에서 권한을 관리할 수 있습니다.
              </li>
              <li>
                사이트 제목과 기본 설정을 변경하세요.{' '}
                <Link href="/admin/settings" className="text-[rgb(var(--color-primary))] underline">
                  일반 설정
                </Link>
               에서 사이트 정보를 커스터마이징할 수 있습니다.
              </li>
            </ul>
          </section>
        </>
      ) : (
        <p className="mt-4 text-sm">
          이 화면은 설치 직후 1회만 표시됩니다. 로그인 후 관리자 페이지에서 작업하세요.
        </p>
      )}

      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/admin"
          className="rounded-md bg-[rgb(var(--color-primary))] px-4 py-2 text-sm text-white hover:opacity-90"
        >
          관리자 대시보드로 이동
        </Link>
        <Link
          href="/login"
          className="rounded-md border px-4 py-2 text-sm hover:bg-black/5"
        >
          로그인 페이지로 이동
        </Link>
      </div>
    </div>
  );
}
