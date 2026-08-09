'use client';
/**
 * 파일 관리 클라이언트 컴포넌트 — SPEC-ADMIN-002 Slice 2B.
 *
 * 파일 목록 + 고아 파일 정리 + 검색/필터/정렬/선택 일괄 삭제 (SPEC-CONTENT-PARITY-001 M4).
 *
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-021, REQ-CPAR-022, REQ-CPAR-023
 */
import { useState } from 'react';
import { trpc } from '@/providers/TRPCProvider';

type FileSortBy = 'size' | 'downloads' | 'regdate';
type FileSortOrder = 'asc' | 'desc';

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

  // REQ-CPAR-021: 파일명 검색 + 파일 타입 필터
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('');
  // REQ-CPAR-022: 정렬(파일 크기/다운로드 수/등록일)
  const [sortBy, setSortBy] = useState<FileSortBy>('regdate');
  const [sortOrder, setSortOrder] = useState<FileSortOrder>('desc');
  // REQ-CPAR-023: 체크박스 선택 + 일괄 삭제
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const listFiles = trpc.admin.file.list.useQuery({
    limit: 20,
    search: search || undefined,
    fileType: fileType || undefined,
    sortBy,
    sortOrder,
  });
  const listOrphans = trpc.admin.file.listOrphans.useQuery({ limit: 10 });
  const purgeOrphans = trpc.admin.file.purgeOrphans.useMutation();
  const bulkDelete = trpc.admin.file.bulkDelete.useMutation({
    onSuccess: () => {
      setSelectedIds(new Set());
      listFiles.refetch();
    },
  });

  const files = listFiles.data || initialFiles;
  const orphans = listOrphans.data || initialOrphans;

  const allSelected = files.items.length > 0 && files.items.every((file) => selectedIds.has(file.id));

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(files.items.map((file) => file.id)));
  };

  const toggleRow = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
  };

  const handleBulkDelete = () => {
    if (!confirm(`선택한 ${selectedIds.size}개의 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    bulkDelete.mutate({ fileIds: Array.from(selectedIds) });
  };

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
        <div className="p-6 border-b space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">파일 목록</h2>
            <div className="text-sm text-gray-600">
              총 {files.totalCount}개의 파일
            </div>
          </div>

          {/* 검색/필터/정렬 — REQ-CPAR-021, REQ-CPAR-022 */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="file-search" className="block text-xs font-medium text-gray-600 mb-1">
                파일명 검색
              </label>
              <input
                id="file-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="파일명으로 검색"
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="file-type-filter" className="block text-xs font-medium text-gray-600 mb-1">
                파일 타입
              </label>
              <select
                id="file-type-filter"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              >
                <option value="">전체</option>
                <option value="image">이미지</option>
                <option value="video">비디오</option>
                <option value="audio">오디오</option>
                <option value="application">문서/기타</option>
              </select>
            </div>

            <div>
              <label htmlFor="file-sort" className="block text-xs font-medium text-gray-600 mb-1">
                정렬
              </label>
              <select
                id="file-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as FileSortBy)}
                className="border rounded px-3 py-1.5 text-sm"
              >
                <option value="regdate">등록일</option>
                <option value="size">파일 크기</option>
                <option value="downloads">다운로드 수</option>
              </select>
            </div>

            <button
              type="button"
              onClick={toggleSortOrder}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '오름차순' : '내림차순'}
            </button>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
                className="ml-auto px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDelete.isPending ? '삭제 중...' : `선택 삭제 (${selectedIds.size})`}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="전체 선택"
                    className="rounded"
                  />
                </th>
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
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(file.id)}
                      onChange={() => toggleRow(file.id)}
                      aria-label={`파일 ${file.id} 선택`}
                      className="rounded"
                    />
                  </td>
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
              {files.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    조건에 맞는 파일이 없습니다.
                  </td>
                </tr>
              )}
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
