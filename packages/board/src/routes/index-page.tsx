/**
 * routes/index-page.tsx — SPEC-CONTENT-001 Slice B (T-012)
 *
 * 게시판 인덱스 페이지 — Document 목록을 렌더한다.
 * Slice A placeholder 를 실제 구현으로 교체.
 *
 * @MX:NOTE [AUTO]: Slice B RSC 구현. Slice C 에서 페이지네이션 / 카테고리 필터 / 검색 UI 추가 예정.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-010, REQ-CONTENT-020
 */
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';
import { listDocuments } from '../document.js';

export async function BoardIndexPage(props: ModuleRoutePageProps) {
  const docs = await listDocuments(
    { moduleInstanceId: props.instance.id, status: 'PUBLIC' },
    { prisma: props.prisma },
  );

  return (
    <main>
      <h1>{props.instance.name}</h1>
      {docs.length === 0 ? (
        <p>등록된 게시글이 없습니다.</p>
      ) : (
        <ul>
          {docs.map((doc) => (
            <li key={doc.id}>
              <a href={`/${props.instance.mid}/${doc.id}`}>{doc.title}</a>
            </li>
          ))}
        </ul>
      )}
      <a href={`/${props.instance.mid}/write`}>글쓰기</a>
    </main>
  );
}
