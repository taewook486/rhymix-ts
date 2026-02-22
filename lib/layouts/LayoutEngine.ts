/**
 * Layout Engine
 * Manages layout definitions and positions
 */

export interface LayoutDefinition {
  name: string
  title: string
  description?: string
  positions: LayoutPosition[]
  defaultConfig: Record<string, any>
}

export interface LayoutPosition {
  name: string
  title: string
  description?: string
  maxWidgets?: number
  allowedWidgetTypes?: string[]
}

export const layoutDefinitions: LayoutDefinition[] = [
  {
    name: 'default',
    title: 'Default Layout',
    description: '기본 레이아웃 (헤더 + 콘텐츠 + 사이드바 + 푸터)',
    positions: [
      { name: 'header', title: 'Header', description: '상단 영역', maxWidgets: 3 },
      { name: 'content_top', title: 'Content Top', description: '콘텐츠 상단', maxWidgets: 5 },
      { name: 'sidebar_left', title: 'Left Sidebar', description: '왼쪽 사이드바', maxWidgets: 10 },
      { name: 'sidebar_right', title: 'Right Sidebar', description: '오른쪽 사이드바', maxWidgets: 10 },
      { name: 'content_bottom', title: 'Content Bottom', description: '콘텐츠 하단', maxWidgets: 5 },
      { name: 'footer', title: 'Footer', description: '하단 영역', maxWidgets: 3 },
    ],
    defaultConfig: {
      showHeader: true,
      showFooter: true,
      sidebarPosition: 'right',
      containerWidth: '1200px',
    },
  },
  {
    name: 'full_width',
    title: 'Full Width',
    description: '전체 너비 레이아웃',
    positions: [
      { name: 'header', title: 'Header', description: '상단 영역', maxWidgets: 3 },
      { name: 'content_top', title: 'Content Top', description: '콘텐츠 상단', maxWidgets: 5 },
      { name: 'content_bottom', title: 'Content Bottom', description: '콘텐츠 하단', maxWidgets: 5 },
      { name: 'footer', title: 'Footer', description: '하단 영역', maxWidgets: 3 },
    ],
    defaultConfig: {
      showHeader: true,
      showFooter: true,
      containerWidth: '100%',
    },
  },
  {
    name: 'sidebar_left',
    title: 'Left Sidebar',
    description: '왼쪽 사이드바 레이아웃',
    positions: [
      { name: 'header', title: 'Header', description: '상단 영역', maxWidgets: 3 },
      { name: 'content_top', title: 'Content Top', description: '콘텐츠 상단', maxWidgets: 5 },
      { name: 'sidebar_left', title: 'Left Sidebar', description: '왼쪽 사이드바', maxWidgets: 10 },
      { name: 'content_bottom', title: 'Content Bottom', description: '콘텐츠 하단', maxWidgets: 5 },
      { name: 'footer', title: 'Footer', description: '하단 영역', maxWidgets: 3 },
    ],
    defaultConfig: {
      showHeader: true,
      showFooter: true,
      sidebarWidth: '300px',
      containerWidth: '1200px',
    },
  },
  {
    name: 'blank',
    title: 'Blank',
    description: '빈 레이아웃 (콘텐츠만 표시)',
    positions: [
      { name: 'content_top', title: 'Content Top', description: '콘텐츠 상단', maxWidgets: 3 },
      { name: 'content_bottom', title: 'Content Bottom', description: '콘텐츠 하단', maxWidgets: 3 },
    ],
    defaultConfig: {
      showHeader: false,
      showFooter: false,
      containerWidth: '100%',
    },
  },
]

export function getLayoutDefinition(name: string): LayoutDefinition | undefined {
  return layoutDefinitions.find((l) => l.name === name)
}

export function getAllLayoutDefinitions(): LayoutDefinition[] {
  return layoutDefinitions
}

export function getPositionDefinition(
  layoutName: string,
  positionName: string
): LayoutPosition | undefined {
  const layout = getLayoutDefinition(layoutName)
  return layout?.positions.find((p) => p.name === positionName)
}
