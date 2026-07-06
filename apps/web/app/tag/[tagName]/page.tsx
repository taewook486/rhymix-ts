/**
 * apps/web/app/tag/[tagName]/page.tsx — SPEC-TAG-001 (REQ-TAG-004)
 *
 * 태그별 게시물 목록 페이지 라우트
 * /tag/[tagName] 라우트에서 해당 태그가 붙은 게시물을 최신순으로 표시
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-004
 */
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { TagListPage, type TagListPageProps } from '@rhymix-ts/board';

interface TagPageProps {
  params: Promise<{ tagName: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * REQ-TAG-004: 태그별 게시물 목록 페이지
 */
export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tagName } = await params;
  const resolvedSearchParams = await searchParams;

  // 태그 이름 디코딩
  const decodedTagName = decodeURIComponent(tagName);

  // page 파싱 (기본 1)
  const rawPage = resolvedSearchParams['page'];
  const page = rawPage ? parseInt(String(rawPage), 10) : 1;
  const pageSize = 20; // 고정값

  // 기본 mid (게시판이 하나만 있는 경우, 또는 첫 번째 게시판)
  // TODO: 실제로는 사용자가 게시판을 선택하거나 전체 게시물을 보여줘야 함
  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  if (!Number.isFinite(siteId) || siteId <= 0) {
    notFound();
  }

  // 첫 번째 게시판 찾기
  const firstBoard = await prisma.moduleInstance.findFirst({
    where: {
      siteId,
      // SPEC-TAG-001: ModuleInstance 에는 moduleCode 가 직접 있음 (module 관계 없음)
      moduleCode: 'board',
    },
    select: { mid: true },
  });

  if (!firstBoard) {
    notFound();
  }

  const mid = firstBoard.mid;

  // TODO: tRPC 라우터를 통한 데이터 조회
  // const documents = await trpc.tag.getDocuments.query({
  //   tagName: decodedTagName,
  //   page,
  //   pageSize,
  // });

  // 임시 데이터 (tRPC 연결 후 제거)
  const documents: TagListPageProps['documents'] = [];
  const totalCount = 0;
  const totalPages = 1;

  return (
    <TagListPage
      tagName={decodedTagName}
      documents={documents}
      totalCount={totalCount}
      currentPage={page}
      totalPages={totalPages}
      pageSize={pageSize}
      mid={mid}
    />
  );
}
