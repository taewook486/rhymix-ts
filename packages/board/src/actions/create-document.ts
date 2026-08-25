/**
 * actions/create-document.ts — SPEC-CONTENT-001 Slice B (T-013)
 *
 * 글쓰기 Server Action.
 * FormData → createDocument → redirect.
 *
 * 'use server' 지시어는 apps/web 레이어에서 re-export 할 때 추가하거나,
 * WritePage 내부에서 inline action 으로 사용한다.
 * 패키지 레이어에서는 순수 함수 시그니처만 제공.
 *
 * @MX:NOTE [AUTO]: Server Action 래퍼. prisma 는 호출자(apps/web)가 주입한다.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-010
 */
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { createDocument } from '@rhymix-ts/document';

const CreateDocumentFormSchema = z.object({
  moduleInstanceId: z.coerce.number().int().positive(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

// SPEC-POLL-001 REQ-POLL-001: 글쓰기 폼에서 직접 설문 생성 (선택지 2~10개)
const MIN_POLL_OPTIONS = 2;
const MAX_POLL_OPTIONS = 10;

interface PollFormInput {
  question: string;
  options: string[];
  multiSelect: boolean;
  allowGuest: boolean;
  endsAt: string;
}

/**
 * FormData 에서 설문 섹션을 파싱한다.
 *
 * pollQuestion 이 비어있으면 "이 글에는 설문을 첨부하지 않음"으로 간주해 null 을 반환한다.
 * 선택지는 동일한 name="pollOptions" 를 가진 여러 input 에서 getAll 로 모두 수집한다
 * (추가/제거 버튼 없이도 최대 10개까지 정적으로 렌더링 가능 — 빈 값은 걸러낸다).
 */
function parsePollFromFormData(formData: FormData): PollFormInput | null {
  const question = String(formData.get('pollQuestion') ?? '').trim();
  if (!question) {
    return null;
  }

  const options = formData
    .getAll('pollOptions')
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  return {
    question,
    options,
    multiSelect: formData.get('pollMultiSelect') === 'on',
    allowGuest: formData.get('pollAllowGuest') === 'on',
    endsAt: String(formData.get('pollEndsAt') ?? ''),
  };
}

function validatePollInput(poll: PollFormInput): string | null {
  if (poll.options.length < MIN_POLL_OPTIONS || poll.options.length > MAX_POLL_OPTIONS) {
    return `설문 선택지는 ${MIN_POLL_OPTIONS}개 이상 ${MAX_POLL_OPTIONS}개 이하로 입력해주세요.`;
  }
  if (!poll.endsAt || Number.isNaN(Date.parse(poll.endsAt))) {
    return '설문 마감일을 입력해주세요.';
  }
  return null;
}

export interface CreateDocumentActionResult {
  success: boolean;
  error?: string;
  documentId?: number;
}

/**
 * FormData 를 파싱해 createDocument 를 호출한다.
 * 성공 시 생성된 document id 를 반환한다.
 * redirect 는 apps/web 레이어(WritePage Server Action wrapper)에서 처리.
 */
export async function handleCreateDocumentForm(
  formData: FormData,
  ctx: {
    prisma: PrismaClient;
    authorId: number | null;
    actor: { userGroupSrl: number; isAdmin: boolean };
  },
): Promise<CreateDocumentActionResult> {
  const raw = {
    moduleInstanceId: formData.get('moduleInstanceId'),
    title: formData.get('title'),
    content: formData.get('content'),
  };

  const parsed = CreateDocumentFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.' };
  }

  // REQ-POLL-001: 설문 입력은 문서 생성 전에 먼저 검증한다 — 문서만 생성되고
  // 설문 생성이 실패해 첨부되지 않는 상태(고아 문서)를 최소화하기 위함.
  const pollInput = parsePollFromFormData(formData);
  if (pollInput) {
    const pollError = validatePollInput(pollInput);
    if (pollError) {
      return { success: false, error: pollError };
    }
  }

  try {
    const doc = await createDocument(
      {
        moduleInstanceId: parsed.data.moduleInstanceId,
        authorId: ctx.authorId,
        // 로그인 사용자의 nickName / userIdSnapshot 스냅샷은 createDocument 가
        // 채운다 (packages/document/src/document.ts). 여기서는 비회원 닉네임이
        // 없으므로 null 을 넘긴다.
        nickName: null,
        title: parsed.data.title,
        content: parsed.data.content,
        status: 'PUBLIC',
        actor: ctx.actor,
      },
      { prisma: ctx.prisma },
    );

    if (pollInput) {
      await attachNewPollToDocument(pollInput, doc.id, parsed.data.moduleInstanceId, ctx.prisma);
    }

    return { success: true, documentId: doc.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return { success: false, error: message };
  }
}

/**
 * 새 설문을 생성하고 방금 만든 문서에 첨부한다 — REQ-POLL-001.
 *
 * siteId 는 moduleInstanceId 를 통해 조회한다 (write 폼은 siteId 를 직접 알지 못함).
 * duplicateVotePolicy 는 글쓰기 폼에서 노출하지 않는 필드라 기본값(by-member)을 사용한다.
 */
async function attachNewPollToDocument(
  poll: PollFormInput,
  documentId: number,
  moduleInstanceId: number,
  prisma: PrismaClient,
): Promise<void> {
  const moduleInstance = await prisma.moduleInstance.findUniqueOrThrow({
    where: { id: moduleInstanceId },
    select: { siteId: true },
  });

  await prisma.$transaction(async (tx) => {
    const createdPoll = await tx.poll.create({
      data: {
        siteId: moduleInstance.siteId,
        title: poll.question,
        allowGuestVote: poll.allowGuest,
        allowMultipleChoice: poll.multiSelect,
        startAt: new Date(),
        endAt: new Date(poll.endsAt),
        options: {
          create: poll.options.map((label, index) => ({ label, sortOrder: index })),
        },
      },
    });

    await tx.documentPoll.create({
      data: { documentId, pollId: createdPoll.id },
    });
  });
}
