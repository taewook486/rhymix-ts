/**
 * packages/file/src/server/index.ts
 *
 * Server 레이어 barrel export.
 *
 * @MX:NOTE [AUTO]: 'use server' 파일 (actions.ts)은 이 barrel에서 재내보기하지 않음.
 * @MX:REASON: Browser bundle 안전성 — Server Actions은 직접 import해야 함.
 */

export { createFileRouter } from './router';

// NOTE: Do NOT re-export actions.ts here — 'use server' files should be imported directly
