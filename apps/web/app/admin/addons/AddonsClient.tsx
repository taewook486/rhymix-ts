'use client';

import { useState } from 'react';
import { toggleAddonAction, reorderAddonAction } from './actions';

// Hook 타입 — @rhymix-ts/core/addons/types.ts
type HookType = 'onContentTransform' | 'onUserRender' | 'onPageView' | 'onAdminAction';

// AddonDefinition — REQ-ADDON-011
interface AddonDefinition {
  name: string;
  displayName: string;
  description: string;
  defaultPriority: number;
  hooks: Partial<Record<HookType, unknown>>;
}

// Effective addon (머지된 상태)
interface EffectiveAddon extends AddonDefinition {
  enabled: boolean;
  priority: number;
}

interface AddonsClientProps {
  addons: EffectiveAddon[];
}

/**
 * Addon 관리 Client Component — REQ-ADDON-050~053
 *
 * Hook 타입을 배지로 표시하고 활성/비활성 토글, priority 변경을 처리한다.
 */
export default function AddonsClient({ addons: initialAddons }: AddonsClientProps) {
  const [addons, setAddons] = useState<EffectiveAddon[]>(initialAddons);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  // 토글 처리
  async function handleToggle(name: string, enabled: boolean) {
    setUpdating((prev) => new Set(prev).add(name));

    // Optimistic update
    setAddons((prev) =>
      prev.map((addon) =>
        addon.name === name ? { ...addon, enabled } : addon
      )
    );

    try {
      const result = await toggleAddonAction(name, enabled);
      if (!result.success) {
        // 실패 시 rollback
        setAddons((prev) =>
          prev.map((addon) =>
            addon.name === name ? { ...addon, enabled: !enabled } : addon
          )
        );
        alert(`토글 실패: ${result.error}`);
      }
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  }

  // Priority 변경 (debounce 없이 blur 시에 바로 적용)
  async function handlePriorityChange(name: string, newPriority: number) {
    if (newPriority < 0 || newPriority > 999) {
      alert('Priority는 0-999 사이여야 합니다.');
      return;
    }

    setUpdating((prev) => new Set(prev).add(name));

    // Optimistic update
    setAddons((prev) =>
      prev.map((addon) =>
        addon.name === name ? { ...addon, priority: newPriority } : addon
      )
    );

    try {
      const result = await reorderAddonAction(name, newPriority);
      if (!result.success) {
        // 실패 시 rollback (기존 priority를 찾아서 복원)
        setAddons((prev) =>
          prev.map((addon) =>
            addon.name === name
              ? { ...addon, priority: initialAddons.find((a) => a.name === name)?.priority ?? addon.priority }
              : addon
          )
        );
        alert(`Priority 변경 실패: ${result.error}`);
      }
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  }

  // Hook 타입을 사람이 읽기 쉬운 라벨로 변환
  function getHookLabel(hookType: HookType): string {
    const labels: Record<HookType, string> = {
      onContentTransform: '콘텐츠 변환',
      onUserRender: '사용자 렌더',
      onPageView: '페이지 뷰',
      onAdminAction: '관리자 액션',
    };
    return labels[hookType];
  }

  if (addons.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 p-8 text-center text-sm text-zinc-500">
        등록된 애드온이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {addons.map((addon) => (
        <div
          key={addon.name}
          className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
        >
          {/* Header: 이름 + 토글 */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-zinc-900">
                {addon.displayName}
              </h3>
              <p className="text-sm text-zinc-500">{addon.description}</p>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addon.enabled}
                  disabled={updating.has(addon.name)}
                  onChange={(e) => handleToggle(addon.name, e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-zinc-700">
                  {addon.enabled ? '활성' : '비활성'}
                </span>
              </label>
            </div>
          </div>

          {/* Details: priority + hook types */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Priority input */}
            <div className="flex items-center gap-2">
              <label htmlFor={`priority-${addon.name}`} className="text-zinc-600">
                Priority:
              </label>
              <input
                id={`priority-${addon.name}`}
                type="number"
                min={0}
                max={999}
                value={addon.priority}
                disabled={updating.has(addon.name)}
                onBlur={(e) => {
                  const newPriority = parseInt(e.target.value, 10);
                  if (!isNaN(newPriority) && newPriority !== addon.priority) {
                    handlePriorityChange(addon.name, newPriority);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-center disabled:opacity-50"
              />
              {updating.has(addon.name) && (
                <span className="text-xs text-zinc-500">저장 중...</span>
              )}
            </div>

            {/* Hook types as badges */}
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(addon.hooks).length > 0 ? (
                (Object.keys(addon.hooks) as HookType[]).map((hookType) => (
                  <span
                    key={hookType}
                    className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                  >
                    {getHookLabel(hookType)}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  등록된 Hook 없음
                </span>
              )}
            </div>
          </div>

          {/* Auto-disabled warning (REQ-ADDON-033) */}
          {/* TODO: lastDisabledAt, lastDisabledReason 표시 로직 추가 필요 */}
          {/* Backend에서 listEffectiveAddons가 disabled addons도 반환하도록 수정되어야 함 */}
        </div>
      ))}
    </div>
  );
}
