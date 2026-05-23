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
import { BoardConfigSchema, defaultBoardConfig, type BoardConfig } from './config.js';
import { onInstallBoard } from './on-install.js';
import { BoardIndexPage } from './routes/index-page.js';

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
  },
  cacheTags: (instanceId) => [
    `board:${instanceId}`,
    `documents:board:${instanceId}`,
  ],
};

export { BoardConfigSchema, defaultBoardConfig };
export type { BoardConfig };

// SPEC-CONTENT-001 Slice B — 도메인 함수 re-export (apps/web tRPC 라우터가 사용)
export {
  createDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  getDocument,
  BoardPermissionDeniedError,
  DocumentOwnershipError,
  encodeCursor,
  decodeCursor,
} from './document.js';
export type { DocumentListResult } from './document.js';

export {
  createComment,
  listComments,
  deleteComment,
} from './comment.js';

export {
  canPerformAction,
} from './permissions.js';
export type { BoardAction, PermissionContext } from './permissions.js';

// SPEC-CONTENT-001 Slice C — Category CRUD + Search 도메인 함수
export {
  createCategory,
  listCategoryTree,
  updateCategory,
  deleteCategory,
  incrementDocumentCount,
  buildCategoryTree,
  CategoryHasChildrenError,
} from './category.js';
export type { CategoryNode } from './category.js';

export {
  searchDocuments,
  searchTags,
} from './search.js';
export type { SearchDocumentsInput, SearchDocumentsResult } from './search.js';

// SPEC-CONTENT-001 Slice D — Vote + Report + Trash + History
export {
  voteDocument,
  getVoteCount,
} from './vote.js';
export type { VoteDocumentInput, VoteResult } from './vote.js';

export {
  reportDocument,
  resolveReport,
  listReports,
  DuplicateReportError,
} from './report.js';
export type { ReportDocumentInput, AdminActor, ListReportsInput, ListReportsResult } from './report.js';

export {
  softDeleteDocument,
  restoreDocument,
  purgeDocument,
  listTrash,
  TrashNotFoundError,
  TrashExpiredError,
} from './trash.js';
export type { SoftDeleteResult, TrashWithDocument, ListTrashResult } from './trash.js';

export {
  recordUpdate,
  getUpdateHistory,
} from './history.js';
export type { RecordUpdateInput } from './history.js';
