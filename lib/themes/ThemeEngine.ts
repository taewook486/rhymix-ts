/**
 * Theme Engine
 * Manages theme definitions and utilities
 */

export interface ThemeDefinition {
  name: string
  title: string
  description?: string
  version?: string
  author?: string
  screenshotUrl?: string
  isResponsive?: boolean
  supportsDarkMode?: boolean
  defaultConfig: Record<string, any>
  configSchema: Record<string, { type: string; label: string; default?: any }>
}

export const themeDefinitions: ThemeDefinition[] = [
  {
    name: 'default',
    title: 'Default',
    description: '기본 테마',
    version: '1.0.0',
    author: 'Rhymix',
    isResponsive: true,
    supportsDarkMode: true,
    defaultConfig: {
      primary_color: '#3b82f6',
      secondary_color: '#8b5cf6',
      background_color: '#ffffff',
      font_family: 'system-ui, -apple-system, sans-serif',
      border_radius: '0.5rem',
      custom_css: '',
    },
    configSchema: {
      primary_color: { type: 'color', label: 'Primary Color', default: '#3b82f6' },
      secondary_color: { type: 'color', label: 'Secondary Color', default: '#8b5cf6' },
      background_color: { type: 'color', label: 'Background Color', default: '#ffffff' },
      font_family: { type: 'text', label: 'Font Family', default: 'system-ui, -apple-system, sans-serif' },
      border_radius: { type: 'text', label: 'Border Radius', default: '0.5rem' },
      custom_css: { type: 'textarea', label: 'Custom CSS', default: '' },
    },
  },
  {
    name: 'dark',
    title: 'Dark',
    description: '다크 모드 테마',
    version: '1.0.0',
    author: 'Rhymix',
    isResponsive: true,
    supportsDarkMode: true,
    defaultConfig: {
      primary_color: '#60a5fa',
      secondary_color: '#a78bfa',
      background_color: '#0f172a',
      font_family: 'system-ui, -apple-system, sans-serif',
      border_radius: '0.5rem',
      custom_css: '',
    },
    configSchema: {
      primary_color: { type: 'color', label: 'Primary Color', default: '#60a5fa' },
      secondary_color: { type: 'color', label: 'Secondary Color', default: '#a78bfa' },
      background_color: { type: 'color', label: 'Background Color', default: '#0f172a' },
      font_family: { type: 'text', label: 'Font Family', default: 'system-ui, -apple-system, sans-serif' },
      border_radius: { type: 'text', label: 'Border Radius', default: '0.5rem' },
      custom_css: { type: 'textarea', label: 'Custom CSS', default: '' },
    },
  },
  {
    name: 'simple',
    title: 'Simple',
    description: '심플한 미니멀 테마',
    version: '1.0.0',
    author: 'Rhymix',
    isResponsive: true,
    supportsDarkMode: false,
    defaultConfig: {
      primary_color: '#000000',
      secondary_color: '#666666',
      background_color: '#ffffff',
      font_family: 'Georgia, serif',
      border_radius: '0',
      custom_css: '',
    },
    configSchema: {
      primary_color: { type: 'color', label: 'Primary Color', default: '#000000' },
      secondary_color: { type: 'color', label: 'Secondary Color', default: '#666666' },
      background_color: { type: 'color', label: 'Background Color', default: '#ffffff' },
      font_family: { type: 'text', label: 'Font Family', default: 'Georgia, serif' },
      border_radius: { type: 'text', label: 'Border Radius', default: '0' },
      custom_css: { type: 'textarea', label: 'Custom CSS', default: '' },
    },
  },
]

export function getThemeDefinition(name: string): ThemeDefinition | undefined {
  return themeDefinitions.find((t) => t.name === name)
}

export function getAllThemeDefinitions(): ThemeDefinition[] {
  return themeDefinitions
}
