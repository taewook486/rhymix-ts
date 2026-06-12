/**
 * apps/web/app/admin/boards/[mid]/extra-keys/page.tsx
 * SPEC-BOARD-CRUD-001 REQ-BOARD-082, REQ-BOARD-083
 * 게시판 확장 변수(extraVars) 키 CRUD 관리자 페이지.
 */
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { Prisma } from '@prisma/client';

interface ExtraKeysPageProps {
  params: Promise<{ mid: string }>;
}

export default async function ExtraKeysPage({ params }: ExtraKeysPageProps) {
  const { mid } = await params;

  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;
  if (!Number.isFinite(siteId) || siteId <= 0) notFound();

  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect('/login?callbackUrl=/admin/boards/[mid]/extra-keys');
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) notFound();

  const board = await prisma.board.findUnique({
    where: { moduleInstanceId: instance.id },
  });
  if (!board) notFound();

  // TypeScript 클로저 narrowing 을 위해 board.id 를 미리 추출
  const boardId = board.id;

  const extraKeys = await prisma.documentExtraKey.findMany({
    where: { boardId, langCode: 'ko' },
    orderBy: { varIdx: 'asc' },
  });

  // Server Action: 확장 변수 키 추가
  async function addExtraKey(formData: FormData) {
    'use server';

    const varName = String(formData.get('varName') ?? '');
    const varType = String(formData.get('varType') ?? 'text');
    const varIsRequired = formData.get('varIsRequired') === 'on';
    const varSearch = formData.get('varSearch') === 'on';
    const varSort = formData.get('varSort') === 'on';
    const varOptionsStr = String(formData.get('varOptions') ?? '');

    const varOptions: Prisma.InputJsonValue | typeof Prisma.JsonNull = varOptionsStr
      ? varOptionsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : Prisma.JsonNull;

    const varIdx = extraKeys.length > 0 ? Math.max(...extraKeys.map((k) => k.varIdx)) + 1 : 0;

    await prisma.documentExtraKey.create({
      data: {
        boardId,
        langCode: 'ko',
        varIdx,
        varName,
        varType,
        varIsRequired,
        varSearch,
        varSort,
        varOptions,
      },
    });

    redirect(`/admin/boards/${mid}/extra-keys`);
  }

  // Server Action: 확장 변수 키 삭제
  async function deleteExtraKey(formData: FormData) {
    'use server';

    const varIdx = Number(formData.get('varIdx'));

    await prisma.documentExtraKey.deleteMany({
      where: { boardId, varIdx },
    });

    redirect(`/admin/boards/${mid}/extra-keys`);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{instance.name} — 확장 변수 관리</h1>
        <p className="text-sm text-zinc-500 mt-1">
          게시글 작성 시 추가 입력 필드(확장 변수)를 정의합니다.
        </p>
      </header>

      {/* 확장 변수 목록 */}
      <div className="border border-zinc-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium">순서</th>
              <th className="text-left px-4 py-2 font-medium">변수명</th>
              <th className="text-left px-4 py-2 font-medium">입력 타입</th>
              <th className="text-left px-4 py-2 font-medium">필수</th>
              <th className="text-left px-4 py-2 font-medium">검색</th>
              <th className="text-left px-4 py-2 font-medium">정렬</th>
              <th className="text-left px-4 py-2 font-medium">옵션</th>
              <th className="text-left px-4 py-2 font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {extraKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-zinc-500">
                  등록된 확장 변수가 없습니다.
                </td>
              </tr>
            ) : (
              extraKeys.map((key) => (
                <tr key={key.varIdx} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="px-4 py-2">{key.varIdx}</td>
                  <td className="px-4 py-2 font-mono text-xs text-blue-700">{key.varName}</td>
                  <td className="px-4 py-2">{key.varType}</td>
                  <td className="px-4 py-2">
                    {key.varIsRequired ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                        필수
                      </span>
                    ) : (
                      <span className="text-zinc-400">선택</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{key.varSearch ? '✓' : '—'}</td>
                  <td className="px-4 py-2">{key.varSort ? '✓' : '—'}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {Array.isArray(key.varOptions)
                      ? (key.varOptions as string[]).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <form action={deleteExtraKey} className="inline">
                      <input type="hidden" name="varIdx" value={key.varIdx} />
                      <button
                        type="submit"
                        className="text-red-600 hover:underline text-xs mr-3"
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 확장 변수 추가 폼 */}
      <form action={addExtraKey} className="space-y-4">
        <h2 className="text-lg font-semibold">확장 변수 추가</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="varName" className="block text-sm font-medium mb-1">
              변수명 *
            </label>
            <input
              id="varName"
              name="varName"
              type="text"
              required
              pattern="[a-z0-9_]+"
              placeholder="영문 소문자, 숫자, _ 만 허용"
              className="w-full px-3 py-2 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="varType" className="block text-sm font-medium mb-1">
              입력 타입 *
            </label>
            <select
              id="varType"
              name="varType"
              className="w-full px-3 py-2 border border-zinc-300 rounded-md"
            >
              <option value="text">단문 텍스트</option>
              <option value="textarea">장문 텍스트</option>
              <option value="select">단일 선택 (select)</option>
              <option value="checkbox">체크박스 (checkbox)</option>
              <option value="date">날짜 (date)</option>
            </select>
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input id="varIsRequired" name="varIsRequired" type="checkbox" className="w-4 h-4" />
            필수 입력
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input id="varSearch" name="varSearch" type="checkbox" className="w-4 h-4" />
            검색 허용
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input id="varSort" name="varSort" type="checkbox" className="w-4 h-4" />
            정렬 허용
          </label>
        </div>
        <div>
          <label htmlFor="varOptions" className="block text-sm font-medium mb-1">
            옵션 (select/checkbox용, 쉼표 구분)
          </label>
          <input
            id="varOptions"
            name="varOptions"
            type="text"
            placeholder="예: 옵션1,옵션2,옵션3"
            className="w-full px-3 py-2 border border-zinc-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          추가
        </button>
      </form>
    </section>
  );
}
