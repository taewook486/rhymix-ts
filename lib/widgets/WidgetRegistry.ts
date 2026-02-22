/**
 * Widget Registry
 * Manages widget types and their configurations
 */

export interface WidgetConfig {
  name: string
  title: string
  description: string
  category: 'content' | 'navigation' | 'media' | 'interactive' | 'admin'
  icon: string
  component: string
  defaultConfig: Record<string, any>
  configSchema: Record<string, { type: string; label: string; default?: any; options?: any[] }>
  allowedPositions: string[]
}

class WidgetRegistry {
  private widgets: Map<string, WidgetConfig> = new Map()

  register(config: WidgetConfig) {
    if (this.widgets.has(config.name)) {
      throw new Error(`Widget "${config.name}" already registered`)
    }
    this.widgets.set(config.name, config)
  }

  unregister(name: string) {
    this.widgets.delete(name)
  }

  clear() {
    this.widgets.clear()
  }

  get(name: string): WidgetConfig | undefined {
    return this.widgets.get(name)
  }

  getAll(): WidgetConfig[] {
    return Array.from(this.widgets.values())
  }

  getByCategory(category: WidgetConfig['category']): WidgetConfig[] {
    return this.getAll().filter((w) => w.category === category)
  }

  getByPosition(position: string): WidgetConfig[] {
    return this.getAll().filter((w) => w.allowedPositions.includes(position))
  }
}

// Singleton instance
export const widgetRegistry = new WidgetRegistry()

// Register built-in widgets
widgetRegistry.register({
  name: 'latest_posts',
  title: 'Latest Posts',
  description: 'Display recent posts from selected boards',
  category: 'content',
  icon: 'FileText',
  component: 'LatestPosts',
  defaultConfig: {
    title: 'Latest Posts',
    boardIds: [],
    limit: 5,
    showAuthor: true,
    showDate: true,
    showThumbnail: true,
  },
  configSchema: {
    title: { type: 'string', label: 'Title', default: 'Latest Posts' },
    boardIds: { type: 'array', label: 'Boards', default: [] },
    limit: { type: 'number', label: 'Number of Posts', default: 5 },
    showAuthor: { type: 'boolean', label: 'Show Author', default: true },
    showDate: { type: 'boolean', label: 'Show Date', default: true },
    showThumbnail: { type: 'boolean', label: 'Show Thumbnail', default: true },
  },
  allowedPositions: ['sidebar_left', 'sidebar_right', 'content_top', 'content_bottom'],
})

widgetRegistry.register({
  name: 'login_form',
  title: 'Login Form',
  description: 'User login form',
  category: 'interactive',
  icon: 'LogIn',
  component: 'LoginForm',
  defaultConfig: {
    title: 'Login',
    showSignupLink: true,
  },
  configSchema: {
    title: { type: 'string', label: 'Title', default: 'Login' },
    showSignupLink: { type: 'boolean', label: 'Show Signup Link', default: true },
  },
  allowedPositions: ['sidebar_left', 'sidebar_right'],
})

widgetRegistry.register({
  name: 'calendar',
  title: 'Calendar',
  description: 'Display a calendar with navigation',
  category: 'navigation',
  icon: 'Calendar',
  component: 'Calendar',
  defaultConfig: {
    title: 'Calendar',
    showPostCount: true,
  },
  configSchema: {
    title: { type: 'string', label: 'Title', default: 'Calendar' },
    showPostCount: { type: 'boolean', label: 'Show Post Count', default: true },
  },
  allowedPositions: ['sidebar_left', 'sidebar_right'],
})

widgetRegistry.register({
  name: 'banner',
  title: 'Banner',
  description: 'Display an image banner with link',
  category: 'media',
  icon: 'Image',
  component: 'Banner',
  defaultConfig: {
    title: 'Banner',
    imageUrl: '',
    linkUrl: '',
    altText: '',
    openInNewTab: true,
  },
  configSchema: {
    title: { type: 'string', label: 'Title', default: 'Banner' },
    imageUrl: { type: 'string', label: 'Image URL', default: '' },
    linkUrl: { type: 'string', label: 'Link URL', default: '' },
    altText: { type: 'string', label: 'Alt Text', default: '' },
    openInNewTab: { type: 'boolean', label: 'Open in New Tab', default: true },
  },
  allowedPositions: ['header', 'content_top', 'content_bottom', 'footer'],
})

widgetRegistry.register({
  name: 'popular_posts',
  title: 'Popular Posts',
  description: 'Display most viewed posts',
  category: 'content',
  icon: 'TrendingUp',
  component: 'PopularPosts',
  defaultConfig: {
    title: 'Popular Posts',
    limit: 5,
    period: 'week', // 'day', 'week', 'month', 'all'
  },
  configSchema: {
    title: { type: 'string', label: 'Title', default: 'Popular Posts' },
    limit: { type: 'number', label: 'Number of Posts', default: 5 },
    period: {
      type: 'select',
      label: 'Period',
      default: 'week',
      options: [
        { value: 'day', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'all', label: 'All Time' },
      ],
    },
  },
  allowedPositions: ['sidebar_left', 'sidebar_right', 'content_top', 'content_bottom'],
})
