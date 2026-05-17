/**
 * routes/index-page.tsx — SPEC-CONTENT-001 Slice A placeholder
 *
 * @MX:NOTE [AUTO]: Slice A placeholder. Slice B 에서 listDocuments + 게시판 목록 UI 로 교체.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-001
 */
import { createElement } from 'react';
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';

export async function BoardIndexPage(props: ModuleRoutePageProps) {
  return createElement('main', null,
    createElement('h1', null, props.instance.name),
    createElement('p', null, `board mid=${props.instance.mid} (Slice A placeholder)`),
  );
}
