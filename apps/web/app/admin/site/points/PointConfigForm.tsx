/**
 * PointConfigForm — 사이트 포인트 설정 폼 (Client Component).
 *
 * @MX:SPEC: SPEC-POINT-001 REQ-POINT-062
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PointSiteConfig } from '@rhymix-ts/point';

interface PointConfigFormProps {
  initialConfig: PointSiteConfig;
}

export function PointConfigForm({ initialConfig }: PointConfigFormProps) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/admin/api/site/points/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || '저장 실패');
        return;
      }

      alert('설정 저장 완료');
      router.refresh();
    } catch {
      alert('오류 발생');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">기본 설정</h3>

      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            회원가입 보너스 (signupBonus)
          </label>
          <input
            type="number"
            value={config.signupBonus}
            onChange={(e) =>
              setConfig({ ...config, signupBonus: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            min={0}
          />
          <p className="text-xs text-muted-foreground mt-1">
            신규 회원가입 시 지급할 포인트 (0 = 비활성화)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="clampToZero"
            checked={config.clampToZero}
            onChange={(e) =>
              setConfig({ ...config, clampToZero: e.target.checked })
            }
            className="rounded"
          />
          <label htmlFor="clampToZero" className="text-sm">
            clampToZero (잔액이 0 이하로 떨어지지 않도록 제한)
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowNegativeBalance"
            checked={config.allowNegativeBalance}
            onChange={(e) =>
              setConfig({ ...config, allowNegativeBalance: e.target.checked })
            }
            className="rounded"
          />
          <label htmlFor="allowNegativeBalance" className="text-sm">
            allowNegativeBalance (마이너스 잔액 허용)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            기본 레벨 (defaultLevel)
          </label>
          <input
            type="number"
            value={config.defaultLevel}
            onChange={(e) =>
              setConfig({ ...config, defaultLevel: parseInt(e.target.value, 10) || 1 })
            }
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            min={1}
          />
          <p className="text-xs text-muted-foreground mt-1">
            신규 회원의 초기 레벨 (Phase 3 stub: 항상 level 1 반환)
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? '저장 중...' : '저장'}
      </button>
    </form>
  );
}
