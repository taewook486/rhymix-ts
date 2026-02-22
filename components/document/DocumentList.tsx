'use client'

import Link from 'next/link'
import { Eye, Clock, User, FileText, Star, Pin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { DocumentWithAuthor } from '@/types/document'

interface DocumentListProps {
  documents: DocumentWithAuthor[]
  currentPage: number
  totalPages: number
  searchQuery: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onCreateNew: () => void
}

export function DocumentList({
  documents,
  currentPage,
  totalPages,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onCreateNew,
}: DocumentListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`
      }
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Documents
          </h1>
          <p className="text-muted-foreground">Wiki and documentation pages</p>
        </div>
        <Button onClick={onCreateNew}>
          Create Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents found.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first document to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card
                className={cn(
                  'transition-colors hover:bg-accent/50 cursor-pointer',
                  doc.is_sticky && 'border-l-4 border-l-primary',
                  doc.is_featured && 'bg-accent/30'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {doc.is_sticky && (
                          <Pin className="w-4 h-4 text-primary shrink-0" />
                        )}
                        {doc.is_featured && (
                          <Star className="w-4 h-4 text-yellow-500 shrink-0" />
                        )}
                        {getStatusBadge(doc.status)}
                        <h3 className="font-medium text-base truncate">
                          {doc.title}
                        </h3>
                      </div>

                      {/* Excerpt */}
                      {doc.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {doc.excerpt}
                        </p>
                      )}

                      {/* Tags */}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {doc.tags.slice(0, 3).map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              #{tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{doc.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {/* Author */}
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>
                            {doc.author?.display_name || 'Anonymous'}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(doc.updated_at)}</span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 ml-auto">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{formatNumber(doc.view_count)}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            v{doc.version}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => {
              const params = new URLSearchParams(window.location.search)
              params.set('page', String(currentPage - 1))
              window.location.search = params.toString()
            }}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(window.location.search)
              params.set('page', String(currentPage + 1))
              window.location.search = params.toString()
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
