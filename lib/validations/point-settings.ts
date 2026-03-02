/**
 * Point Settings Validation Schemas
 * Zod schemas for point settings validation
 */

import { z } from 'zod'

// WHW-040: 포인트 기본 설정
export const pointSettingsSchema = z.object({
  is_enabled: z.boolean(),
  point_name: z.string().min(1, '포인트 이름은 필수입니다').max(50, '포인트 이름은 50자 이하여야 합니다'),
  max_level: z.number().int('정수여야 합니다').min(1, '최소 1 이상이어야 합니다').max(100, '최대 100 이하여야 합니다'),
  level_icon_type: z.enum(['default', 'custom', 'none'], {
    errorMap: () => ({ message: '유효하지 않은 아이콘 타입입니다' }),
  }),
  level_icon_path: z.string().nullable().optional(),
  // WHW-041: 포인트 제한
  disable_download_on_low_point: z.boolean(),
  disable_read_on_low_point: z.boolean(),
  min_point_for_download: z.number().int().min(0, '0 이상이어야 합니다'),
  min_point_for_read: z.number().int().min(0, '0 이상이어야 합니다'),
})

export const pointSettingsUpdateSchema = pointSettingsSchema.partial()

// WHW-042: 포인트 규칙 (Point Rules)
export const pointRuleSchema = z.object({
  action: z.string().min(1, '액션은 필수입니다').max(100, '100자 이하여야 합니다'),
  name: z.string().min(1, '이름은 필수입니다').max(100, '100자 이하여야 합니다'),
  description: z.string().max(500, '설명은 500자 이하여야 합니다').nullable().optional(),
  point: z.number().int('정수여야 합니다'),
  revert_on_delete: z.boolean(),
  daily_limit: z.number().int().positive().nullable().optional(),
  per_content_limit: z.number().int().positive().nullable().optional(),
  except_notice: z.boolean(),
  except_admin: z.boolean(),
  is_active: z.boolean(),
})

export const pointRuleUpdateSchema = pointRuleSchema.partial()

// WHW-043: 레벨-그룹 연동 (Level-Group Mapping)
export const levelGroupMappingSchema = z.object({
  group_sync_mode: z.enum(['replace', 'add'], {
    errorMap: () => ({ message: '유효하지 않은 그룹 연동 방식입니다' }),
  }),
  point_decrease_mode: z.enum(['keep', 'demote'], {
    errorMap: () => ({ message: '유효하지 않은 포인트 감소 모드입니다' }),
  }),
})

export const levelGroupMappingUpdateSchema = levelGroupMappingSchema.partial()

export const levelGroupSchema = z.object({
  level: z.number().int().min(1, '레벨은 1 이상이어야 합니다').max(100, '레벨은 100 이하여야 합니다'),
  group_id: z.string().uuid('유효하지 않은 그룹 ID입니다').nullable(),
})

/**
 * Form Data Types
 */

export type PointSettingsFormData = z.infer<typeof pointSettingsSchema>
export type PointRuleFormData = z.infer<typeof pointRuleSchema>
export type LevelGroupMappingFormData = z.infer<typeof levelGroupMappingSchema>
export type LevelGroupFormData = z.infer<typeof levelGroupSchema>
