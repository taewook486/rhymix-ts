/**
 * 코어파일 정리 페이지 — SPEC-ADMIN-002 Slice 3F.
 *
 * REQ-ADMIN2-149: 생성된 캐시 파일 정리 (dry-run preview + 삭제).
 *
 * @MX:NOTE: [AUTO] 파일 삭제 전 preview 표시.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-149
 */
import { getServerCaller } from '@/lib/trpc/server';

export const dynamic = 'force-dynamic';

export default async function CleanupPage() {
  const caller = await getServerCaller();
  const { candidates } = await caller.admin.cache.listCleanupCandidates();

  const totalSize = candidates.reduce((sum, c) => sum + c.size, 0);
  const fileCount = candidates.filter((c) => c.isFile).length;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">코어파일 정리</h1>

      {/* 요약 정보 */}
      <section className="mb-6">
        <h2 className="text-base font-medium mb-2">정리 대상</h2>
        <table className="text-sm border-collapse w-full max-w-lg">
          <tbody>
            <tr className="border-b">
              <td className="py-1 pr-4 text-zinc-500 w-32">파일 수</td>
              <td className="py-1 font-mono">{fileCount}개</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-zinc-500">전체 크기</td>
              <td className="py-1 font-mono">{formatBytes(totalSize)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 파일 목록 (dry-run) */}
      <section className="mb-6">
        <h2 className="text-base font-medium mb-2">
          정리 대상 파일 ({candidates.length}개)
        </h2>
        <p className="text-sm text-zinc-500 mb-3">
          * 이 목록은 dry-run 결과입니다. 실제로 삭제되지 않았습니다.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="py-1 pr-4 font-normal">파일 경로</th>
                <th className="py-1 pr-4 font-normal w-24">크기</th>
                <th className="py-1 font-normal w-16">유형</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-zinc-500">
                    정리할 파일이 없습니다.
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate.path} className="border-b last:border-0">
                    <td className="py-1 pr-4 font-mono text-xs text-zinc-600 break-all">
                      {candidate.path}
                    </td>
                    <td className="py-1 pr-4 font-mono text-xs">
                      {formatBytes(candidate.size)}
                    </td>
                    <td className="py-1 font-mono text-xs">
                      {candidate.isFile ? '파일' : '디렉토리'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 안내 메시지 */}
      {candidates.length > 0 && (
        <section className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
          <p className="text-yellow-800">
            <strong>⚠️ 주의:</strong> 이 기능은 개발 중인 기능입니다. 실제 삭제
            기능을 사용하려면 관리자 권한이 필요합니다.
          </p>
        </section>
      )}
    </div>
  );
}

/**
 * 바이트 단위를 사람이 읽기 쉬운 형식으로 변환.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
