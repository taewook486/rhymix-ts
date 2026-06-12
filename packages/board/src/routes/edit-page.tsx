/**
 * routes/edit-page.tsx — SPEC-BOARD-CRUD-001 (REQ-BOARD-053, REQ-BOARD-054)
 *
 * 게시판 문서 수정 폼 RSC 컴포넌트.
 * 작성자 또는 관리자만 접근 가능.
 * prisma 는 apps/web 레이어에서 주입됨 — 직접 import 금지.
 *
 * @MX:NOTE [AUTO]: write-page.tsx 와 동일한 prisma 주입 패턴. 수정 시에는 기존 문서 내용을 미리 채운다.
 * @MX:SPEC: SPEC-BOARD-CRUD-001 REQ-BOARD-053, REQ-BOARD-054
 */
import React from 'react';
import type { PrismaClient } from '@prisma/client';
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';
import { getDocument } from '@rhymix-ts/document';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BoardEditPageProps extends ModuleRoutePageProps {
  /** 수정할 문서 ID */
  documentId: number;
  /** apps/web 에서 주입되는 Prisma 클라이언트 */
  prisma: PrismaClient;
  /** 현재 세션 — null이면 비로그인 */
  session: { user: { id: number; isAdmin: boolean } } | null;
  /** 수정 완료 후 redirect 처리용 Server Action */
  updateAction: (formData: FormData) => Promise<void>;
}

// ---------------------------------------------------------------------------
// 컴포넌트
// ---------------------------------------------------------------------------

/**
 * 게시판 문서 수정 폼.
 * 기존 문서 제목/내용을 미리 채워 렌더한다.
 */
export async function BoardEditPage({
  instance,
  documentId,
  prisma,
  session,
  updateAction,
}: BoardEditPageProps) {
  // 문서 조회
  const doc = await getDocument(documentId, { prisma });
  if (!doc) {
    return (
      <main>
        <p>문서를 찾을 수 없습니다.</p>
      </main>
    );
  }

  // 소유권 + 관리자 가드
  const userId = session?.user.id;
  const isAdmin = !!session?.user.isAdmin;
  const isAuthor = userId != null && doc.authorId === userId;

  if (!isAuthor && !isAdmin) {
    return (
      <main>
        <p>수정 권한이 없습니다.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{instance.name} — 글수정</h1>
      <form action={updateAction}>
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="moduleInstanceId" value={instance.id} />
        <div>
          <label htmlFor="title">제목</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={doc.title ?? ''}
          />
        </div>
        <div>
          <label htmlFor="content">내용</label>
          <textarea id="content" name="content" required rows={10} defaultValue={doc.content ?? ''} />
        </div>
        {/* 파일 첨부 — Phase 3에서 활성화 (SPEC-FILE-001) */}
        <div style={{ opacity: 0.4, pointerEvents: 'none' }}>
          <label>파일 첨부 (파일 첨부는 Phase 3에서 활성화됩니다)</label>
          <input type="file" disabled />
        </div>
        <button type="submit">수정 완료</button>
        <a href={`/${instance.mid}/${documentId}`}>취소</a>
      </form>
    </main>
  );
}
