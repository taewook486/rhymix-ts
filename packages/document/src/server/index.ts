/**
 * packages/document/src/server/index.ts
 *
 * Server 레이어 barrel export — SPEC-DOCUMENT-001 Slice B.
 */
export { createDocumentRouter } from './router';
export type { TrpcBuilder } from './router';

export {
  createDocument,
  updateDocument,
  deleteDocument,
  publishDraft,
  unlockSecret,
} from './actions';

export type { ActionResult } from './actions';
