'use client';
/**
 * 파일 관리 클라이언트 컴포넌트 — SPEC-ADMIN-002 Slice 2B.
 *
 * 파일 목록 + 고아 파일 정리 기능.
 */
import { useState } from 'react';
import { trpc } from '@/providers/TRPCProvider';

interface FileItem {
  id: number;
  sourceFilename: string;
  fileSize: bigint;
  downloadCount: number;
  uploader?: { id: string; nickname: string } | null;
  document?: { id: number; title: string } | null;
  regdate: Date;
}

interface OrphanItem {
  id: number;
  sourceFilename: string;
  fileSize: bigint;
  regdate: Date;
}

interface FileManagementClientProps {
  initialFiles: {
    items: FileItem[];
    nextCursor: string | null;
    totalCount: number;
  };
  initialOrphans: {
    items: OrphanItem[];
    nextCursor: string | null;
  };
}

export function FileManagementClient({ initialFiles, initialOrphans }: FileManagementClientProps) {
  const [showOrphans, setShowOrphans] = useState(false);
  const [orphanPreview, setOrphanPreview] = useState<Array<{ id: number; filename: string; size: bigint }>>([]);
  const [isPurging, setIsPurging] = useState(false);

  const listFiles = trpc.admin.file.list.useQuery({ limit: 20 });
  const listOrphans = trpc.admin.file.listOrphans.useQuery({ limit: 10 });
  const purgeOrphans = trpc.admin.file.purgeOrphans.useMutation();

  const files = listFiles.data || initialFiles;
  const orphans = listOrphans.data || initialOrphans;

  const handlePurgePreview = async () => {
    setIsPurging(true);
    const result = await purgeOrphans.mutateAsync({ olderThanDays: 30, dryRun: true });
    setOrphanPreview(result.preview as Array<{ id: number; filename: string; size: bigint }>);
    setIsPurging(false);
  };

  const handlePurgeConfirm = async () => {
    if (!confirm('정말로 고아 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    setIsPurging(true);
    await purgeOrphans.mutateAsync({ olderThanDays: 30, dryRun: false });
    setOrphanPreview([]);
    setIsPurging(false);
    // 리패치
    listOrphans.refetch();
  };

  return (
    <div className="space-y-6">
      {/* 고아 파일 정리 섹션 */}
      <div className="border rounded bg-white p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">고아 파일 정리</h2>
          <button
            onClick={() => setShowOrphans(!showOrphans)}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            {showOrphans ? '접기' : '펼치기'}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          더 이상 문서나 댓글에서 참조되지 않는 파일을 정리합니다. 30일 이상 된 고아 파일만 대상입니다.
        </p>

        {showOrphans && (
          <div className="mt-4 space-y-4">
            <div className="text-sm">
              현재 <span className="font-semibold">{orphans.items.length}</span>개의 고아 파일이 있습니다.
            </div>

            {orphanPreview.length > 0 && (
              <div className="border rounded p-4 bg-gray-50">
                <h3 className="font-semibold mb-2">삭제 예정 파일 ({orphanPreview.length}개)</h3>
                <ul className="text-sm space-y-1 max-h-60 overflow-y-auto">
                  {orphanPreview.map((file) => (
                    <li key={file.id} className="flex justify-between">
                      <span>{file.filename}</span>
                      <span className="text-gray-500">{(Number(file.size) / 1024).toFixed(1)} KB</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handlePurgePreview}
                disabled={isPurging}
                className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                미리보기
              </button>
              {orphanPreview.length > 0 && (
                <button
                  onClick={handlePurgeConfirm}
                  disabled={isPurging}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  삭제 실행
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 파일 목록 테이블 */}
      <div className="border rounded bg-white">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">파일 목록</h2>
            <div className="text-sm text-gray-600">
              총 {files.totalCount}개의 파일
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">파일명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">크기</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">업로더</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">첨부 문서</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">다운로드</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {files.items.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{file.sourceFilename}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(Number(file.fileSize) / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {file.uploader?.nickname || '알 수 없음'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {file.document ? (
                      <a href={`/board/${file.document.id}`} className="text-blue-600 hover:underline">
                        {file.document.title}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{file.downloadCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(file.regdate).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {files.nextCursor && (
          <div className="p-4 border-t text-sm text-gray-500">
            추가 파일이 더 있습니다. 검색/필터로 범위를 좁혀주세요.
          </div>
        )}
      </div>
    </div>
  );
}
