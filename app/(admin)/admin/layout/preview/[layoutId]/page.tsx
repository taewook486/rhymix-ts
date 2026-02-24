import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import { renderLayout } from '@/app/actions/layouts'
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer'

interface LayoutPreviewPageProps {
  params: {
    layoutId: string
  }
}

export default async function LayoutPreviewPage({ params }: LayoutPreviewPageProps) {
  const layoutDetail = await renderLayout(params.layoutId)

  if (!layoutDetail) {
    notFound()
  }

  const { layout, columns, widgets } = layoutDetail

  // Group widgets by column
  const widgetsByColumn: Record<number, typeof widgets> = {}
  widgets.forEach((widget) => {
    if (!widgetsByColumn[widget.column_index]) {
      widgetsByColumn[widget.column_index] = []
    }
    widgetsByColumn[widget.column_index].push(widget)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Layout Preview: {layout.title}</h1>
          <p className="text-muted-foreground">{layout.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/layout">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Layouts
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/layout/edit/${layout.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Layout
            </Link>
          </Button>
        </div>
      </div>

      {/* Layout Info */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-mono text-sm">{layout.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Type</div>
              <div>{layout.layout_type}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="flex gap-2">
                {layout.is_default && <span className="text-sm">Default</span>}
                {layout.is_active && <span className="text-sm">Active</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {columns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>This layout has no columns yet.</p>
              <p className="text-sm mt-2">Edit the layout to add columns and widgets.</p>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: columns
                  .map((col) => `${col.width_fraction * 100}%`)
                  .join(' '),
              }}
            >
              {columns.map((column) => (
                <div
                  key={column.id}
                  className={`border rounded-lg p-4 min-h-[400px] ${column.css_class || ''}`}
                  style={column.inline_style ? { ...getInlineStyles(column.inline_style) } : undefined}
                >
                  <div className="text-sm font-medium mb-4">
                    Column {column.column_index + 1} ({Math.round(column.width_fraction * 100)}%)
                  </div>

                  {widgetsByColumn[column.column_index]?.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded">
                      No widgets in this column
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {widgetsByColumn[column.column_index]
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((widget) => (
                          <div
                            key={widget.id}
                            style={{
                              width: widget.width_fraction ? `${widget.width_fraction * 100}%` : '100%',
                            }}
                          >
                            <WidgetPreview widget={widget} />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function WidgetPreview({ widget }: { widget: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{widget.widget_title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-2">Type: {widget.widget_type}</div>
        <div className="text-xs text-muted-foreground">
          {Object.entries(widget.config || {}).length > 0 && (
            <details>
              <summary className="cursor-pointer">Configuration</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(widget.config, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getInlineStyles(inlineStyle: string): React.CSSProperties {
  try {
    // Parse inline style string to CSS properties
    const styles: React.CSSProperties = {}
    const properties = inlineStyle.split(';').filter((s) => s.trim())

    properties.forEach((property) => {
      const [key, value] = property.split(':').map((s) => s.trim())
      if (key && value) {
        // Convert kebab-case to camelCase
        const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
        ;(styles as any)[camelKey] = value
      }
    })

    return styles
  } catch {
    return {}
  }
}
