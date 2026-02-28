'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Calendar,
  Clock,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  FileText,
  File,
  Newspaper,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getScheduledContent,
  cancelScheduledContent,
  updateScheduledContent,
  getScheduledContentStats,
  type ScheduledContent,
  type ScheduleableContentType,
} from '@/app/actions/schedule'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const CONTENT_TYPE_CONFIG: Record<
  ScheduleableContentType,
  { label: string; icon: React.ElementType; color: string }
> = {
  post: { label: 'Post', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  document: { label: 'Document', icon: File, color: 'bg-purple-100 text-purple-800' },
  page: { label: 'Page', icon: Newspaper, color: 'bg-orange-100 text-orange-800' },
}

const STATUS_CONFIG: Record<
  ScheduledContent['status'],
  { label: string; color: string }
> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'Published', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
}

export function ContentScheduler() {
  const [schedules, setSchedules] = useState<ScheduledContent[]>([])
  const [stats, setStats] = useState({
    pending: 0,
    published_today: 0,
    failed: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    content_type: '' as ScheduleableContentType | '',
    status: '' as ScheduledContent['status'] | '',
  })
  const [editingSchedule, setEditingSchedule] = useState<ScheduledContent | null>(null)
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    setIsLoading(true)

    const [schedulesResult, statsResult] = await Promise.all([
      getScheduledContent({
        content_type: filters.content_type || undefined,
        status: filters.status || undefined,
      }),
      getScheduledContentStats(),
    ])

    if (schedulesResult.success && schedulesResult.data) {
      setSchedules(schedulesResult.data)
    }

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    }

    setIsLoading(false)
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled content?')) return

    const result = await cancelScheduledContent(id)
    if (result.success) {
      loadData()
    } else {
      alert(result.error)
    }
  }

  const handleUpdateDate = async () => {
    if (!editingSchedule || !newDate) return

    const result = await updateScheduledContent(editingSchedule.id, {
      scheduled_publish_at: newDate,
    })

    if (result.success) {
      setEditingSchedule(null)
      setNewDate('')
      loadData()
    } else {
      alert(result.error)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'PPP p', { locale: ko })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Scheduled for publication</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Today</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published_today}</div>
            <p className="text-xs text-muted-foreground">Auto-published today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Publication failures</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Scheduled Content</CardTitle>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select
              value={filters.content_type}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  content_type: value as ScheduleableContentType | '',
                }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="page">Pages</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value as ScheduledContent['status'] | '',
                }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scheduled content found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Scheduled At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const typeConfig = CONTENT_TYPE_CONFIG[schedule.content_type]
                  const statusConfig = STATUS_CONFIG[schedule.status]
                  const TypeIcon = typeConfig.icon

                  return (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <Badge variant="secondary" className={typeConfig.color}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{schedule.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(schedule.scheduled_publish_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {schedule.status === 'pending' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingSchedule(schedule)
                                  setNewDate(schedule.scheduled_publish_at)
                                }}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Change Date
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCancel(schedule.id)}
                                className="text-destructive"
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {schedule.status === 'failed' && schedule.error_message && (
                          <span className="text-xs text-destructive">
                            {schedule.error_message}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Date Dialog */}
      <Dialog open={!!editingSchedule} onOpenChange={() => setEditingSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Publication Date</DialogTitle>
            <DialogDescription>
              Select a new date and time for the scheduled publication.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              type="datetime-local"
              value={newDate ? new Date(newDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => setNewDate(new Date(e.target.value).toISOString())}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSchedule(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
