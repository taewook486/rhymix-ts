'use client';

/**
 * URL 블랙리스트 관리 Form — SPEC-SPAM-001 REQ-SPAM-006
 *
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-006
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { skipToken } from '@tanstack/react-query';
import { trpc } from '@/providers/TRPCProvider';

interface UrlBlacklist {
  id: number;
  domain: string;
  isRegex: boolean;
  reason: string | null;
}

interface UrlBlacklistFormProps {
  initialBlacklists: UrlBlacklist[];
}

export function UrlBlacklistForm({ initialBlacklists }: UrlBlacklistFormProps) {
  const router = useRouter();
  const [newDomain, setNewDomain] = useState('');
  const [newIsRegex, setNewIsRegex] = useState(false);
  const [newReason, setNewReason] = useState('');

  // Query for fetching URL blacklists
  const query = trpc.admin.spamfilter.urlBlacklist.list.useQuery();
  const blacklists = query.data ?? initialBlacklists;
  const refetch = query.refetch;

  // Mutation for adding URL blacklist
  const addMutation = trpc.admin.spamfilter.urlBlacklist.add.useMutation({
    onSuccess: () => {
      refetch();
      setNewDomain('');
      setNewReason('');
      setNewIsRegex(false);
    },
  });

  // Mutation for removing URL blacklist
  const removeMutation = trpc.admin.spamfilter.urlBlacklist.remove.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    try {
      await addMutation.mutateAsync({
        domain: newDomain,
        isRegex: newIsRegex,
        reason: newReason || undefined,
      });
    } catch (error) {
      console.error('Failed to add URL blacklist:', error);
      alert('URL 블랙리스트 추가에 실패했습니다.');
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('이 URL 블랙리스트를 삭제하시겠습니까?')) return;

    try {
      await removeMutation.mutateAsync({ id });
    } catch (error) {
      console.error('Failed to remove URL blacklist:', error);
      alert('URL 블랙리스트 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Form */}
      <form onSubmit={handleAdd} className="flex gap-4 items-end">
        <div className="flex-1">
          <label htmlFor="domain" className="block text-sm font-medium mb-1">
            도메인
          </label>
          <input
            id="domain"
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="예: spam.com 또는 *.spam.com"
            className="w-full px-3 py-2 border rounded-md"
            disabled={addMutation.isPending}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isRegex"
            type="checkbox"
            checked={newIsRegex}
            onChange={(e) => setNewIsRegex(e.target.checked)}
            className="w-4 h-4"
            disabled={addMutation.isPending}
          />
          <label htmlFor="isRegex" className="text-sm">
            정규식
          </label>
        </div>

        <div className="flex-1">
          <label htmlFor="reason" className="block text-sm font-medium mb-1">
            사유
          </label>
          <input
            id="reason"
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="차단 사유 (선택)"
            className="w-full px-3 py-2 border rounded-md"
            disabled={addMutation.isPending}
          />
        </div>

        <button
          type="submit"
          disabled={addMutation.isPending || !newDomain.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {addMutation.isPending ? '추가 중...' : '추가'}
        </button>
      </form>

      {/* List */}
      <div className="border rounded-md">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">도메인</th>
              <th className="px-4 py-2 text-left">유형</th>
              <th className="px-4 py-2 text-left">사유</th>
              <th className="px-4 py-2 text-left">작업</th>
            </tr>
          </thead>
          <tbody>
            {blacklists?.map((blacklist) => (
              <tr key={blacklist.id} className="border-t">
                <td className="px-4 py-2">{blacklist.domain}</td>
                <td className="px-4 py-2">
                  {blacklist.isRegex ? '정규식' : '일반'}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {blacklist.reason || '-'}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleRemove(blacklist.id)}
                    disabled={removeMutation.isPending}
                    className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {blacklists?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  등록된 URL 블랙리스트가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
