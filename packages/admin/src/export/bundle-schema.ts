/**
 * Admin Export/Import Bundle Schema — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * exportFormatVersion, SUPPORTED_VERSIONS, adminExportBundleSchema,
 * ExportRequest, ImportDecisions 정의.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-EXPORT-001~005
 */

import { z } from 'zod';

/**
 * export format semver — MAJOR.MINOR.PATCH
 * MAJOR 호환성: 1.x accepts 1.*, rejects 2.* and 0.*
 */
export const exportFormatVersion = '1.0.0';

/**
 * MAJOR-match 호환성 체크용 배열
 * 1.0.0 → ["1.0.0"]
 * 나중에 1.1.0 추가 시: ["1.0.0", "1.1.0"]
 */
export const SUPPORTED_VERSIONS = ['1.0.0'] as const;

/**
 * MenuItem JSON 필드 스키마
 * normalBtn, hoverBtn, activeBtn는 JSON 형태로 저장됨
 */
const menuItemButtonSchema = z.object({
  label: z.string().optional(),
  href: z.string().optional(),
  icon: z.string().optional(),
  target: z.string().optional(),
});

/**
 * MenuItem 스키마 (내부용)
 */
const menuItemSchema = z.object({
  id: z.number().int().positive(),
  menuId: z.number().int().positive(),
  parentId: z.number().int().positive().nullable(),
  title: z.string().min(1),
  listOrder: z.number().int().min(0),
  url: z.string().nullable(),
  normalBtn: menuItemButtonSchema.partial().optional(),
  hoverBtn: menuItemButtonSchema.partial().optional(),
  activeBtn: menuItemButtonSchema.partial().optional(),
  expandable: z.boolean().optional(),
  exportKey: z.string(), // "menu:{title}" 형식
  parentExportKey: z.string().nullable(),
});

/**
 * Menu 스키마
 */
const menuSchema = z.object({
  id: z.number().int().positive(),
  siteId: z.number().int().positive(),
  title: z.string().min(1),
  isAdminMenu: z.boolean(),
  listOrder: z.number().int().min(0),
  exportKey: z.string(), // "menu:{title}" 형식
  items: z.array(menuItemSchema),
});

/**
 * ModuleInstance 스키마
 * menuId, layoutId는 참조 형태로 변환됨
 */
const moduleInstanceSchema = z.object({
  id: z.number().int().positive(),
  siteId: z.number().int().positive(),
  moduleCode: z.string().min(1),
  mid: z.string().min(1).max(80),
  name: z.string().min(1),
  config: z.unknown().optional(),
  // 참조 형태로 변환
  menuRef: z
    .object({
      type: z.literal('menuRef'),
      title: z.string(),
    })
    .optional(),
  layoutRef: z
    .object({
      type: z.literal('layoutRef'),
      name: z.string(),
    })
    .optional(),
  exportKey: z.string(), // "module:{mid}" 형식
});

/**
 * Document 스키마
 */
const documentSchema = z.object({
  id: z.number().int().positive(),
  siteId: z.number().int().positive(),
  mid: z.string(), // module instance mid
  moduleDocumentId: z.string().optional(),
  title: z.string().min(1),
  content: z.string(),
  published: z.boolean(),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  exportKey: z.string(), // "document:{mid}:{id}" 형식
});

/**
 * Comment 스키마
 */
const commentSchema = z.object({
  id: z.number().int().positive(),
  siteId: z.number().int().positive(),
  documentId: z.number().int().positive(),
  mid: z.string(), // module instance mid
  content: z.string(),
  authorMemberId: z.number().int().positive().nullable(),
  authorName: z.string().nullable(),
  authorEmail: z.string().email().nullable(),
  isSecret: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  exportKey: z.string(), // "comment:{mid}:{id}" 형식
  documentExportKey: z.string(), // 참조하는 문서의 exportKey
});

/**
 * SiteSettings 스키마
 */
const siteSettingsSchema = z.object({
  siteId: z.number().int().positive(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  defaultLanguage: z.string().optional(),
  timezone: z.string().optional(),
  // 기타 settings JSON 필드 (선택적)
  meta: z.record(z.unknown()).optional(),
});

/**
 * 메타데이터 블록 스키마
 */
const metadataSchema = z.object({
  version: z.string(),
  exportedAt: z.coerce.date(),
  exportedBy: z.object({
    actorId: z.number().int().positive(),
    nickname: z.string(),
  }),
  sourceSiteId: z.number().int().positive(),
  sourceSiteTitle: z.string().optional(),
  format: z.enum(['full', 'partial']),
  selection: z.object({
    menu: z.boolean(),
    moduleInstances: z.boolean(),
    documents: z.object({
      include: z.boolean(),
      mids: z.array(z.string()).optional(),
    }),
    comments: z.object({
      include: z.boolean(),
      mids: z.array(z.string()).optional(),
    }),
    siteSettings: z.boolean(),
  }),
  entityCounts: z.object({
    menus: z.number().int().min(0),
    menuItems: z.number().int().min(0),
    moduleInstances: z.number().int().min(0),
    documents: z.number().int().min(0),
    comments: z.number().int().min(0),
  }),
  bundleSizeBytes: z.number().int().min(0),
});

/**
 * 전체 AdminExportBundle 스키마
 */
export const adminExportBundleSchema = z.object({
  metadata: metadataSchema,
  menus: z.array(menuSchema).optional(),
  moduleInstances: z.array(moduleInstanceSchema).optional(),
  documents: z.array(documentSchema).optional(),
  comments: z.array(commentSchema).optional(),
  siteSettings: siteSettingsSchema.optional(),
});

/**
 * ExportRequest 스키마 — create export API input
 */
export const exportRequestSchema = z.object({
  siteId: z.number().int().positive(),
  menu: z.boolean().default(false),
  moduleInstances: z.boolean().default(false),
  documents: z
    .object({
      include: z.boolean().default(false),
      mids: z.array(z.string()).optional(),
    })
    .default({ include: false }),
  comments: z
    .object({
      include: z.boolean().default(false),
      mids: z.array(z.string()).optional(),
    })
    .default({ include: false }),
  siteSettings: z.boolean().default(false),
  minify: z.boolean().optional().default(false),
});

/**
 * ImportDecisions 타입 — 각 exportKey에 대한 결정
 */
export type ImportDecisions = Record<
  string,
  'overwrite' | 'skipConflict' | 'abort'
>;

/**
 * 타입 추출
 */
export type AdminExportBundle = z.infer<typeof adminExportBundleSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
