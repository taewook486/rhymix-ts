'use client'

import { useState } from 'react'
import { History, Clock, User, RotateCcw, GitCompare, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { DocumentVersionWithAuthor } from '@/types/document'

interface VersionHistoryProps {
  versions: DocumentVersionWithAuthor[]
  currentVersion: number
  onSelectVersion: (version: number) => void
  onCompareVersions: (oldVersion: number, newVersion: number) => void
  onRestoreVersion: (version: number) => void
  canRestore: boolean
}

export function VersionHistory({
  versions,
  currentVersion,
  onSelectVersion,
  onCompareVersions,
  onRestoreVersion,
  canRestore,
}: VersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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

  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return <Badge variant="default">Created</Badge>
      case 'update':
        return <Badge variant="secondary">Updated</Badge>
      case 'restore':
        return <Badge variant="outline">Restored</Badge>
      case 'publish':
        return <Badge variant="default">Published</Badge>
      default:
        return <Badge variant="outline">{changeType}</Badge>
    }
  }

  const handleVersionSelect = (version: number) => {
    if (selectedVersions.includes(version)) {
      setSelectedVersions(selectedVersions.filter((v) => v !== version))
    } else {
      if (selectedVersions.length < 2) {
        setSelectedVersions([...selectedVersions, version])
      } else {
        setSelectedVersions([selectedVersions[1], version])
      }
    }
  }

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      const [v1, v2] = selectedVersions.sort((a, b) => a - b)
      onCompareVersions(v1, v2)
      setSelectedVersions([])
    }
  }

  const handleRestore = (version: number) => {
    onRestoreVersion(version)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <History className="w-4 h-4 mr-2" />
        Version History
      </Button>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            View and compare document versions. Select two versions to compare.
          </DialogDescription>
        </DialogHeader>

        {/* Compare button */}
        {selectedVersions.length === 2 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm">
              Comparing v{selectedVersions[0]} and v{selectedVersions[1]}
            </span>
            <Button size="sm" onClick={handleCompare}>
              <GitCompare className="w-4 h-4 mr-1" />
              Compare
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedVersions([])}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Version list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No version history available.
            </div>
          ) : (
            versions.map((version, index) => (
              <div
                key={version.id}
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  version.version === currentVersion
                    ? 'bg-primary/5 border-primary'
                    : 'bg-card hover:bg-accent/50',
                  selectedVersions.includes(version.version) && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedVersions.includes(version.version)}
                    onCheckedChange={() => handleVersionSelect(version.version)}
                    className="mt-1"
                  />

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold">v{version.version}</span>
                      {getChangeTypeBadge(version.change_type)}
                      {version.version === currentVersion && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </div>

                    {/* Title */}
                    <p className="font-medium mb-2 truncate">{version.title}</p>

                    {/* Change summary */}
                    {version.change_summary && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {version.change_summary}
                      </p>
                    )}

                    {/* Author and date */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage
                            src={version.author?.avatar_url || undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {getAuthorInitials(version.author?.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {version.author?.display_name ||
                            version.author_name ||
                            'Anonymous'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(version.created_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectVersion(version.version)}
                      >
                        View
                      </Button>
                      {canRestore && version.version !== currentVersion && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version.version)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
