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
    // 업로드 라우트/스토리지와 동일한 입력 형태로 타입을 명시한다 —
    // mock.calls[n][0].key 로 쓴 키를 꺼내는 D2 검증에 필요하다
    write: vi.fn(
      async (_input: { key: string; body: Buffer | Uint8Array; contentType: string }) => {},
    ),
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

// D5 — 실제 포맷 매직바이트 픽스처 (선언 MIME ↔ 바이트 일치 검증 회귀)
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x01]); // "GIF89a"
const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, // "RIFF"……"WEBP"
]);
// RIFF 헤더는 맞지만 WEBP 가 아님(WAVE) — WebP 추가 시그니처 검증용
const riffWavBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, // "RIFF"……"WAVE"
]);

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

// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 감사 결함 D2 — 업로드 후 실패 경로의 storageKey 회수
//
// updateMenuItemAction 은 zod 검증·tRPC 호출보다 먼저 storage.write 를
// 수행한다. 업로드 이후 실패(뒤 필드 거부·zod 실패·tRPC 예외)에서 이미 쓴
// 키를 회수하지 않으면 고아 파일이 저장소에 영구 남는다. 성공 경로와
// 업로드 이전 실패 경로는 아무것도 삭제하지 않아야 한다.
// ---------------------------------------------------------------------------

describe('D2: 업로드 후 실패 경로의 storageKey 회수', () => {
  function writtenKeyOf(call: number): string {
    return fileMocks.storage.write.mock.calls[call]![0].key;
  }

  it('뒤 필드 거부 — 앞 필드가 쓴 키는 회수된다', async () => {
    // normalBtnFile 은 통과(키 1개 기록), hoverBtnFile 을 이미지 MIME 게이트에서 거부
    fileMocks.isImageMimeType.mockImplementation((m: string) => m !== 'image/gif');
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
      hoverBtnFile: new File([pngBytes], 'hover.gif', { type: 'image/gif' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBeTruthy();
    // normalBtn 1개만 저장소에 기록되었다
    expect(fileMocks.storage.write).toHaveBeenCalledTimes(1);
    // 실패 반환 직전에 그 키가 회수되어야 한다 (고아 파일 방지)
    expect(fileMocks.storage.delete).toHaveBeenCalledTimes(1);
    expect(fileMocks.storage.delete).toHaveBeenCalledWith(writtenKeyOf(0));
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('zod 검증 실패 — 업로드된 키는 회수된다', async () => {
    const fd = makeForm({
      ...baseEntries(),
      listOrder: 'abc', // z.coerce.number().int() 실패
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).fieldErrors).toBeTruthy();
    expect(fileMocks.storage.write).toHaveBeenCalledTimes(1);
    expect(fileMocks.storage.delete).toHaveBeenCalledTimes(1);
    expect(fileMocks.storage.delete).toHaveBeenCalledWith(writtenKeyOf(0));
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('tRPC 예외 — 업로드된 키는 회수된다', async () => {
    updateFn.mockRejectedValueOnce(
      new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'db down' }),
    );
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBe('db down');
    expect(fileMocks.storage.write).toHaveBeenCalledTimes(1);
    expect(fileMocks.storage.delete).toHaveBeenCalledTimes(1);
    expect(fileMocks.storage.delete).toHaveBeenCalledWith(writtenKeyOf(0));
  });

  it('성공 경로 — 업로드된 키는 회수되지 않는다', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown> | null)?.error).toBeUndefined();
    expect(fileMocks.storage.write).toHaveBeenCalledTimes(1);
    expect(fileMocks.storage.delete).not.toHaveBeenCalled();
    expect(updateFn).toHaveBeenCalledTimes(1);
  });

  it('업로드 이전 실패(그룹 목록 조회 오류) — 쓰지도 삭제하지도 않는다', async () => {
    callerMock.admin.group.list.mockRejectedValueOnce(new Error('boom'));
    const fd = makeForm({
      ...baseEntries(),
      groupIds: '5',
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBe(
      '그룹 목록 조회 중 오류가 발생했습니다.',
    );
    expect(fileMocks.storage.write).not.toHaveBeenCalled();
    expect(fileMocks.storage.delete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 감사 결함 D5 — 선언 MIME 신뢰 결함 (매직바이트 검증)
//
// 업로드 파이프라인이 선언된 Content-Type 만 검사하고 실제 바이트를
// 확인하지 않았다. storage.write 이전에 버퍼 선두 바이트의 시그니처
// (PNG/JPEG/GIF/WebP)와 선언 MIME 의 일치를 강제한다. SVG 등 스크립트
// 삽입이 가능한 형식은 시그니처 표에 없는 MIME 이라 자동 거부된다.
// ---------------------------------------------------------------------------

describe('D5: 선언 MIME ↔ 실제 바이트 시그니처 일치 검증', () => {
  it('일치하는 시그니처는 통과한다 (PNG)', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([pngBytes], 'normal.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown> | null)?.error).toBeUndefined();
    expect(fileMocks.storage.write).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenCalledTimes(1);
  });

  it('일치하는 시그니처는 통과한다 (GIF8)', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([gifBytes], 'normal.gif', { type: 'image/gif' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown> | null)?.error).toBeUndefined();
    expect(fileMocks.storage.write).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenCalledTimes(1);
  });

  it('일치하는 시그니처는 통과한다 (RIFF+WEBP)', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([webpBytes], 'normal.webp', { type: 'image/webp' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown> | null)?.error).toBeUndefined();
    expect(fileMocks.storage.write).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenCalledTimes(1);
  });

  it('선언 PNG + JPEG 바이트 — storage.write 이전에 거부된다', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([jpegBytes], 'fake.png', { type: 'image/png' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBeTruthy();
    expect(fileMocks.storage.write).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('선언 WebP + RIFF/WAVE 바이트 — 추가 시그니처(WEBP) 불일치로 거부된다', async () => {
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([riffWavBytes], 'fake.webp', { type: 'image/webp' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBeTruthy();
    expect(fileMocks.storage.write).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('SVG(image/svg+xml) 선언 — 래스터 시그니처 표에 없는 MIME 은 거부된다', async () => {
    // isImageMimeType mock 은 기본적으로 항상 true 를 반환하므로(위
    // beforeEach), SVG 가 선언 MIME 게이트를 통과해 도달하는 경로를 그대로
    // 재현한다 — D5 게이트 자체가 SVG 를 거부해야 한다.
    const svgBytes = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    const fd = makeForm({
      ...baseEntries(),
      normalBtnFile: new File([svgBytes], 'evil.svg', { type: 'image/svg+xml' }),
    });

    const res = await updateMenuItemAction(null, fd);

    expect((res as Record<string, unknown>).error).toBeTruthy();
    expect(fileMocks.storage.write).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });
});
