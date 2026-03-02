import { z } from 'zod'

// Editor Settings Zod Schema (matching DB schema from migration 021_editor_settings.sql)

// WHW-030: Editor Basic Settings
export const editorBasicSettingsSchema = z.object({
  editor_skin: z.enum(['ckeditor', 'simpleeditor', 'textarea']).default('ckeditor'),
  color_scheme: z.enum(['mondo', 'mondo-dark', 'mondo-lisa']).default('mondo'),
  editor_height: z
    .number()
    .int()
    .min(100, '높이는 최소 100px 이상이어야 합니다')
    .max(2000, '높이는 최대 2000px 이하여야 합니다')
    .default(300),
  toolbar_set: z.enum(['basic', 'advanced']).default('basic'),
  hide_toolbar: z.boolean().default(false),
})

// WHW-031: Font Settings
export const fontSettingsSchema = z.object({
  font_family: z.string().default('sans-serif'),
  font_size: z
    .number()
    .int()
    .min(8, '폰트 크기는 최소 8px 이상이어야 합니다')
    .max(72, '폰트 크기는 최대 72px 이하여야 합니다')
    .default(14),
  line_height: z
    .number()
    .min(1.0, '줄 높이는 최소 1.0 이상이어야 합니다')
    .max(3.0, '줄 높이는 최대 3.0 이하여야 합니다')
    .default(1.5),
})

// WHW-032: Editor Toolbar Tools
export const toolbarToolsSchema = z.object({
  enabled_tools: z.array(z.string()).default([]),
})

// Complete Editor Settings Schema
export const editorSettingsSchema = editorBasicSettingsSchema
  .merge(fontSettingsSchema)
  .merge(toolbarToolsSchema)

export type EditorSettings = z.infer<typeof editorSettingsSchema>

// API Response types
export interface EditorSettingsResponse {
  success: boolean
  data?: EditorSettings
  error?: string
  message?: string
}

// Form data type (matches EditorSettings but with optional fields for partial updates)
export type EditorSettingsFormData = Partial<EditorSettings>

// Validation schema for form updates (all fields optional)
export const editorSettingsUpdateSchema = editorSettingsSchema.partial()

// Available toolbar tools by category
export const TOOLBAR_TOOL_CATEGORIES = {
  textFormatting: {
    label: '텍스트 서식',
    tools: [
      { id: 'bold', label: '굵게' },
      { id: 'italic', label: '기울임' },
      { id: 'underline', label: '밑줄' },
      { id: 'strike', label: '취소선' },
      { id: 'subscript', label: '아래 첨자' },
      { id: 'superscript', label: '위 첨자' },
    ],
  },
  fontSize: {
    label: '폰트 크기',
    tools: [
      { id: 'fontSize', label: '폰트 크기' },
      { id: 'fontFamily', label: '폰트 종류' },
    ],
  },
  colors: {
    label: '색상',
    tools: [
      { id: 'foreColor', label: '글자 색상' },
      { id: 'hiliteColor', label: '형광펜' },
      { id: 'backColor', label: '배경색' },
    ],
  },
  alignment: {
    label: '정렬',
    tools: [
      { id: 'justifyLeft', label: '왼쪽 정렬' },
      { id: 'justifyCenter', label: '가운데 정렬' },
      { id: 'justifyRight', label: '오른쪽 정렬' },
      { id: 'justifyFull', label: '양쪽 정렬' },
    ],
  },
  lists: {
    label: '목록',
    tools: [
      { id: 'bulletedList', label: '글머리 기호' },
      { id: 'numberedList', label: '번호 매기기' },
    ],
  },
  links: {
    label: '링크',
    tools: [
      { id: 'link', label: '링크 삽입' },
      { id: 'unlink', label: '링크 제거' },
    ],
  },
  media: {
    label: '미디어',
    tools: [
      { id: 'image', label: '이미지' },
      { id: 'table', label: '테이블' },
    ],
  },
  undoRedo: {
    label: '실행 취소/다시 실행',
    tools: [
      { id: 'undo', label: '실행 취소' },
      { id: 'redo', label: '다시 실행' },
    ],
  },
} as const

// Available font families
export const FONT_FAMILIES = [
  { value: 'sans-serif', label: 'Sans Serif (기본)' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Arial Black', label: 'Arial Black' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Lucida Console', label: 'Lucida Console' },
  { value: 'Palatino Linotype', label: 'Palatino Linotype' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Nanum Gothic', label: '나눔고딕' },
  { value: 'Nanum Myeongjo', label: '나눔명조' },
  { value: 'Malgun Gothic', label: '맑은 고딕' },
  { value: 'Gulim', label: '굴림' },
  { value: 'Batang', label: '바탕' },
  { value: 'Dotum', label: '돋움' },
] as const
