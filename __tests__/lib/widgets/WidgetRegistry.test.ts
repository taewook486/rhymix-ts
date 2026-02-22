/**
 * Widget Registry Tests
 */

import { widgetRegistry } from '@/lib/widgets/WidgetRegistry'

describe('WidgetRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    widgetRegistry.clear()
  })

  describe('registerWidget', () => {
    it('should register a new widget', () => {
      const config = {
        name: 'test_widget',
        title: 'Test Widget',
        description: 'A test widget',
        category: 'content' as const,
        icon: 'test',
        component: 'TestWidget',
        defaultConfig: { foo: 'bar' },
        configSchema: {
          foo: { type: 'text', label: 'Foo', default: 'bar' },
        },
        allowedPositions: ['sidebar', 'footer'],
      }

      widgetRegistry.register(config)

      const retrieved = widgetRegistry.get('test_widget')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('test_widget')
    })

    it('should throw error when registering duplicate widget', () => {
      const config = {
        name: 'duplicate',
        title: 'Duplicate',
        description: 'Test',
        category: 'content' as const,
        icon: 'test',
        component: 'Test',
        defaultConfig: {},
        configSchema: {},
        allowedPositions: [],
      }

      widgetRegistry.register(config)

      expect(() => {
        widgetRegistry.register(config)
      }).toThrow('Widget "duplicate" already registered')
    })
  })

  describe('get', () => {
    it('should return undefined for non-existent widget', () => {
      const result = widgetRegistry.get('non_existent')
      expect(result).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return all registered widgets', () => {
      const widget1 = {
        name: 'widget1',
        title: 'Widget 1',
        description: 'Test',
        category: 'content' as const,
        icon: 'test',
        component: 'Widget1',
        defaultConfig: {},
        configSchema: {},
        allowedPositions: [],
      }

      const widget2 = {
        name: 'widget2',
        title: 'Widget 2',
        description: 'Test',
        category: 'navigation' as const,
        icon: 'test',
        component: 'Widget2',
        defaultConfig: {},
        configSchema: {},
        allowedPositions: [],
      }

      widgetRegistry.register(widget1)
      widgetRegistry.register(widget2)

      const all = widgetRegistry.getAll()
      expect(all).toHaveLength(2)
      expect(all.map((w) => w.name)).toEqual(['widget1', 'widget2'])
    })
  })

  describe('getByCategory', () => {
    it('should return widgets filtered by category', () => {
      const contentWidget = {
        name: 'content_widget',
        title: 'Content',
        description: 'Test',
        category: 'content' as const,
        icon: 'test',
        component: 'ContentWidget',
        defaultConfig: {},
        configSchema: {},
        allowedPositions: [],
      }

      const navWidget = {
        name: 'nav_widget',
        title: 'Navigation',
        description: 'Test',
        category: 'navigation' as const,
        icon: 'test',
        component: 'NavWidget',
        defaultConfig: {},
        configSchema: {},
        allowedPositions: [],
      }

      widgetRegistry.register(contentWidget)
      widgetRegistry.register(navWidget)

      const contentWidgets = widgetRegistry.getByCategory('content')
      expect(contentWidgets).toHaveLength(1)
      expect(contentWidgets[0].name).toBe('content_widget')
    })
  })

  describe('getByPosition', () => {
    it('should return widgets allowed at position', () => {
      const sidebarWidget = {
        name: 'sidebar_widget',
        title: 'Sidebar',
        description: 'Test',
        category: 'content' as const,
        icon: 'test',
        component: 'SidebarWidget',
        defaultConfig: {},
        configSchema: {},
        allowedPositions: ['sidebar', 'footer'],
      }

      const headerWidget = {
        name: 'header_widget',
        title: 'Header',
        description: 'Test',
        category: 'navigation' as const,
        icon: 'test',
        component: 'HeaderWidget',
        defaultConfig: {},
        configSchema: {},
        allowedPositions: ['header'],
      }

      widgetRegistry.register(sidebarWidget)
      widgetRegistry.register(headerWidget)

      const sidebarWidgets = widgetRegistry.getByPosition('sidebar')
      expect(sidebarWidgets).toHaveLength(1)
      expect(sidebarWidgets[0].name).toBe('sidebar_widget')
    })
  })
})
