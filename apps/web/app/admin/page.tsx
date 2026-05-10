/**
 * 관리자 대시보드 placeholder — SPEC-ADMIN-001에서 본격 구현 예정.
 *
 * 본 페이지의 유일한 목적은 `/install/complete`의 "관리자 대시보드로 이동"
 * 버튼이 404가 되지 않도록 하는 것입니다.
 */
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminPlaceholderPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">관리자 대시보드 — 구현 예정</h1>
      <p className="mt-4 text-sm">
        SPEC-ADMIN-001에서 본격 구현될 예정입니다. 지금은 자리표시자입니다.
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="rounded-md border px-4 py-2 text-sm hover:bg-black/5"
        >
          로그아웃 (로그인 페이지로 이동)
        </Link>
      </div>
    </main>
  );
}
