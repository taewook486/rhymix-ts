'use client';

/**
 * SelectorPane — Left pane of 3-pane admin theme editor.
 *
 * SPEC-THEME-POLISH-001 REQ-THEME-POLISH-004, REQ-THEME-POLISH-005.
 * Theme / Layout / Skin 리스트와 활성 표시.
 */

import { useState, useEffect } from 'react';
import { cn } from '@rhymix-ts/ui';
import { Check } from 'lucide-react';
import { Prisma } from '@rhymix-ts/db';
import { AssignScopeDialog } from './AssignScopeDialog';
import { assignTheme, assignLayout, assignSkin } from '@/app/admin/site/design/actions';
import { getLayoutsForTheme, getSkinsForLayout } from '@/lib/theme/admin-actions';

interface SelectorPaneProps {
  themes: Prisma.ThemeGetPayload<Record<string, never>>[];
  siteId: number;
}

type ScopeType = 'module_instance' | 'domain' | 'site';
type AssignmentType = 'theme' | 'layout' | 'skin';

export function SelectorPane({ themes, siteId }: SelectorPaneProps) {
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [selectedSkinName, setSelectedSkinName] = useState<string | null>(null);

  const [layouts, setLayouts] = useState<Prisma.LayoutGetPayload<Record<string, never>>[]>([]);
  const [skins, setSkins] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('theme');

  // Theme 선택 시 layouts 조회
  useEffect(() => {
    if (selectedThemeId) {
      getLayoutsForTheme(selectedThemeId).then(setLayouts);
      setSelectedLayoutId(null);
      setSelectedSkinName(null);
      setSkins([]);
    } else {
      setLayouts([]);
      setSelectedLayoutId(null);
      setSelectedSkinName(null);
      setSkins([]);
    }
  }, [selectedThemeId]);

  // Layout 선택 시 skins 조회
  useEffect(() => {
    if (selectedLayoutId && selectedThemeId) {
      getSkinsForLayout(selectedLayoutId, selectedThemeId).then((skinList) => {
        setSkins(skinList.map((s) => s.name));
      });
      setSelectedSkinName(null);
    } else {
      setSkins([]);
      setSelectedSkinName(null);
    }
  }, [selectedLayoutId, selectedThemeId]);

  // 할당 dialog 핸들러
  const handleAssign = (type: AssignmentType) => {
    setAssignmentType(type);
    setDialogOpen(true);
  };

  const handleConfirmAssign = async (scope: ScopeType) => {
    // @MX:NOTE: [AUTO] scope별 refId 계산 로직은 향후 domain/module selector 도입 시 개선
    // 현재는 site scope만 지원 (refId = siteId)
    const refId = siteId;

    let result;
    switch (assignmentType) {
      case 'theme':
        if (!selectedThemeId) return;
        result = await assignTheme({
          scope: scope as 'site' | 'domain',
          refId,
          themeId: selectedThemeId,
          siteId,
        });
        break;
      case 'layout':
        if (!selectedLayoutId) return;
        result = await assignLayout({ scope, refId, layoutId: selectedLayoutId, siteId });
        break;
      case 'skin':
        // Skin은 항상 module_instance scope (현재 구현 기준)
        if (!selectedSkinName) return;
        result = await assignSkin({ moduleInstanceId: refId, skinName: selectedSkinName });
        break;
    }

    if (result?.error) {
      alert(`할당 실패: ${result.error}`); // TODO: Toaster로 개선
    } else {
      setDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 overflow-y-auto">
        {/* Theme 섹션 */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-100 mb-2">테마</h3>
          <div className="space-y-1">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors',
                  selectedThemeId === theme.id
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                )}
                onClick={() => setSelectedThemeId(theme.id)}
              >
                <span className="text-sm">{theme.displayName || theme.name}</span>
                {selectedThemeId === theme.id && <Check className="h-4 w-4" />}
              </div>
            ))}
          </div>
          {selectedThemeId && (
            <button
              type="button"
              onClick={() => handleAssign('theme')}
              className="mt-2 w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              적용
            </button>
          )}
        </section>

        {/* Layout 섹션 */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-100 mb-2">레이아웃</h3>
          <div className="space-y-1">
            {layouts.map((layout) => (
              <div
                key={layout.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors',
                  selectedLayoutId === layout.id
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                )}
                onClick={() => setSelectedLayoutId(layout.id)}
              >
                <span className="text-sm">{layout.title || layout.name}</span>
                {selectedLayoutId === layout.id && <Check className="h-4 w-4" />}
              </div>
            ))}
          </div>
          {selectedLayoutId && (
            <button
              type="button"
              onClick={() => handleAssign('layout')}
              className="mt-2 w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              적용
            </button>
          )}
        </section>

        {/* Skin 섹션 */}
        <section>
          <h3 className="text-sm font-semibold text-zinc-100 mb-2">스킨</h3>
          <div className="space-y-1">
            {skins.map((skin) => (
              <div
                key={skin}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors',
                  selectedSkinName === skin
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                )}
                onClick={() => setSelectedSkinName(skin)}
              >
                <span className="text-sm capitalize">{skin}</span>
                {selectedSkinName === skin && <Check className="h-4 w-4" />}
              </div>
            ))}
          </div>
          {selectedSkinName && (
            <button
              type="button"
              onClick={() => handleAssign('skin')}
              className="mt-2 w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              적용
            </button>
          )}
        </section>
      </div>

      <AssignScopeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmAssign}
        type={assignmentType}
      />
    </>
  );
}
