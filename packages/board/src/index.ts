/**
 * index.ts — SPEC-CONTENT-001 Slice A
 *
 * board 모듈 정의 (ModuleDefinition<BoardConfig>).
 *
 * @MX:ANCHOR [AUTO]: board 모듈의 단일 진입점.
 * @MX:REASON: registerModule, createModuleInstance, [mid]/page.tsx (Slice B), admin.module.create,
 *             lib/modules/register.ts 등 5개 이상의 호출 지점이 이 정의를 참조한다.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-001
 */
import type { ModuleDefinition } from '@rhymix-ts/core/modules';
import type { z } from 'zod';
import { BoardConfigSchema, defaultBoardConfig, type BoardConfig } from './config';
import { onInstallBoard } from './on-install';
import { BoardIndexPage } from './routes/index-page';
import { BoardViewPage } from './routes/view-page';
import { BoardEditPage } from './routes/edit-page';

// re-export shim for backward compatibility (SPEC-DOCUMENT-001 REQ-DOC-126)
// To be removed by SPEC-BOARD-CRUD-001.
export * from '@rhymix-ts/document';

export const boardModule: ModuleDefinition<BoardConfig> = {
  code: 'board',
  displayName: 'Board',
  description: '게시판 — 글쓰기, 댓글, 첨부, 카테고리, 검색을 지원하는 표준 모듈',
  // ZodObject 의 input 타입이 optional fields 를 포함하므로 ZodType<BoardConfig> 로 캐스트
  configSchema: BoardConfigSchema as z.ZodType<BoardConfig>,
  defaultConfig: defaultBoardConfig,
  onInstall: onInstallBoard,
  routes: {
    index: BoardIndexPage,
    view: BoardViewPage as unknown as import('@rhymix-ts/core/modules').ModuleRouteIndex,
    edit: BoardEditPage as unknown as import('@rhymix-ts/core/modules').ModuleRouteIndex,
  },
  cacheTags: (instanceId) => [
    `board:${instanceId}`,
    `documents:board:${instanceId}`,
  ],
};

export { BoardConfigSchema, defaultBoardConfig };
export type { BoardConfig };

// edit-page: apps/web 에서 직접 import 가능하도록 re-export
export { BoardEditPage } from './routes/edit-page';
export type { BoardEditPageProps } from './routes/edit-page';

// @rhymix-ts/document 의 4-grant BoardAction 을 7-grant 버전으로 덮어씀 (SPEC-BOARD-CRUD-001 REQ-BOARD-073)
export type { BoardAction, PermissionContext } from './permissions';
export { canPerformAction } from './permissions';

// re-export comment functions from @rhymix-ts/comment (SPEC-COMMENT-001)
export * from '@rhymix-ts/comment';

// permissions, category: 이미 export * from '@rhymix-ts/document'로 re-export됨

// SPEC-CONTENT-001 Slice E — File Attachments + Rate Limiting
// Moved to @rhymix-ts/file package (SPEC-FILE-001 Slice A)

// rate-limit: 이미 export * from '@rhymix-ts/document'로 re-export됨
