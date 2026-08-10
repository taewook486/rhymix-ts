'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import type { RouterOutput } from '@rhymix-ts/trpc-server';

type MailLogItem = RouterOutput['admin']['mailLog']['list']['items'][number];

/**
 * 관리자 메일 발송 내역 페이지 — SPEC-CONTENT-PARITY-001 M7
 *
 * REQ-CPAR-016: 메일 발송 내역 조회 (성공/실패 모두 기록)
 * - 수신자, 제목, 상태, 에러 메시지, 발송 시간 표시
 * - 상태 필터 (전체/성공/실패)
 * - Cursor pagination
 */
export default function AdminMailLogsPage() {
  const [status, setStatus] = useState<'ALL' | 'SENT' | 'FAILED'>('ALL');
  const [logs, setLogs] = useState<MailLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const loadLogs = async (cursor?: string) => {
    setLoading(true);
    try {
      const result = await api.admin.mailLog.list.query({
        cursor,
        limit: 20,
        status,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setLogs(result.items);
      setNextCursor(result.nextCursor);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Failed to load mail logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useState(() => {
    loadLogs();
  });

  // 상태 필터 변경
  const handleStatusChange = (newStatus: typeof status) => {
    setStatus(newStatus);
    loadLogs();
  };

  // 다음 페이지 로드
  const loadNext = () => {
    if (nextCursor) {
      loadLogs(nextCursor);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">메일 발송 내역</h1>

      {/* 상태 필터 */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => handleStatusChange('ALL')}
          className={`px-4 py-2 rounded border ${
            status === 'ALL'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          전체 ({totalCount})
        </button>
        <button
          onClick={() => handleStatusChange('SENT')}
          className={`px-4 py-2 rounded border ${
            status === 'SENT'
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          성공
        </button>
        <button
          onClick={() => handleStatusChange('FAILED')}
          className={`px-4 py-2 rounded border ${
            status === 'FAILED'
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          실패
        </button>
      </div>

      {/* 발송 내역 테이블 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold">상태</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">수신자</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">제목</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">에러</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">발송 시간</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  로딩 중...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  발송 내역이 없습니다.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-2">
                    {log.status === 'SENT' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                        성공
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-medium">
                        실패
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{log.recipient}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{log.subject}</td>
                  <td className="px-4 py-2 text-sm text-gray-500 max-w-md truncate">
                    {log.error ?? '-'}
                  </td>
                  <td className="p-2 text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString('ko-KR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 더보기 버튼 */}
      {nextCursor && (
        <div className="mt-4 text-center">
          <button
            onClick={loadNext}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? '로딩 중...' : '더보기'}
          </button>
        </div>
      )}
    </div>
  );
}
