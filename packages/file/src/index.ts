export * from './attachment.js';
export * from './storage/types.js';
export { InMemoryStorage } from './storage/memory.js';
export { S3Storage } from './storage/s3.js';
export { LocalDiskStorage } from './storage/local-disk.js';
export { getStorage, getScanner, _resetStorageInstances } from './storage/factory.js';
export { NoopScanner } from './storage/scanner.js';
export { ClamAVScanner } from './storage/clamav.js';
export { assertMimeAllowed, assertSizeAllowed, UnsupportedMimeTypeError, FileTooLargeError } from './storage/mime.js';
export { signUploadToken, verifyUploadToken, InvalidUploadTokenError } from './storage/upload-token.js';
export { processImage, isImageMimeType } from './image-pipeline.js';
export type { ImageProcessResult } from './image-pipeline.js';
export { registerFileEventSubscribers, cascadeDeleteByDocumentId, cascadeDeleteByCommentId } from './events.js';
export type { FileEventSubscriberContext, FileEventEmitters } from './events.js';

// Admin functions
export {
  setCoverImage,
  clearCoverImage,
  listMyAttachments,
  listOrphans,
  purgeOrphans,
  cascadeRebuild,
  orphanCleanupTask,
  migrateStorage,
} from './admin.js';
export type { MigrateStorageOptions } from './admin.js';

// Server layer exports
export { createFileRouter } from './server/router.js';

// NOTE: Server Actions ('use server' files) are NOT exported from the main barrel for browser bundle safety
// Import directly from '@rhymix-ts/file/server/actions' for Server Actions usage
