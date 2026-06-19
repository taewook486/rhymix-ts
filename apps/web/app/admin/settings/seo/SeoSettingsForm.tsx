'use client';
/**
 * SEO 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-118/119).
 */
import { useActionState } from 'react';
import { updateSeoSettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function SeoSettingsForm({
  initial,
}: {
  initial: {
    defaultMetaTitle?: string | null;
    defaultMetaDescription?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImageUrl?: string | null;
    canonicalUrlPolicy: 'none' | 'default' | 'custom';
    sitemapEnabled: boolean;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateSeoSettingsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      {/* 메타 태그 설정 */}
      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">메타 태그 기본값</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="defaultMetaTitle" className="block text-sm font-medium mb-1">
              기본 메타 제목 (Meta Title)
            </label>
            <input
              id="defaultMetaTitle"
              name="defaultMetaTitle"
              type="text"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.defaultMetaTitle ?? ''}
              placeholder="사이트 이름"
              maxLength={200}
            />
            <p className="text-sm text-gray-500 mt-1">
              페이지 제목이 지정되지 않은 경우 사용할 기본 제목입니다 (최대 200자).
            </p>
          </div>

          <div>
            <label htmlFor="defaultMetaDescription" className="block text-sm font-medium mb-1">
              기본 메타 설명 (Meta Description)
            </label>
            <textarea
              id="defaultMetaDescription"
              name="defaultMetaDescription"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.defaultMetaDescription ?? ''}
              placeholder="사이트 설명"
              rows={3}
              maxLength={500}
            />
            <p className="text-sm text-gray-500 mt-1">
              페이지 설명이 지정되지 않은 경우 사용할 기본 설명입니다 (최대 500자).
            </p>
          </div>
        </div>
      </div>

      {/* Open Graph 설정 */}
      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Open Graph 기본값</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="ogTitle" className="block text-sm font-medium mb-1">
              OG 제목
            </label>
            <input
              id="ogTitle"
              name="ogTitle"
              type="text"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.ogTitle ?? ''}
              placeholder="사이트 이름"
              maxLength={200}
            />
            <p className="text-sm text-gray-500 mt-1">
              소셜 미디어 공유 시 표시할 기본 제목입니다 (최대 200자).
            </p>
          </div>

          <div>
            <label htmlFor="ogDescription" className="block text-sm font-medium mb-1">
              OG 설명
            </label>
            <textarea
              id="ogDescription"
              name="ogDescription"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.ogDescription ?? ''}
              placeholder="사이트 설명"
              rows={3}
              maxLength={500}
            />
            <p className="text-sm text-gray-500 mt-1">
              소셜 미디어 공유 시 표시할 기본 설명입니다 (최대 500자).
            </p>
          </div>

          <div>
            <label htmlFor="ogImageUrl" className="block text-sm font-medium mb-1">
              OG 이미지 URL
            </label>
            <input
              id="ogImageUrl"
              name="ogImageUrl"
              type="url"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.ogImageUrl ?? ''}
              placeholder="https://example.com/og-image.jpg"
            />
            <p className="text-sm text-gray-500 mt-1">
              소셜 미디어 공유 시 표시할 대표 이미지 URL입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Canonical URL 설정 */}
      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Canonical URL 정책</h2>

        <div>
          <label htmlFor="canonicalUrlPolicy" className="block text-sm font-medium mb-1">
            Canonical URL 사용 정책
          </label>
          <select
            id="canonicalUrlPolicy"
            name="canonicalUrlPolicy"
            className="w-full border rounded px-3 py-2"
            defaultValue={initial.canonicalUrlPolicy}
          >
            <option value="none">사용안함</option>
            <option value="default">기본 URL 사용</option>
            <option value="custom">사용자 정의</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            중복 콘텐츠 문제를 방지하기 위한 canonical 태그 사용 정책입니다.
          </p>
        </div>
      </div>

      {/* Sitemap 설정 */}
      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Sitemap.xml 생성</h2>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="sitemapEnabled"
              className="rounded mr-2"
              defaultChecked={initial.sitemapEnabled}
            />
            <span className="text-sm font-medium">Sitemap.xml 생성 활성화</span>
          </label>
        </div>
        <p className="text-sm text-gray-500 mt-3 ml-6">
          활성화 시 /sitemap.xml 경로로 공개 문서/페이지 목록을 제공합니다.
          검색 엔진에 사이트 구조를 알리는 데 도움이 됩니다.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
