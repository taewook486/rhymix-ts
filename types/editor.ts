// Editor module type definitions

import type { UUID, TIMESTAMPTZ } from '@/lib/supabase/database.types'

// =====================================================
// Editor Settings Types
// =====================================================

/**
 * Editor skin type
 * - ckeditor: Full-featured WYSIWYG editor
 * - simpleeditor: Lightweight editor with basic formatting
 * - textarea: Plain text input
 */
export type EditorSkin = 'ckeditor' | 'simpleeditor' | 'textarea'

/**
 * Color scheme for editor UI
 * - mondo: Light theme
 * - mondo-dark: Dark theme
 * - mondo-lisa: High contrast theme
 */
export type ColorScheme = 'mondo' | 'mondo-dark' | 'mondo-lisa'

/**
 * Toolbar preset configuration
 * - basic: Essential formatting tools
 * - advanced: Full formatting and media tools
 */
export type ToolbarSet = 'basic' | 'advanced'

/**
 * Global editor settings configuration
 * Single-row table for site-wide editor settings
 */
export interface EditorSettings {
  id: UUID

  // WHW-030: Editor Basic Settings
  editor_skin: EditorSkin
  color_scheme: ColorScheme
  editor_height: number // Height in pixels (100-2000)
  toolbar_set: ToolbarSet
  hide_toolbar: boolean

  // WHW-031: Font Settings
  font_family: string
  font_size: number // Font size in points (8-72)
  line_height: number // Line height multiplier (1.0-3.0)

  // WHW-032: Editor Toolbar Tools
  enabled_tools: string[] // Array of enabled tool identifiers

  // Timestamps
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

// =====================================================
// Editor Tool Definitions
// =====================================================

/**
 * Available toolbar tools for editor configuration
 */
export const EDITOR_TOOLS = {
  // Text formatting
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strike: 'Strikethrough',
  subscript: 'Subscript',
  superscript: 'Superscript',

  // Font controls
  fontSize: 'Font Size',
  fontFamily: 'Font Family',
  textColor: 'Text Color',
  backgroundColor: 'Background Color',

  // Paragraph formatting
  alignment: 'Text Alignment',
  justifyLeft: 'Align Left',
  justifyCenter: 'Align Center',
  justifyRight: 'Align Right',
  justifyBlock: 'Justify',
  indent: 'Increase Indent',
  outdent: 'Decrease Indent',

  // Lists
  bulletedList: 'Bulleted List',
  numberedList: 'Numbered List',

  // Links and media
  link: 'Insert Link',
  unlink: 'Remove Link',
  image: 'Insert Image',
  video: 'Insert Video',
  file: 'Insert File',

  // Tables
  table: 'Insert Table',

  // Code
  code: 'Insert Code Block',
  codeSnippet: 'Insert Code Snippet',

  // Special
  horizontalRule: 'Horizontal Rule',
  blockquote: 'Block Quote',
  specialChar: 'Special Characters',

  // Editing
  undo: 'Undo',
  redo: 'Redo',
  removeFormat: 'Remove Formatting',
  copy: 'Copy',
  cut: 'Cut',
  paste: 'Paste',

  // Document structure
  format: 'Paragraph Format',
  heading: 'Heading',
  styles: 'Styles',

  // Utilities
  maximize: 'Maximize Editor',
  showBlocks: 'Show Blocks',
  source: 'View Source',
  preview: 'Preview',
  print: 'Print',

  // Accessibility
  accessibilityHelp: 'Accessibility Help',
} as const

export type EditorTool = keyof typeof EDITOR_TOOLS

/**
 * Default toolbar configurations
 */
export const DEFAULT_TOOLBARS = {
  basic: [
    'bold', 'italic', 'underline', 'strike', '|',
    'fontSize', 'fontFamily', '|',
    'link', 'unlink'
  ] as string[],

  advanced: [
    'undo', 'redo', '|',
    'format', 'heading', '|',
    'bold', 'italic', 'underline', 'strike', '|',
    'textColor', 'backgroundColor', '|',
    'alignment', '|',
    'bulletedList', 'numberedList', '|',
    'link', 'unlink', 'image', 'video', '|',
    'table', '|',
    'code', 'blockquote', '|',
    'source', 'maximize'
  ] as string[]
} as const

// =====================================================
// Editor Input/Output Types
// =====================================================

/**
 * Input type for updating editor settings
 */
export interface UpdateEditorSettingsInput {
  editor_skin?: EditorSkin
  color_scheme?: ColorScheme
  editor_height?: number
  toolbar_set?: ToolbarSet
  hide_toolbar?: boolean
  font_family?: string
  font_size?: number
  line_height?: number
  enabled_tools?: string[]
}

/**
 * Editor content output with metadata
 */
export interface EditorContentOutput {
  content: string // Raw HTML content
  content_text: string // Plain text version
  word_count: number
  character_count: number
  has_images: boolean
  has_videos: boolean
  has_links: boolean
  has_tables: boolean
}

// =====================================================
// Editor Validation Types
// =====================================================

/**
 * Editor configuration validation constraints
 */
export const EDITOR_CONSTRAINTS = {
  editor_height: {
    min: 100,
    max: 2000,
    default: 300
  },
  font_size: {
    min: 8,
    max: 72,
    default: 14
  },
  line_height: {
    min: 1.0,
    max: 3.0,
    default: 1.5
  }
} as const

// =====================================================
// Editor Utility Types
// =====================================================

/**
 * Editor mode for different contexts
 */
export type EditorMode = 'create' | 'edit' | 'reply' | 'comment'

/**
 * Editor context configuration
 */
export interface EditorContext {
  mode: EditorMode
  board_id?: UUID
  post_id?: UUID
  comment_id?: UUID
  parent_id?: UUID
  initial_content?: string
  placeholder?: string
  max_length?: number
  allow_files?: boolean
  allow_images?: boolean
  allow_videos?: boolean
}
