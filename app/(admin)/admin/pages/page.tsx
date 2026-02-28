import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddPageDialog } from '@/components/admin/AddPageDialog'
import { EditPageDialog } from '@/components/admin/EditPageDialog'
import { FileText, Eye, EyeOff, Clock, User } from 'lucide-react'
import { getPages } from '@/app/actions/pages'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Skeleton component
function PagesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-12 w-full bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Pages Table Component
function PagesTable({ pages }: { pages: any[] }) {
  if (pages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        페이지가 없습니다. 첫 번째 페이지를 만들어보세요.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>제목</TableHead>
          <TableHead>슬러그</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>작성자</TableHead>
          <TableHead className="text-center">조회수</TableHead>
          <TableHead>마지막 수정</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pages.map((page) => (
          <TableRow key={page.id}>
            <TableCell className="font-medium">{page.title}</TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{page.slug}</code>
            </TableCell>
            <TableCell>
              <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                {page.status === 'published' ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    공개
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    비공개
                  </>
                )}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                {page.author?.display_name || 'Unknown'}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline">{page.view_count.toLocaleString()}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(page.updated_at).toLocaleDateString()}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <EditPageDialog page={page} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Pages Page Content Component
async function PagesPageContent() {
  const result = await getPages()

  if (!result.success || !result.data) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-destructive">페이지를 불러오는데 실패했습니다: {result.error}</p>
      </div>
    )
  }

  const pages = result.data

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            모든 페이지
          </CardTitle>
          <CardDescription>정적 콘텐츠 페이지를 생성하고 관리합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <PagesTable pages={pages} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">전체 페이지</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              공개
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.filter((p) => p.status === 'published').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              비공개
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.filter((p) => p.status === 'draft').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">전체 조회수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.reduce((sum, p) => sum + p.view_count, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default async function AdminPagesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">페이지</h1>
          <p className="text-muted-foreground">정적 페이지와 콘텐츠를 관리합니다</p>
        </div>
        <AddPageDialog />
      </div>

      <Suspense fallback={<PagesSkeleton />}>
        <PagesPageContent />
      </Suspense>
    </div>
  )
}
