/**
 * Point Settings Types
 * WHW-040: Point Basic Settings
 * WHW-041: Point Restrictions
 */

export interface PointSettings {
  id: string
  // WHW-040: 포인트 기본 설정
  is_enabled: boolean
  point_name: string
  max_level: number
  level_icon_type: 'default' | 'custom' | 'none'
  level_icon_path: string | null
  // WHW-041: 포인트 제한
  disable_download_on_low_point: boolean
  disable_read_on_low_point: boolean
  min_point_for_download: number
  min_point_for_read: number
  created_at: string
  updated_at: string
}

export type PointSettingsUpdate = Partial<
  Omit<PointSettings, 'id' | 'created_at' | 'updated_at'>
>

/**
 * Point Rule Types
 * WHW-042: Point Award Rules
 */

export interface PointRule {
  id: string
  action: string
  name: string
  description: string | null
  point: number
  revert_on_delete: boolean
  daily_limit: number | null
  per_content_limit: number | null
  except_notice: boolean
  except_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PointRuleCreate = Omit<PointRule, 'id' | 'created_at' | 'updated_at'>
export type PointRuleUpdate = Partial<PointRuleCreate>

// Predefined actions for UI
export const POINT_ACTIONS = {
  signup: { name: '회원가입', category: 'member' },
  signup_referred: { name: '추천인 회원가입', category: 'member' },
  login: { name: '로그인', category: 'member' },
  insert_document: { name: '글 작성', category: 'content' },
  delete_document: { name: '글 삭제', category: 'content' },
  insert_comment: { name: '댓글 작성', category: 'content' },
  delete_comment: { name: '댓글 삭제', category: 'content' },
  upload_file: { name: '파일 업로드', category: 'file' },
  download_file: { name: '파일 다운로드', category: 'file' },
  delete_file: { name: '파일 삭제', category: 'file' },
  read_document: { name: '글 열람', category: 'content' },
  voted: { name: '추천받음', category: 'vote' },
  blamed: { name: '비추천받음', category: 'vote' },
  voter: { name: '추천함', category: 'vote' },
  blamer: { name: '비추천함', category: 'vote' },
  comment_voted: { name: '댓글 추천받음', category: 'vote' },
  comment_blamed: { name: '댓글 비추천받음', category: 'vote' },
  scrap: { name: '스크랩', category: 'content' },
  report: { name: '신고함', category: 'content' },
  reported: { name: '신고당함', category: 'content' },
} as const

export type PointAction = keyof typeof POINT_ACTIONS

export type PointCategory =
  | 'member'
  | 'content'
  | 'file'
  | 'vote'

/**
 * Level-Group Mapping Types
 * WHW-043: Level-Group Linkage
 */

export interface LevelGroupMapping {
  id: string
  group_sync_mode: 'replace' | 'add'
  point_decrease_mode: 'keep' | 'demote'
  created_at: string
  updated_at: string
}

export interface LevelGroup {
  id: string
  level: number
  group_id: string | null
  group?: { id: string; name: string }
  created_at: string
}

export type LevelGroupMappingUpdate = Partial<
  Omit<LevelGroupMapping, 'id' | 'created_at' | 'updated_at'>
>

export type LevelGroupUpdate = {
  level: number
  group_id: string | null
}

/**
 * Point Log Types (Audit Trail)
 */

export interface PointLog {
  id: string
  user_id: string
  action: string
  point: number
  balance_after: number
  reference_type: string | null
  reference_id: string | null
  description: string | null
  ip_address: string | null
  created_at: string
}

/**
 * Level Calculation Utilities
 */

export function calculateLevel(point: number): number {
  if (point < 100) return 1
  return Math.floor(Math.sqrt(point / 100))
}

export function getPointsForLevel(level: number): number {
  return level * level * 100
}

export function getPointsToNextLevel(currentPoint: number): number {
  const currentLevel = calculateLevel(currentPoint)
  const nextLevel = currentLevel + 1
  return getPointsForLevel(nextLevel) - currentPoint
}

/**
 * Level requirements for reference:
 * Level 1: 100 points
 * Level 2: 400 points
 * Level 3: 900 points
 * Level 10: 10,000 points
 * Level 20: 40,000 points
 * Level 30: 90,000 points
 */
