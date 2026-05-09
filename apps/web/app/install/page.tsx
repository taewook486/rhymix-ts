/**
 * SPEC-INSTALL-001 / Step 1: 라이선스 동의 — REQ-INSTALL-011.
 *
 * 정적 GPL v2 안내문과 동의 체크박스를 노출하고, 제출 시 server action
 * `agreeLicense`가 세션에 동의 플래그를 세운 뒤 다음 단계로 리다이렉트합니다.
 */
import { LicenseForm } from './license-form';

export default function InstallLicensePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Rhymix-TS 설치</h1>
      <p className="mt-4 text-sm text-[rgb(var(--color-muted))]">
        1 / 4 단계 — 라이선스 동의
      </p>

      <section className="mt-8 rounded-md border p-4 text-sm leading-relaxed">
        <p>
          Rhymix-TS는 <strong>GNU General Public License v2 (GPL-2.0-or-later)</strong>로
          배포되는 자유 소프트웨어입니다. 본 소프트웨어는 유용할 것으로 기대하여
          배포되지만, 어떠한 보증도 하지 않습니다.
        </p>
        <p className="mt-3">
          설치를 진행하면 위 라이선스 조건과 면책 조항에 동의하는 것으로 간주합니다.
          전체 라이선스 본문은 저장소의 <code>LICENSE</code> 파일에서 확인할 수 있습니다.
        </p>
      </section>

      <LicenseForm />
    </main>
  );
}
