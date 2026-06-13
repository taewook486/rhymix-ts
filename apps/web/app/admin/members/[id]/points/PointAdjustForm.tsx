/**
 * PointAdjustForm — 수동 포인트 조정 폼 (Client Component).
 *
 * @MX:SPEC: SPEC-POINT-001 REQ-POINT-060
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PointAdjustFormProps {
  memberId: number;
}

export function PointAdjustForm({ memberId }: PointAdjustFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/admin/api/points/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          amount: parseInt(amount, 10),
          reason,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || '조정 실패');
        return;
      }

      alert('포인트 조정 완료');
      setAmount('');
      setReason('');
      router.refresh();
    } catch {
      alert('오류 발생');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">수동 조정</h3>
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="포인트 (음수 차감 가능)"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          required
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="사유"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? '처리 중...' : '조정'}
        </button>
      </div>
    </form>
  );
}
