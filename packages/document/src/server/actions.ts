/**
 * packages/document/src/server/actions.ts
 *
 * Next.js Server Actions — SPEC-DOCUMENT-001 Slice B (REQ-DOC-105).
 *
 * Server Actions는 RSC에서 직접 호출 가능한 서버 사이드 함수.
 * 클라이언트 컴포넌트에서 form 제출 등에 사용.
 *
 * @MX:NOTE [AUTO]: Server Actions는 tRPC와 별개의 인터페이스.
 * @MX:REASON: RSC form 제출에 최적화된 "use server" 진입점 제공.
 */
'use server';

import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import {
  createDocument as createDocumentDomain,
  updateDocument as updateDocumentDomain,
  deleteDocument as deleteDocumentDomain,
  BoardPermissionDeniedError,
  DocumentOwnershipError,
  ExtraVarsRequiredError,
  ExtraVarsNotConfiguredError,
} from '../document';

// ---------------------------------------------------------------------------
// ActionResult 타입
// ---------------------------------------------------------------------------

/**
 * Server Action의 결과 타입.
 * 성공 시 { ok: true; data: T }, 실패 시 { ok: false; error: string }.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// 세션 컨텍스트 헬퍼
// ---------------------------------------------------------------------------

/**
 * Server Action에서 세션을 가져온다.
 * TODO: NextAuth 또는 인증 패키지와 연동 필요.
 * 현재는 mock 구현으로 userId를 0으로 반환.
 */
async function getSession(): Promise<{ userId: number; isAdmin: boolean } | null> {
  // 실제 구현에서는 apps/web/lib/auth/config.ts의 auth()를 호출해야 함
  // 현재는 placeholder로 null 반환
  return null;
}

/**
 * Server Action에서 Prisma 클라이언트를 가져온다.
 */
async function getPrisma(): Promise<PrismaClient> {
  // 실제 구현에서는 apps/web/lib/db/prisma.ts의 prisma를 가져와야 함
  // 현재는 placeholder로 throw
  throw new Error('getPrisma not implemented - apps/web integration required');
}

// ---------------------------------------------------------------------------
// Actor 빌더
// ---------------------------------------------------------------------------

function buildActor(session: { userId: number; isAdmin: boolean }) {
  return {
    userId: session.userId,
    userGroupSrl: 1, // TODO: 그룹 정보 조회 로직 추가
    isAdmin: session.isAdmin,
  };
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * createDocument — 문서 생성 Server Action.
 *
 * @param input - 생성할 문서 정보
 * @returns ActionResult<Document>
 */
export async function createDocument(
  input: {
    boardId: number;
    title: string;
    content: string;
    status?: 'PUBLIC' | 'SECRET' | 'TEMP';
    categoryId?: number | null;
    tags?: string[];
    extraVars?: Record<string, unknown>;
  },
): Promise<ActionResult<{ id: number }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { ok: false, error: 'Unauthorized' };
    }

    const prisma = await getPrisma();

    const doc = await createDocumentDomain(
      {
        moduleInstanceId: input.boardId,
        authorId: session.userId,
        title: input.title,
        content: input.content,
        nickName: null,
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.extraVars !== undefined ? { extraVars: input.extraVars } : {}),
        actor: buildActor(session),
      },
      { prisma },
    );

    return { ok: true, data: { id: doc.id } };
  } catch (err) {
    if (err instanceof BoardPermissionDeniedError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof ExtraVarsRequiredError || err instanceof ExtraVarsNotConfiguredError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof z.ZodError) {
      return { ok: false, error: 'Invalid input: ' + err.message };
    }
    return { ok: false, error: 'Internal error' };
  }
}

/**
 * updateDocument — 문서 수정 Server Action.
 *
 * @param id - 수정할 문서 ID
 * @param input - 수정할 문서 정보
 * @returns ActionResult<Document>
 */
export async function updateDocument(
  id: number,
  input: {
    title?: string;
    content?: string;
    status?: 'PUBLIC' | 'SECRET' | 'TEMP';
    extraVars?: Record<string, unknown>;
  },
): Promise<ActionResult<{ id: number }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { ok: false, error: 'Unauthorized' };
    }

    const prisma = await getPrisma();

    const doc = await updateDocumentDomain(
      {
        id,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.extraVars !== undefined ? { extraVars: input.extraVars } : {}),
        actor: buildActor(session),
      },
      { prisma },
    );

    return { ok: true, data: { id: doc.id } };
  } catch (err) {
    if (err instanceof BoardPermissionDeniedError || err instanceof DocumentOwnershipError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof z.ZodError) {
      return { ok: false, error: 'Invalid input: ' + err.message };
    }
    return { ok: false, error: 'Internal error' };
  }
}

/**
 * deleteDocument — 문서 삭제 Server Action (soft delete).
 *
 * @param id - 삭제할 문서 ID
 * @returns ActionResult<void>
 */
export async function deleteDocument(id: number): Promise<ActionResult<void>> {
  try {
    const session = await getSession();
    if (!session) {
      return { ok: false, error: 'Unauthorized' };
    }

    const prisma = await getPrisma();

    await deleteDocumentDomain({ id, actor: buildActor(session) }, { prisma });

    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof BoardPermissionDeniedError || err instanceof DocumentOwnershipError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Internal error' };
  }
}

/**
 * publishDraft — 임시글 발행 Server Action.
 *
 * REQ-DOC-060~064 구현 후 완료 예정.
 *
 * @param documentId - 발행할 문서 ID
 * @returns ActionResult<Document>
 */
export async function publishDraft(
  documentId: number,
): Promise<ActionResult<{ id: number }>> {
  // TODO: Slice C backend - publishDraft 구현 필요
  return { ok: false, error: 'publishDraft not implemented yet - Slice C' };
}

/**
 * unlockSecret — 비밀글 잠금 해제 Server Action.
 *
 * REQ-DOC-050~055 구현 후 완료 예정.
 *
 * @param documentId - 문서 ID
 * @param password - 비밀번호
 * @returns ActionResult<{ token: string; expiresAt: Date }>
 */
export async function unlockSecret(
  documentId: number,
  password: string,
): Promise<ActionResult<{ token: string; expiresAt: Date }>> {
  // TODO: Slice C backend - unlockSecret 구현 필요
  return { ok: false, error: 'unlockSecret not implemented yet - Slice C' };
}
