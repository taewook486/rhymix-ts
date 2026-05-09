/**
 * SPEC-INSTALL-001 / Step 1: 라이선스 동의.
 *
 * 본 단계는 정적 표시 + 다음 단계 진입만을 담당합니다. 실제 동의 처리는
 * Slice C에서 server action + iron-session으로 구현됩니다 (REQ-INSTALL-011).
 */
import Link from 'next/link';

export default function InstallLicensePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Rhymix-TS 설치</h1>
      <p className="mt-4 text-sm text-[rgb(var(--color-muted))]">
        1 / 4 단계 — 라이선스 동의
      </p>

      <section className="mt-8 rounded-md border p-4 text-sm">
        <p>
          Rhymix-TS는 GNU GPL v2 라이선스로 배포됩니다. 설치를 진행하면
          라이선스 조건에 동의하는 것으로 간주합니다.
        </p>
      </section>

      <div className="mt-8 flex justify-end">
        <Link
          href="/install/check-env"
          className="rounded-md bg-[rgb(var(--color-primary))] px-4 py-2 text-sm text-white hover:opacity-90"
        >
          다음
        </Link>
      </div>
    </main>
  );
}
