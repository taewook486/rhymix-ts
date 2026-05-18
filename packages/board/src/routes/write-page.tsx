/**
 * routes/write-page.tsx — SPEC-CONTENT-001 Slice B (T-013)
 *
 * 글쓰기 페이지 Server Component.
 * form 렌더만 담당 — Server Action 은 apps/web 레이어에서 주입.
 *
 * @MX:NOTE [AUTO]: Slice B 글쓰기 폼. Server Action 은 apps/web/app/[mid]/write/page.tsx 에서 inline 으로 정의.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-010
 */
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';

interface WriteBoardPageProps extends ModuleRoutePageProps {
  action: string; // Server Action URL (apps/web 레이어에서 주입)
}

export async function BoardWritePage(props: WriteBoardPageProps) {
  return (
    <main>
      <h1>{props.instance.name} — 글쓰기</h1>
      <form method="POST" action={props.action}>
        <input type="hidden" name="moduleInstanceId" value={props.instance.id} />
        <div>
          <label htmlFor="title">제목</label>
          <input id="title" name="title" type="text" required maxLength={200} />
        </div>
        <div>
          <label htmlFor="content">내용</label>
          <textarea id="content" name="content" required rows={10} />
        </div>
        <button type="submit">작성</button>
        <a href={`/${props.instance.mid}`}>취소</a>
      </form>
    </main>
  );
}
