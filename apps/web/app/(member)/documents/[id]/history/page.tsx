/**
 * 문서 수정 이력 페이지 — SPEC-DOCUMENT-001 Slice C.
 *
 * listDocumentHistory 가 패키지에 없으므로 플레이스홀더 UI 를 표시한다.
 * 이력 기능은 Prisma 연동 및 도메인 함수 구현 후 활성화 예정.
 *
 * @MX:TODO [AUTO]: listDocumentHistory 구현 후 실제 데이터로 교체 필요.
 * @MX:SPEC: SPEC-DOCUMENT-001 Slice C
 */
interface DocumentHistoryPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function DocumentHistoryPage({ params }: DocumentHistoryPageProps) {
  const { id } = await params;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">수정 이력</h1>
      <p className="text-xs text-zinc-400 mb-6">문서 ID: {id}</p>
      <p className="text-sm text-zinc-500">
        구현 예정
      </p>
    </main>
  );
}
