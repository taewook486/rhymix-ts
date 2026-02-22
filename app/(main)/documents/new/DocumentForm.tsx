'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Eye, FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDocument, updateDocument } from '@/app/actions/document'
import type { DocumentWithAuthor } from '@/types/document'

interface DocumentFormProps {
  mode: 'create' | 'edit'
  document?: DocumentWithAuthor
}

export function DocumentForm({ mode, document }: DocumentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

  // Form state
  const [title, setTitle] = useState(document?.title || '')
  const [content, setContent] = useState(document?.content || '')
  const [module, setModule] = useState(document?.module || 'wiki')
  const [status, setStatus] = useState<'draft' | 'published'>(
    (document?.status === 'draft' ? 'draft' : 'published') as 'draft' | 'published'
  )
  const [visibility, setVisibility] = useState<'public' | 'private' | 'member' | 'admin'>(
    (['public', 'private', 'member', 'admin'].includes(document?.visibility || '')
      ? document?.visibility
      : 'public') as 'public' | 'private' | 'member' | 'admin'
  )
  const [tags, setTags] = useState<string[]>(document?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [language, setLanguage] = useState(document?.language || 'ko')
  const [template, setTemplate] = useState(document?.template || 'default')

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSave = async (saveAs: 'draft' | 'published') => {
    if (!title.trim()) {
      alert('Title is required')
      return
    }

    setIsLoading(true)

    try {
      const input = {
        module,
        title,
        content,
        status: saveAs,
        visibility,
        tags,
        language,
        template,
      }

      if (mode === 'create') {
        const result = await createDocument(input)
        if (result.success && result.data) {
          router.push(`/documents/${result.data.id}`)
        } else {
          alert(result.error || 'Failed to create document')
        }
      } else if (document) {
        const result = await updateDocument(document.id, input)
        if (result.success && result.data) {
          router.push(`/documents/${result.data.id}`)
        } else {
          alert(result.error || 'Failed to update document')
        }
      }
    } catch (error) {
      console.error('Error saving document:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/documents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {mode === 'create' ? 'Create Document' : 'Edit Document'}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'create'
                ? 'Create a new wiki page or document'
                : 'Edit existing document'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreview(!isPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isPreview ? 'Edit' : 'Preview'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-3 space-y-6">
          {/* Title */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Document title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown)</Label>
                {isPreview ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert min-h-[400px] p-4 border rounded-lg bg-muted/30">
                    {content || (
                      <span className="text-muted-foreground">
                        No content yet...
                      </span>
                    )}
                  </div>
                ) : (
                  <Textarea
                    id="content"
                    placeholder="Write your document content in Markdown..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[400px] font-mono"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'published')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(v) =>
                    setVisibility(v as 'public' | 'private' | 'member' | 'admin')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="member">Members Only</SelectItem>
                    <SelectItem value="private">Private (Only Me)</SelectItem>
                    <SelectItem value="admin">Admin Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Module</Label>
                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wiki">Wiki</SelectItem>
                    <SelectItem value="docs">Documentation</SelectItem>
                    <SelectItem value="help">Help</SelectItem>
                    <SelectItem value="page">Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      #{tag} &times;
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Button
                className="w-full"
                onClick={() => handleSave('published')}
                disabled={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Publish'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSave('draft')}
                disabled={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Link href="/documents" className="block">
                <Button variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
