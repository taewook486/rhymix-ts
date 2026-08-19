/**
 * SPEC-LEGACY-PARITY-001 M3 — updateMenuItemAction 버튼 이미지 왕복 (AC-SITE-002/003).
 *
 * AC-SITE-002: normal/hover/active 3종을 파일로 업로드하면 이미지 참조형
 * `{"image": <storageKey>}`로 저장된다 (design.md D1 형태).
 * AC-SITE-003: 상태별 제거 플래그(removeNormalBtn 등)는 해당 상태만 null로 비우고
 * 나머지 두 상태에 영향주지 않는다.
 *
 * 현재 액션은 버튼 필드를 JSON 텍스트영역 문자열(normalBtn=...)로만 읽으므로
 * 파일 업로드·제거 플래그 해석이 전혀 없다 — 이 파일이 RED로 재현한다.
 *
 * 업로드 처리는 /api/files/upload 라우트와 동일한 packages/file 파이프라인
 * (assertMimeAllowed → assertSizeAllowed → storage.write → scanner.scan)을
 * 액션 내에서 재사용한다 (design.md D2 — 신규 엔드포인트 금지).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { getServerCaller } from '@/lib/trpc/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import {
  createMenuAction,
  createMenuItemAction,
  deleteMenuAction,
  deleteMenuItemAction,
  duplicateMenuItemAction,
  updateMenuItemAction,
} from './actions';

// ---------------------------------------------------------------------------
// 모듈 모킹 — 액션이 의존하는 서버 인프라 전부 (인증·캐시·tRPC·파일 파이프라인)
// ---------------------------------------------------------------------------

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/trpc/server', () => ({ getServerCaller: vi.fn() }));
vi.mock('@/lib/auth/config', () => ({ auth: vi.fn() }));
vi.mock('@/lib/admin/site-context', () => ({ getCurrentSiteId: vi.fn(async () => 1) }));

// packages/file 모킹 — vi.hoisted로 팩토리보다 먼저 초기화되는 참조를 만든다.
const fileMocks = vi.hoisted(() => ({
  storage: {
    write: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    getDownloadUrl: vi.fn(),
  },
  // 반환 타입을 명시한다 — 추론에 맡기면 threats 가 never[] 로 좁혀져
  // 악성 판정 케이스의 mockImplementation 이 타입 오류가 된다.
  scan: vi.fn(async (): Promise<{ clean: boolean; threats: string[] }> => ({
    clean: true,
    threats: [],
  })),
  isImageMimeType: vi.fn((_mimeType: string) => true),
  assertMimeAllowed: vi.fn(),
  assertSizeAllowed: vi.fn(),
}));
vi.mock('@rhymix-ts/file', () => ({
  getStorage: () => fileMocks.storage,
  getScanner: () => ({ scan: fileMocks.scan }),
  isImageMimeType: (mimeType: string) => fileMocks.isImageMimeType(mimeType),
  assertMimeAllowed: fileMocks.assertMimeAllowed,
  assertSizeAllowed: fileMocks.assertSizeAllowed,
}));

// ---------------------------------------------------------------------------
// tRPC caller 모킹 — 액션이 호출하는 admin.menuItem.update 페이로드를 포착한다
// ---------------------------------------------------------------------------

// 인자 타입을 명시해야 mock.calls[n][0] 로 페이로드를 꺼낼 수 있다
// (인자 없는 vi.fn() 은 calls 가 빈 튜플이라 인덱싱이 타입 오류가 된다).
const updateFn = vi.fn(async (_input: Record<string, unknown>) => ({}));
const duplicateFn = vi.fn(async (_input: { id: number }) => ({ id: 1001, created: 4 }));
const deleteItemFn = vi.fn(async () => ({}));
const callerMock = {
  admin: {
    menuItem: { update: updateFn, duplicate: duplicateFn, delete: deleteItemFn },
    group: { list: vi.fn(async () => ({ items: [] })) },
  },
};

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeForm(entries: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [name, value] of Object.entries(entries)) fd.append(name, value);
  return fd;
}

function baseEntries(): Record<string, string> {
  return { id: '7', menuId: '2', title: 'M3-버튼항목', groupIds: '' };
}

beforeEach(() => {
  vi.clearAllMocks();
  // 기본값: 인가된 관리자 세션 (기존 케이스는 모두 권한 있는 호출자를 전제한다)
  vi.mocked(auth).mockResolvedValue({ user: { id: 1, isAdmin: true } });
  vi.mocked(getServerCaller).mockResolvedValue(
    callerMock as unknown as Awaited<ReturnType<typeof getServerCaller>>,
  );
  fileMocks.isImageMimeType.mockImplementation(() => true);
  fileMocks.scan.mockImplementation(async () => ({ clean: true, threats: [] }));
});

// ---------------------------------------------------------------------------
// AC-SITE-002 — 파일 업로드 → 이미지 참조형 저장
// ---------------------------------------------------------------------------

describe('AC-SITE-002: 버튼 이미지 파일 업로드', () => {
  it('normalBtnFile File 업로드 → {"image": <storageKey>}로 저장된다', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown> | null)?.error).toBeUndefined();
    expect(updateFn).toHaveBeenCalledTimes(1);
    const payload = updateFn.mock.calls[0]![0] as Record<string, unknown>;
    // 스토리지 참조 키 형식: YYYY/MM/uuid (업로드 라우트와 동일한 규약)
    expect(payload.normalBtn).toEqual({
      image: expect.stringMatching(/^\d{4}\/\d{2}\/[0-9a-f-]{36}$/),
    });
    // 업로드 파이프라인이 실제로 돌았는지 (packages/file 재사용 — D2)
    expect(fileMocks.storage.write).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'image/png' }),
    );
    expect(fileMocks.scan).toHaveBeenCalledTimes(1);
  });

  it('이미지가 아닌 MIME은 거부된다 (이미지 파일만 허용)', async () => {
    fileMocks.isImageMimeType.mockImplementation(() => false);
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([new Uint8Array([1, 2, 3])], 'mal.html', {
        type: 'text/html',
      }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBeTruthy();
    expect(fileMocks.storage.write).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('악성으로 판정된 파일은 저장소에서 삭제되고 오류를 반환한다', async () => {
    fileMocks.scan.mockImplementation(async () => ({
      clean: false,
      threats: ['EICAR'],
    }));
    const fd = makeForm({
      ...baseEntries(),
      hoverBtnFile: new File([pngBytes], 'hover.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBeTruthy();
    expect(fileMocks.storage.delete).toHaveBeenCalledTimes(1);
    expect(updateFn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC-SITE-003 — 상태별 제거 (해당 상태만 null, 나머지 불변)
// ---------------------------------------------------------------------------

describe('AC-SITE-003: 버튼 이미지 상태별 제거', () => {
  it('removeNormalBtn 플래그 → normalBtn만 null, 다른 상태는 undefined(변경 없음)', async () => {
    const fd = makeForm({ ...baseEntries(), removeNormalBtn: '1' });

    await updateMenuItemAction(null, fd);

    const payload = updateFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.normalBtn).toBeNull();
    expect(payload.hoverBtn).toBeUndefined();
    expect(payload.activeBtn).toBeUndefined();
  });

  it('업로드와 제거 혼합 — 제거된 상태만 null, 업로드된 상태는 참조형', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
      removeHoverBtn: '1',
    });

    await updateMenuItemAction(null, fd);

    const payload = updateFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.normalBtn).toEqual({
      image: expect.stringMatching(/^\d{4}\/\d{2}\/[0-9a-f-]{36}$/),
    });
    expect(payload.hoverBtn).toBeNull();
    expect(payload.activeBtn).toBeUndefined();
  });

  it('파일도 제거 플래그도 없으면 해당 필드는 변경 없음(undefined)', async () => {
    const fd = makeForm(baseEntries());

    await updateMenuItemAction(null, fd);

    const payload = updateFn.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.normalBtn).toBeUndefined();
    expect(payload.hoverBtn).toBeUndefined();
    expect(payload.activeBtn).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 M4 — duplicateMenuItemAction (AC-SITE-001 액션 위임)
//
// 액션은 getServerCaller 로 tRPC duplicate 에 위임만 한다 (Prisma 직접 호출
// 금지 — 위임 구조 요건). 동적 import 로 가져오므로 export 가 없으면
// undefined 호출 TypeError 로 RED 가 재현된다.
// ---------------------------------------------------------------------------

describe('M4: duplicateMenuItemAction — tRPC duplicate 위임', () => {
  it('duplicate({id}) 위임 + /admin/menu/<menuId> revalidate + {ok:true} 반환', async () => {
    const actions = await import('./actions');

    const res = await actions.duplicateMenuItemAction(1, 2);

    expect(res).toEqual({ ok: true });
    expect(duplicateFn).toHaveBeenCalledTimes(1);
    expect(duplicateFn).toHaveBeenCalledWith({ id: 1 });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/admin/menu/2');
  });

  it('TRPCError 는 {error: message} 로 변환된다', async () => {
    duplicateFn.mockRejectedValueOnce(
      new TRPCError({ code: 'NOT_FOUND', message: 'menu item not found' }),
    );

    const actions = await import('./actions');
    const res = await actions.duplicateMenuItemAction(999, 2);

    expect(res).toEqual({ error: 'menu item not found' });
  });
});

// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 감사 결함 D1 — 액션 진입점 관리자 인가 게이트
//
// proxy.ts 의 경로 allowlist + 말단 tRPC protectedAdminProcedure 만으로는
// 부족하다: Server Action 은 전역 주소 지정이 가능해 비보호 경로(`/`)로 POST 하면
// proxy 를 통과하고 액션 본문이 비인증 상태로 진입한다. 특히
// updateMenuItemAction 은 말단 게이트 이전에 storage.write(디스크 쓰기)를 수행한다.
// 따라서 6개 액션 모두 진입 시점에 스스로 인가를 강제해야 한다 (다층 방어).
// ---------------------------------------------------------------------------

describe('D1: Server Action 진입점 관리자 인가 게이트', () => {
  const DENIED = '관리자 권한이 필요합니다.';

  beforeEach(() => {
    // 비인증 — auth() 가 세션을 반환하지 않는다
    vi.mocked(auth).mockResolvedValue(null);
  });

  it('updateMenuItemAction — 업로드 부작용(storage.write) 이전에 차단된다', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBe(DENIED);
    expect(fileMocks.storage.write).not.toHaveBeenCalled();
    expect(fileMocks.scan).not.toHaveBeenCalled();
    expect(vi.mocked(getServerCaller)).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('deleteMenuItemAction — tRPC 위임 없이 차단된다', async () => {
    const res = await deleteMenuItemAction(7, 2);

    expect(res).toEqual({ error: DENIED });
    expect(vi.mocked(getServerCaller)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it('duplicateMenuItemAction — tRPC 위임 없이 차단된다', async () => {
    const res = await duplicateMenuItemAction(1, 2);

    expect(res).toEqual({ error: DENIED });
    expect(duplicateFn).not.toHaveBeenCalled();
    expect(vi.mocked(getServerCaller)).not.toHaveBeenCalled();
  });

  it('createMenuAction — tRPC 위임 없이 차단된다', async () => {
    const res = await createMenuAction(null, makeForm({ title: '새 메뉴' }));

    expect((res as Record<string, unknown>).error).toBe(DENIED);
    expect(vi.mocked(getServerCaller)).not.toHaveBeenCalled();
  });

  it('deleteMenuAction — tRPC 위임 없이 차단된다', async () => {
    const res = await deleteMenuAction(3);

    expect(res).toEqual({ error: DENIED });
    expect(vi.mocked(getServerCaller)).not.toHaveBeenCalled();
  });

  it('createMenuItemAction — tRPC 위임 없이 차단된다', async () => {
    const res = await createMenuItemAction(
      null,
      makeForm({ menuId: '2', title: '새 항목' }),
    );

    expect((res as Record<string, unknown>).error).toBe(DENIED);
    expect(vi.mocked(getServerCaller)).not.toHaveBeenCalled();
  });

  it('인가된 관리자 세션에서는 기존 경로가 그대로 동작한다', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 1, isAdmin: true } });

    const res = await deleteMenuItemAction(7, 2);

    expect(res).toEqual({ ok: true });
    expect(vi.mocked(getServerCaller)).toHaveBeenCalledTimes(1);
  });
});
