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
 * MenuItem 버튼 이미지 참조형 스키마 — SPEC-LEGACY-PARITY-001 M3 (AC-SITE-011).
 *
 * 정합화된 저장 형태(design.md D1): `{"image": <file-storage 참조 키>, "alt"?}`.
 * strict 로 닫힌 집합을 만든다 — 구 {label, href, icon, target} 스타일 등
 * 정합화 외 형태는 parse 단계에서 거부된다 (strip 손실이 아닌 명시적 실패).
 */
export const menuButtonImageSchema = z
  .object({
    image: z.string().min(1),
    alt: z.string().optional(),
  })
  .strict();

/**
 * 이미지 참조형 (M3~) 또는 레거시 파일명 문자열 (D1 하위호환).
 * 레거시 문자열은 parse 시점에 `{"image": <문자열>}`로 정규화된다 — bundle을
 * 소비하는 쪽(apply 등)은 정규화된 형태만 다룬다 (정규화 지점의 단일화).
 *
 * serializer(toButtonImageRef)의 export 시점 검증도 이 union을 재사용한다
 * (SPEC-LEGACY-PARITY-001-FIX D3 방어 수리) — export가 통과시키는 값의
 * 집합과 import가 수용하는 집합이 같은 스키마로 정의된다.
 */
export const menuItemButtonSchema = z.union([
  menuButtonImageSchema,
  z.string().transform((s) => ({ image: s })),
]);

/** import 시 레거시 문자열을 포함해 참조형으로 정규화한 값 */
export type MenuButtonImageRef = z.infer<typeof menuButtonImageSchema>;

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
  normalBtn: menuItemButtonSchema.nullable().optional(),
  hoverBtn: menuItemButtonSchema.nullable().optional(),
  activeBtn: menuItemButtonSchema.nullable().optional(),
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
  /**
   * export 시점에 비적합 버튼 값으로 낙하한 건수 (D3 방어 수리).
   * 선택 필드 — 0건이면 생략. metadataSchema는 비-strict이라 기존 번들은
   * 그대로 parse되고 이 필드 없는 번들도 계속 수용된다 (양방향 호환).
   */
  droppedButtonImages: z.number().int().min(0).optional(),
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
