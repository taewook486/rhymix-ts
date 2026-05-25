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
} from './document';
export type { DocumentListResult } from './document';

export {
  createComment,
  listComments,
  deleteComment,
} from './comment';

export {
  canPerformAction,
} from './permissions';
export type { BoardAction, PermissionContext } from './permissions';

// SPEC-CONTENT-001 Slice C — Category CRUD + Search 도메인 함수
export {
  createCategory,
  listCategoryTree,
  updateCategory,
  deleteCategory,
  incrementDocumentCount,
  buildCategoryTree,
  CategoryHasChildrenError,
} from './category';
export type { CategoryNode } from './category';

export {
  searchDocuments,
  searchTags,
} from './search';
export type { SearchDocumentsInput, SearchDocumentsResult } from './search';

// SPEC-CONTENT-001 Slice D — Vote + Report + Trash + History
export {
  voteDocument,
  getVoteCount,
} from './vote';
export type { VoteDocumentInput, VoteResult } from './vote';

export {
  reportDocument,
  resolveReport,
  listReports,
  DuplicateReportError,
} from './report';
export type { ReportDocumentInput, AdminActor, ListReportsInput, ListReportsResult } from './report';

export {
  softDeleteDocument,
  restoreDocument,
  purgeDocument,
  listTrash,
  TrashNotFoundError,
  TrashExpiredError,
} from './trash';
export type { SoftDeleteResult, TrashWithDocument, ListTrashResult } from './trash';

export {
  recordUpdate,
  getUpdateHistory,
} from './history';
export type { RecordUpdateInput } from './history';

// SPEC-CONTENT-001 Slice E — File Attachments + Rate Limiting
export {
  requestUpload,
  completeUpload,
  deleteAttachment,
  listAttachments,
  UnsupportedMimeTypeError,
  FileTooLargeError,
  InvalidUploadTokenError,
  UploadHeadMismatchError,
  VirusDetectedError,
  AttachmentOwnershipError,
} from './attachment';
export type { RequestUploadInput, RequestUploadResult, CompleteUploadInput } from './attachment';

export {
  checkRateLimit,
  recordAttempt,
  resolveLimit,
  RateLimitedError,
  RATE_LIMITS,
} from './rate-limit';
export type { ContentEndpoint, RateLimitConfig } from './rate-limit';

export { NoopScanner, FakeMalwareScanner } from './storage/scanner';
export { ClamAVScanner, ClamAVConnectionError } from './storage/clamav';
export type { ClamAVScannerOptions } from './storage/clamav';
export { InMemoryStorage } from './storage/memory';
export { S3Storage } from './storage/s3';
export type { FileStorage, VirusScanner } from './storage/types';

// SPEC-CONTENT-001 Slice F — Custom Fields
export {
  listExtraKeys,
  createExtraKey,
  updateExtraKey,
  deleteExtraKey,
  reorderExtraKeys,
  ExtraKeyDuplicateNameError,
  ExtraKeyOptionsRequiredError,
} from './extra-keys';
export type { ExtraKeyOptions, CreateExtraKeyInput, UpdateExtraKeyInput } from './extra-keys';

export {
  buildExtraVarsSchema,
  evictExtraVarsSchemaCache,
} from './extra-vars-schema';

export {
  ExtraVarsRequiredError,
  ExtraVarsNotConfiguredError,
} from './document';
