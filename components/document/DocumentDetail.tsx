'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Eye,
  Clock,
  User,
  History,
  Edit,
  FileText,
  Star,
  Pin,
  Share2,
  Bookmark,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { DocumentWithAuthor } from '@/types/document'

interface DocumentDetailProps {
  document: DocumentWithAuthor
  canEdit: boolean
  onShowVersionHistory: () => void
}

export function DocumentDetail({
  document,
  canEdit,
  onShowVersionHistory,
}: DocumentDetailProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const getAuthorInitials = (name: string | null | undefined) => {
    if (!name) return 'A'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default">Published</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'archived':
        return <Badge variant="outline">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return null
      case 'private':
        return <Badge variant="outline">Private</Badge>
      case 'member':
        return <Badge variant="outline">Members Only</Badge>
      case 'admin':
        return <Badge variant="destructive">Admin Only</Badge>
      default:
        return null
    }
  }

  // Generate table of contents from headings
  const generateTOC = (content: string) => {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm
    const toc: Array<{ level: number; text: string; id: string }> = []
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length
      const text = match[2]
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      toc.push({ level, text, id })
    }

    return toc
  }

  const toc = generateTOC(document.content)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/documents"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Documents
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Document */}
          <Card>
            <CardHeader className="space-y-4">
              {/* Title and badges */}
              <div className="flex flex-wrap items-center gap-2">
                {document.is_sticky && (
                  <Pin className="w-4 h-4 text-primary" />
                )}
                {document.is_featured && (
                  <Star className="w-4 h-4 text-yellow-500" />
                )}
                {getStatusBadge(document.status)}
                {getVisibilityBadge(document.visibility)}
              </div>
              <h1 className="text-2xl font-bold">{document.title}</h1>

              {/* Author and meta */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={document.author?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getAuthorInitials(document.author?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {document.author?.display_name || 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {document.published_at
                          ? `Published ${formatDate(document.published_at)}`
                          : `Created ${formatDate(document.created_at)}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{formatNumber(document.view_count)}</span>
                  </div>
                  <Badge variant="outline">v{document.version}</Badge>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="py-6">
              {/* Content */}
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: document.content_html || document.content,
                }}
              />

              {/* Tags */}
              {document.tags && document.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                  {document.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Categories */}
              {document.categories && document.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {document.categories.map((category, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t flex-wrap">
                <Button
                  variant={isBookmarked ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsBookmarked(!isBookmarked)}
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowVersionHistory}
                >
                  <History className="w-4 h-4 mr-2" />
                  Version History
                </Button>
                {canEdit && (
                  <Link href={`/documents/${document.id}/edit`}>
                    <Button variant="default" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Table of Contents */}
        <div className="lg:col-span-1">
          {toc.length > 0 && (
            <Card className="sticky top-4">
              <CardHeader>
                <h3 className="font-semibold text-sm">Table of Contents</h3>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  {toc.map((item, index) => (
                    <a
                      key={index}
                      href={`#${item.id}`}
                      className={cn(
                        'block text-sm text-muted-foreground hover:text-foreground transition-colors',
                        item.level === 1 && 'font-medium',
                        item.level === 2 && 'pl-3',
                        item.level === 3 && 'pl-6'
                      )}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
          )}

          {/* Document Info */}
          <Card className="mt-4">
            <CardHeader>
              <h3 className="font-semibold text-sm">Document Info</h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Module</span>
                <span className="font-medium">{document.module}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium">{document.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template</span>
                <span className="font-medium">{document.template}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{document.version}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(document.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">
                  {new Date(document.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
