/**
 * [mid]/write/page.tsx — SPEC-CONTENT-001 Slice B (T-013)
 *
 * 글쓰기 진입점. Server Action 정의 + BoardWritePage 렌더.
 * Server Action 은 apps/web 레이어에서만 prisma + auth 에 접근 가능하므로 여기서 정의.
 *
 * @MX:NOTE [AUTO]: apps/web 레이어에서 prisma + auth 를 주입하는 Server Action 위임 패턴.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-010, SPEC-BOARD-UI-001 REQ-BUI-008
 */
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { getModuleDefinition } from '@/lib/modules/registry';
import { handleCreateDocumentForm } from '@rhymix-ts/board/actions';
import { TagInput } from '@rhymix-ts/board';

interface WritePageProps {
  params: Promise<{ mid: string }>;
}

export default async function WritePage({ params }: WritePageProps) {
  const { mid } = await params;
  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  if (!Number.isFinite(siteId) || siteId <= 0) {
    notFound();
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) {
    notFound();
  }

  // 해당 모듈이 write 라우트를 지원하지 않으면 404
  const def = getModuleDefinition(instance.moduleCode);
  if (!def) {
    notFound();
  }

  const session = await auth();

  // SPEC-BOARD-UI-001 REQ-BUI-008 / AC-BUI-008: 비로그인 사용자는 글쓰기 접근 시 로그인 페이지로 리다이렉트
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/${mid}/write`);
  }

  async function createDocumentAction(formData: FormData) {
    'use server';
    const user = session?.user as { id?: string | number; isAdmin?: boolean } | null | undefined;
    const actor = {
      userGroupSrl: user ? 1 : 0,
      isAdmin: !!user?.isAdmin,
    };
    const result = await handleCreateDocumentForm(formData, {
      prisma,
      authorId: user?.id != null ? Number(user.id) : null,
      actor,
    });
    if (result.success && result.documentId != null) {
      redirect(`/${mid}/${result.documentId}`);
    }
  }

  return (
    <main>
      <h1>{instance.name} — 글쓰기</h1>
      <form action={createDocumentAction}>
        <input type="hidden" name="moduleInstanceId" value={instance.id} />
        <div>
          <label htmlFor="title">제목</label>
          <input id="title" name="title" type="text" required maxLength={200} />
        </div>
        <div>
          <label htmlFor="content">내용</label>
          <textarea id="content" name="content" required rows={10} />
        </div>

        {/* REQ-TAG-001: 태그 입력 UI */}
        <div>
          <label htmlFor="tags">태그</label>
          <TagInput
            name="tags"
            maxTags={10}
            maxTagLength={30}
            suggestions={[]} // TODO: tRPC로 자동완성 데이터 가져오기
          />
        </div>

        {/* SPEC-POLL-001 REQ-POLL-001: 글쓰기 폼에서 직접 설문 생성 */}
        <details>
          <summary>설문 추가</summary>
          <div>
            <label htmlFor="pollQuestion">질문</label>
            <input id="pollQuestion" name="pollQuestion" type="text" maxLength={200} />
          </div>
          <div>
            <span>선택지 (2~10개, 사용할 만큼만 입력)</span>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>
                <label htmlFor={`pollOption-${i}`}>선택지 {i + 1}</label>
                <input id={`pollOption-${i}`} name="pollOptions" type="text" maxLength={200} />
              </div>
            ))}
          </div>
          <div>
            <label htmlFor="pollMultiSelect">
              <input id="pollMultiSelect" name="pollMultiSelect" type="checkbox" />
              복수 선택 허용
            </label>
          </div>
          <div>
            <label htmlFor="pollAllowGuest">
              <input id="pollAllowGuest" name="pollAllowGuest" type="checkbox" />
              비로그인도 투표 가능
            </label>
          </div>
          <div>
            <label htmlFor="pollEndsAt">마감일</label>
            <input id="pollEndsAt" name="pollEndsAt" type="date" />
          </div>
        </details>

        <button type="submit">작성</button>
        <a href={`/${mid}`}>취소</a>
      </form>
    </main>
  );
}
