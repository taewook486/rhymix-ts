/**
 * apps/web/app/admin/boards/[mid]/categories/page.tsx
 * SPEC-BOARD-CRUD-001 REQ-BOARD-080, REQ-BOARD-081
 * 게시판 카테고리 CRUD 관리자 페이지.
 */
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';

interface CategoriesPageProps {
  params: Promise<{ mid: string }>;
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { mid } = await params;

  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;
  if (!Number.isFinite(siteId) || siteId <= 0) notFound();

  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect('/login?callbackUrl=/admin/boards/[mid]/categories');
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) notFound();

  const board = await prisma.board.findUnique({
    where: { moduleInstanceId: instance.id },
  });
  if (!board) notFound();

  const categories = await prisma.documentCategory.findMany({
    where: { boardId: board.id },
    orderBy: { listOrder: 'asc' },
  });

  // TypeScript 클로저 narrowing 을 위해 board.id 를 미리 추출
  const boardId = board.id;

  // Server Action: 카테고리 추가
  async function addCategory(formData: FormData) {
    'use server';

    const title = String(formData.get('title') ?? '');
    const description = String(formData.get('description') ?? '') || null;
    const parentId = formData.get('parentId') ? Number(formData.get('parentId')) : null;
    const color = String(formData.get('color') ?? '') || null;
    const maxOrder =
      categories.length > 0 ? Math.max(...categories.map((c) => c.listOrder)) + 1 : 0;

    await prisma.documentCategory.create({
      data: {
        boardId,
        title,
        description,
        parentId,
        color,
        listOrder: maxOrder,
      },
    });

    redirect(`/admin/boards/${mid}/categories`);
  }

  // Server Action: 카테고리 삭제
  async function deleteCategory(formData: FormData) {
    'use server';

    const categoryId = Number(formData.get('categoryId'));

    await prisma.documentCategory.delete({
      where: { id: categoryId },
    });

    redirect(`/admin/boards/${mid}/categories`);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{instance.name} — 카테고리 관리</h1>
        <p className="text-sm text-zinc-500 mt-1">
          게시판 카테고리를 추가, 수정, 삭제합니다.
        </p>
      </header>

      {/* 카테고리 목록 */}
      <div className="border border-zinc-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium">순서</th>
              <th className="text-left px-4 py-2 font-medium">제목</th>
              <th className="text-left px-4 py-2 font-medium">설명</th>
              <th className="text-left px-4 py-2 font-medium">색상</th>
              <th className="text-left px-4 py-2 font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-zinc-500">
                  등록된 카테고리가 없습니다.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="px-4 py-2">{category.listOrder}</td>
                  <td className="px-4 py-2">{category.title}</td>
                  <td className="px-4 py-2 text-zinc-500">{category.description ?? '—'}</td>
                  <td className="px-4 py-2">
                    {category.color ? (
                      <span
                        className="inline-block w-6 h-6 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <form action={deleteCategory} className="inline">
                      <input type="hidden" name="categoryId" value={category.id} />
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

      {/* 카테고리 추가 폼 */}
      <form action={addCategory} className="space-y-4">
        <h2 className="text-lg font-semibold">카테고리 추가</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              제목 *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={100}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="color" className="block text-sm font-medium mb-1">
              색상
            </label>
            <input
              id="color"
              name="color"
              type="color"
              className="w-full h-10 border border-zinc-300 rounded-md"
            />
          </div>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            설명
          </label>
          <input
            id="description"
            name="description"
            type="text"
            maxLength={250}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="parentId" className="block text-sm font-medium mb-1">
            상위 카테고리
          </label>
          <select
            id="parentId"
            name="parentId"
            className="w-full px-3 py-2 border border-zinc-300 rounded-md"
          >
            <option value="">없음</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.title}
              </option>
            ))}
          </select>
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
