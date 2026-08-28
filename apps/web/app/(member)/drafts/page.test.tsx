/**
 * apps/web/app/(member)/drafts/page.test.tsx
 *
 * 임시글 목록 페이지 회귀 테스트 — SPEC-DOCUMENT-001 Slice C.
 *
 * 이 테스트가 존재하는 이유: "발행" 버튼이 한동안 아무것도 하지 않았다.
 * 페이지가 packages/document/src/server/actions.ts 의 publishDraft 를 불렀는데
 * 그 함수는 항상 `{ ok: false, error: 'not implemented yet' }` 를 반환하는
 * 스텁이었고, 반환값을 아무도 보지 않아 조용히 무시됐다.
 *
 * 따라서 핵심 검증은 "form action 을 실행하면 도메인 publishDraft 가
 * 실제로 호출되는가" 이다. 페이지가 다시 스텁 쪽을 import 하면
 * @rhymix-ts/document 의 mock 이 호출되지 않아 이 테스트가 깨진다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
const mockListDrafts = vi.fn();
const mockPublishDraft = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn(() => {
  // next/navigation 의 redirect 는 throw 로 제어 흐름을 끊는다.
  throw new Error('NEXT_REDIRECT');
});

vi.mock('@/lib/auth/config', () => ({ auth: mockAuth }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { __marker: 'prisma' } }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@rhymix-ts/document', () => ({
  listDrafts: mockListDrafts,
  publishDraft: mockPublishDraft,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type El = { type?: unknown; props?: { children?: unknown; action?: unknown } };

/** 반환된 엘리먼트 트리에서 <form> 노드를 모두 찾는다. */
function findForms(node: unknown, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    for (const n of node) findForms(n, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  const el = node as El;
  if (el.type === 'form') out.push(el);
  if (el.props && 'children' in el.props) findForms(el.props.children, out);
  return out;
}

/** vi.mock 은 호이스팅되므로 페이지 모듈은 테스트 시점에 동적 import 한다. */
async function loadPage() {
  const { default: DraftsPage } = await import('./page');
  return DraftsPage;
}

describe('DraftsPage — 임시글 발행 배선', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: '7', isAdmin: false } });
    mockListDrafts.mockResolvedValue({
      items: [
        { id: 41, title: '임시글 A' },
        { id: 42, title: '임시글 B' },
      ],
    });
    mockPublishDraft.mockResolvedValue({ id: 41, status: 'PUBLIC' });
  });

  it('비로그인 상태면 /login 으로 리다이렉트한다', async () => {
    mockAuth.mockResolvedValue(null);

    await expect((await loadPage())()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/login?callbackUrl=/drafts');
    expect(mockListDrafts).not.toHaveBeenCalled();
  });

  it('세션의 문자열 id 를 숫자로 정규화해 listDrafts 를 호출한다', async () => {
    await (await loadPage())();

    expect(mockListDrafts).toHaveBeenCalledWith(
      { authorId: 7 },
      { prisma: { __marker: 'prisma' } },
    );
  });

  it('임시글마다 발행 form 을 하나씩 렌더한다', async () => {
    const tree = await (await loadPage())();

    expect(findForms(tree)).toHaveLength(2);
  });

  it('발행 form 을 실행하면 도메인 publishDraft 가 해당 문서로 호출된다', async () => {
    const tree = await (await loadPage())();
    const [firstForm] = findForms(tree);

    await (firstForm!.props!.action as () => Promise<void>)();

    expect(mockPublishDraft).toHaveBeenCalledTimes(1);
    expect(mockPublishDraft).toHaveBeenCalledWith(
      { documentId: 41, actor: { userId: 7, isAdmin: false } },
      { prisma: { __marker: 'prisma' } },
    );
  });

  it('발행 후 /drafts 를 revalidate 해 목록에서 사라지게 한다', async () => {
    const tree = await (await loadPage())();
    const [, secondForm] = findForms(tree);

    await (secondForm!.props!.action as () => Promise<void>)();

    expect(mockPublishDraft).toHaveBeenCalledWith(
      { documentId: 42, actor: { userId: 7, isAdmin: false } },
      { prisma: { __marker: 'prisma' } },
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/drafts');
  });

  it('관리자 세션이면 actor.isAdmin 을 true 로 넘긴다', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', isAdmin: true } });

    const tree = await (await loadPage())();
    await (findForms(tree)[0]!.props!.action as () => Promise<void>)();

    expect(mockPublishDraft).toHaveBeenCalledWith(
      { documentId: 41, actor: { userId: 1, isAdmin: true } },
      { prisma: { __marker: 'prisma' } },
    );
  });

  it('세션이 끊긴 뒤 발행을 누르면 도메인을 호출하지 않고 리다이렉트한다', async () => {
    const tree = await (await loadPage())();
    const action = findForms(tree)[0]!.props!.action as () => Promise<void>;

    mockAuth.mockResolvedValue(null);

    await expect(action()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockPublishDraft).not.toHaveBeenCalled();
  });
});
