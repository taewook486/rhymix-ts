/**
 * Admin Site Design Page — 3-pane theme editor entry point.
 *
 * SPEC-THEME-POLISH-001 REQ-THEME-POLISH-001~009.
 * Server Component wrapper for client-side 3-pane editor.
 */

import { getCurrentSiteId } from '@/lib/admin/site-context';
import { getThemesForSite } from '@/lib/theme/admin-helpers';
import { SelectorPane } from '@/components/admin/site-design/SelectorPane';
import { PreviewPane } from '@/components/admin/site-design/PreviewPane';
import { TokenEditor } from '@/components/admin/site-design/TokenEditor';

export default async function AdminDesignPage() {
  const siteId = await getCurrentSiteId();
  const themes = await getThemesForSite(siteId);

  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold mb-6">사이트 디자인</h1>
      <div className="grid grid-cols-[220px_1fr_400px] gap-4 h-[calc(100vh-8rem)] min-w-0 xl:grid-cols-[220px_1fr_400px] flex flex-col xl:flex">
        <SelectorPane themes={themes} siteId={siteId} />
        <PreviewPane />
        <TokenEditor siteId={siteId} />
      </div>
    </div>
  );
}
