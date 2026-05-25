/**
 * routes/write-page.tsx — SPEC-CONTENT-001 Slice B (T-013) + REQ-CONTENT-130
 *
 * 글쓰기 페이지 Server Component.
 * 폼 렌더는 WriteBoardForm(클라이언트 컴포넌트)에 위임한다.
 * Server Action URL 은 apps/web 레이어에서 주입.
 *
 * @MX:NOTE [AUTO]: Slice B 글쓰기 폼. Server Action 은 apps/web/app/[mid]/write/page.tsx 에서 inline 으로 정의.
 * @MX:NOTE [AUTO]: REQ-CONTENT-130 — TiptapEditor 는 WriteBoardForm 클라이언트 컴포넌트를 통해 마운트됨.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-010 REQ-CONTENT-130
 */
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';
import { WriteBoardForm } from './write-form.js';

interface WriteBoardPageProps extends ModuleRoutePageProps {
  action: string; // Server Action URL (apps/web 레이어에서 주입)
}

export async function BoardWritePage(props: WriteBoardPageProps) {
  return (
    <main>
      <h1>{props.instance.name} — 글쓰기</h1>
      <WriteBoardForm
        action={props.action}
        moduleInstanceId={props.instance.id}
        cancelHref={`/${props.instance.mid}`}
      />
    </main>
  );
}
