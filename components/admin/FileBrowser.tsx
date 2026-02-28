'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileIcon,
  FolderIcon,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Trash2,
  Download,
  MoreVertical,
  Grid3x3,
  List,
  Search,
  FolderOpen,
  Upload,
} from 'lucide-react'
import { deleteFile, type MediaFile } from '@/app/actions/media'
import { useRouter } from 'next/navigation'

interface FileBrowserProps {
  files: MediaFile[]
  onUploadClick?: () => void
  onSelectFile?: (file: MediaFile) => void
  multiSelect?: boolean
}

type ViewMode = 'grid' | 'list'
type FileType = 'all' | 'image' | 'video' | 'audio' | 'document'

export function FileBrowser({ files, onUploadClick, onSelectFile, multiSelect = false }: FileBrowserProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState<FileType>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null)

  // Filter and sort files
  const filteredFiles = files
    .filter((file) => {
      // Filter by file type
      if (fileTypeFilter !== 'all') {
        if (fileTypeFilter === 'image' && !file.mime_type.startsWith('image/')) return false
        if (fileTypeFilter === 'video' && !file.mime_type.startsWith('video/')) return false
        if (fileTypeFilter === 'audio' && !file.mime_type.startsWith('audio/')) return false
        if (fileTypeFilter === 'document' && !file.mime_type.startsWith('application/')) return false
      }

      // Filter by search query
      if (searchQuery) {
        return file.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.original_filename.localeCompare(b.original_filename)
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'size':
          return b.file_size - a.file_size
        default:
          return 0
      }
    })

  const handleFileSelect = (file: MediaFile) => {
    if (!multiSelect) {
      onSelectFile?.(file)
      return
    }

    const newSelected = new Set(selectedFiles)
    if (newSelected.has(file.id)) {
      newSelected.delete(file.id)
    } else {
      newSelected.add(file.id)
    }
    setSelectedFiles(newSelected)
  }

  const handleDeleteClick = (file: MediaFile) => {
    setFileToDelete(file)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return

    const result = await deleteFile(fileToDelete.id)
    if (result.success) {
      router.refresh()
    } else {
      alert(`삭제 실패: ${result.error}`)
    }

    setDeleteDialogOpen(false)
    setFileToDelete(null)
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return

    if (!confirm(`${selectedFiles.size}개 파일을 삭제하시겠습니까?`)) {
      return
    }

    for (const fileId of selectedFiles) {
      await deleteFile(fileId)
    }

    setSelectedFiles(new Set())
    router.refresh()
  }

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return ImageIcon
    if (type.startsWith('video/')) return Film
    if (type.startsWith('audio/')) return Music
    return FileText
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="파일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* File Type Filter */}
          <Select value={fileTypeFilter} onValueChange={(v) => setFileTypeFilter(v as FileType)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="파일 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="image">이미지</SelectItem>
              <SelectItem value="video">동영상</SelectItem>
              <SelectItem value="audio">오디오</SelectItem>
              <SelectItem value="document">문서</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'date' | 'size')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">최신순</SelectItem>
              <SelectItem value="name">이름순</SelectItem>
              <SelectItem value="size">크기순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Upload Button */}
          <Button onClick={onUploadClick}>
            <Upload className="h-4 w-4 mr-2" />
            업로드
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedFiles.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedFiles.size}개 파일 선택됨
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedFiles(new Set())}>
              선택 해제
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              일괄 삭제
            </Button>
          </div>
        </div>
      )}

      {/* File Count */}
      <div className="text-sm text-muted-foreground">
        총 {filteredFiles.length}개 파일
      </div>

      {/* Empty State */}
      {filteredFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">
            {searchQuery || fileTypeFilter !== 'all' ? '검색 결과가 없습니다.' : '파일이 없습니다.'}
          </p>
          {!searchQuery && fileTypeFilter === 'all' && (
            <Button onClick={onUploadClick}>
              <Upload className="h-4 w-4 mr-2" />
              첫 번째 파일 업로드
            </Button>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.mime_type)
            const isSelected = selectedFiles.has(file.id)
            const isImage = file.mime_type.startsWith('image/')

            return (
              <div
                key={file.id}
                className={`group relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleFileSelect(file)}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleFileSelect(file)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* File Preview */}
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={file.cdn_url}
                      alt={file.original_filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                {/* File Info Overlay */}
                <div className="p-2 bg-background/95 backdrop-blur">
                  <p className="text-xs font-medium truncate" title={file.original_filename}>
                    {file.original_filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>

                {/* Action Menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(file.cdn_url, '_blank')
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(file)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Type Badge */}
                <Badge
                  variant="secondary"
                  className="absolute bottom-14 left-2 text-xs"
                >
                  {file.mime_type.split('/')[0]}
                </Badge>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredFiles.length > 0 && (
        <div className="border rounded-lg divide-y">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.mime_type)
            const isSelected = selectedFiles.has(file.id)
            const isImage = file.mime_type.startsWith('image/')

            return (
              <div
                key={file.id}
                className={`group flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors ${
                  isSelected ? 'bg-muted' : ''
                }`}
              >
                {/* Selection Checkbox */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleFileSelect(file)}
                />

                {/* File Icon/Preview */}
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  {isImage ? (
                    <img
                      src={file.cdn_url}
                      alt={file.original_filename}
                      className="w-full h-full object-cover rounded"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={file.original_filename}>
                    {file.original_filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                {/* Type Badge */}
                <Badge variant="secondary">{file.mime_type.split('/')[0]}</Badge>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.cdn_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteClick(file)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>파일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &quot;{fileToDelete?.original_filename}&quot; 파일을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
