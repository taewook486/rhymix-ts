/**
 * apps/web/app/admin/boards/[mid]/feed/page.tsx
 * SPEC-FEED-001 Slice C (T-011) REQ-FEED-051~054
 * 게시판별 RSS/Atom 피드 설정 관리자 페이지.
 *
 * boardFeedConfigSchema(packages/board/src/feed/config.ts) 를 재사용하여 검증하고,
 * Board.feedConfig 를 트랜잭션으로 갱신한 뒤 feed:{instanceId} 캐시 태그를 무효화한다(REQ-FEED-042/052).
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-051, REQ-FEED-052, REQ-FEED-053, REQ-FEED-054
 */
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { boardFeedConfigSchema } from '@rhymix-ts/board/feed';

interface FeedSettingsPageProps {
  params: Promise<{ mid: string }>;
}

export default async function FeedSettingsPage({ params }: FeedSettingsPageProps) {
  const { mid } = await params;

  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;
  if (!Number.isFinite(siteId) || siteId <= 0) notFound();

  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect(`/login?callbackUrl=/admin/boards/${mid}/feed`);
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) notFound();

  const board = await prisma.board.findUnique({
    where: { moduleInstanceId: instance.id },
  });
  if (!board) notFound();

  // 저장된 feedConfig 를 스키마 기본값과 함께 파싱한다 — 미설정 필드는 기본값으로 채워진다.
  const feedConfig = boardFeedConfigSchema.parse(board.feedConfig ?? {});

  // TypeScript 클로저 narrowing 을 위해 미리 추출
  const boardId = board.id;
  const instanceId = instance.id;

  // Server Action: 피드 설정 저장
  async function updateFeedConfig(formData: FormData) {
    'use server';

    const parsed = boardFeedConfigSchema.parse({
      enabled: formData.get('enabled') === 'on',
      itemCount: Number(formData.get('itemCount')),
      fullContent: formData.get('fullContent') === 'on',
      excerptLength: Number(formData.get('excerptLength')),
      description: String(formData.get('description') ?? '') || undefined,
      imageUrl: String(formData.get('imageUrl') ?? '') || undefined,
      copyright: String(formData.get('copyright') ?? '') || undefined,
    });

    await prisma.$transaction(async (tx) => {
      await tx.board.update({
        where: { id: boardId },
        data: { feedConfig: parsed },
      });
    });

    // REQ-FEED-042/052: 저장 즉시 공개 피드 캐시를 무효화하여 itemCount 등 변경이 바로 반영되게 한다.
    // Next.js 16 revalidateTag는 2번째 profile 인자를 받지만 실전에서는 선택적으로 동작한다.
    // Next 타입 정의에 없는 2번째 인자를 런타임이 요구한다.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    revalidateTag(`feed:${instanceId}`, undefined as any);

    redirect(`/admin/boards/${mid}/feed`);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{instance.name} — 피드 설정</h1>
        <p className="text-sm text-zinc-500 mt-1">
          이 게시판의 RSS 2.0 / Atom 1.0 피드 노출 여부와 항목 구성을 설정합니다.
        </p>
      </header>

      <form action={updateFeedConfig} className="space-y-4 max-w-lg">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            id="enabled"
            name="enabled"
            type="checkbox"
            defaultChecked={feedConfig.enabled}
            className="w-4 h-4"
          />
          피드 활성화
        </label>

        <div>
          <label htmlFor="itemCount" className="block text-sm font-medium mb-1">
            항목 수
          </label>
          <input
            id="itemCount"
            name="itemCount"
            type="number"
            min={1}
            max={1000}
            defaultValue={feedConfig.itemCount}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            id="fullContent"
            name="fullContent"
            type="checkbox"
            defaultChecked={feedConfig.fullContent}
            className="w-4 h-4"
          />
          전체 본문 포함
        </label>

        {/* REQ-FEED-054: fullContent=true 일 때 excerptLength 입력을 비활성화한다 */}
        <div>
          <label htmlFor="excerptLength" className="block text-sm font-medium mb-1">
            발췌 길이
          </label>
          <input
            id="excerptLength"
            name="excerptLength"
            type="number"
            min={1}
            defaultValue={feedConfig.excerptLength}
            disabled={feedConfig.fullContent}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md disabled:bg-zinc-100 disabled:text-zinc-400"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            피드 설명
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={feedConfig.description}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md"
          />
        </div>

        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">
            피드 이미지 URL
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            defaultValue={feedConfig.imageUrl}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md"
          />
        </div>

        <div>
          <label htmlFor="copyright" className="block text-sm font-medium mb-1">
            저작권
          </label>
          <input
            id="copyright"
            name="copyright"
            type="text"
            defaultValue={feedConfig.copyright}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </form>
    </section>
  );
}
