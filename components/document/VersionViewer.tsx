'use client'

import { useState } from 'react'
import { X, Plus, Minus, RotateCcw, Check, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { DocumentVersionDiff } from '@/types/document'

interface VersionViewerProps {
  diff: DocumentVersionDiff | null
  isOpen: boolean
  onClose: () => void
  onRestore: (version: number) => void
  canRestore: boolean
}

export function VersionViewer({
  diff,
  isOpen,
  onClose,
  onRestore,
  canRestore,
}: VersionViewerProps) {
  const [showUnchanged, setShowUnchanged] = useState(true)

  if (!diff) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredChanges = showUnchanged
    ? diff.changes
    : diff.changes.filter((c) => c.type !== 'unchanged')

  const handleRestore = () => {
    onRestore(diff.newVersion.version)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Version Comparison</DialogTitle>
          <DialogDescription>
            Compare v{diff.oldVersion.version} with v{diff.newVersion.version}
          </DialogDescription>
        </DialogHeader>

        {/* Version info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">v{diff.oldVersion.version}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(diff.oldVersion.created_at)}
              </span>
            </div>
            <p className="font-medium text-sm truncate">{diff.oldVersion.title}</p>
            <p className="text-xs text-muted-foreground">
              by {diff.oldVersion.author?.display_name || diff.oldVersion.author_name || 'Anonymous'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge>v{diff.newVersion.version}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(diff.newVersion.created_at)}
              </span>
            </div>
            <p className="font-medium text-sm truncate">{diff.newVersion.title}</p>
            <p className="text-xs text-muted-foreground">
              by {diff.newVersion.author?.display_name || diff.newVersion.author_name || 'Anonymous'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">{diff.additions}</span>
            <span className="text-muted-foreground">additions</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Minus className="w-4 h-4 text-red-500" />
            <span className="text-red-500 font-medium">{diff.deletions}</span>
            <span className="text-muted-foreground">deletions</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnchanged(!showUnchanged)}
            >
              {showUnchanged ? 'Hide Unchanged' : 'Show Unchanged'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Diff view */}
        <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30">
          <div className="font-mono text-sm">
            {filteredChanges.map((change, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start px-4 py-1 border-l-4',
                  change.type === 'add' &&
                    'bg-green-500/10 border-l-green-500',
                  change.type === 'delete' &&
                    'bg-red-500/10 border-l-red-500',
                  change.type === 'unchanged' &&
                    'border-l-transparent'
                )}
              >
                <span className="w-8 text-muted-foreground text-xs shrink-0">
                  {change.lineNumber}
                </span>
                <span className="text-muted-foreground w-4 shrink-0">
                  {change.type === 'add' && '+'}
                  {change.type === 'delete' && '-'}
                  {change.type === 'unchanged' && ' '}
                </span>
                <pre className="flex-1 whitespace-pre-wrap break-words">
                  {change.content || ' '}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canRestore && (
            <Button onClick={handleRestore}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore to v{diff.newVersion.version}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Version restore confirmation dialog
interface RestoreConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  version: number
}

export function RestoreConfirmation({
  isOpen,
  onClose,
  onConfirm,
  version,
}: RestoreConfirmationProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Restore Version
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to restore this document to version {version}?
            This will create a new version with the content from v{version}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restore
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
