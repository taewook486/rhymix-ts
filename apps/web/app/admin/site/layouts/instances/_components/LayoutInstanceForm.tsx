'use client';

/**
 * LayoutInstanceForm.tsx — SPEC-ADMIN-002 Slice 2A.
 *
 * 새 Layout 인스턴스(ThemeAssignment) 생성 폼 (REQ-ADMIN2-021).
 * 클라이언트 컴포넌트: form 상태와 submit 처리가 필요함.
 *
 * @MX:NOTE: [AUTO] 클라이언트 컴포넌트로 분리된 이유 — form 상태와 submit 핸들러 필요.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-021
 */
import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@rhymix-ts/ui/components';
import { getServerCaller } from '@/lib/trpc/server';

interface Layout {
  id: string;
  name: string;
  title: string;
  layoutType: string;
}

interface LayoutInstanceFormProps {
  layouts: Layout[];
}

export function LayoutInstanceForm({ layouts }: LayoutInstanceFormProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedLayout, setSelectedLayout] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const caller = await getServerCaller();
      await caller.admin.layout.createInstance({
        themeId: String(formData.get('themeId')),
        scope: 'SITE',
        refId: String(formData.get('refId')),
        layoutName: String(formData.get('layoutName')),
      });
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      <h2 className="text-lg font-semibold mb-4">새 인스턴스 생성</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="layoutName" className="block text-sm font-medium text-zinc-700 mb-2">
            레이아웃 선택
          </label>
          <select
            id="layoutName"
            name="layoutName"
            value={selectedLayout}
            onChange={(e) => setSelectedLayout(e.target.value)}
            className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
            required
          >
            <option value="">레이아웃을 선택하세요</option>
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.name}>
                {layout.title} ({layout.name}) - {layout.layoutType}
              </option>
            ))}
          </select>
        </div>

        {selectedLayout && (
          <>
            <div>
              <label htmlFor="themeId" className="block text-sm font-medium text-zinc-700 mb-2">
                Theme ID
              </label>
              <input
                type="text"
                id="themeId"
                name="themeId"
                defaultValue={layouts.find((l) => l.name === selectedLayout)?.themeId}
                className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPending}
                required
              />
            </div>
            <div>
              <label htmlFor="refId" className="block text-sm font-medium text-zinc-700 mb-2">
                Ref ID (사이트 ID)
              </label>
              <input
                type="text"
                id="refId"
                name="refId"
                defaultValue="1"
                className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPending}
                required
              />
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || !selectedLayout}
          >
            {isPending ? '생성 중...' : '인스턴스 생성'}
          </Button>
        </div>
      </form>
    </div>
  );
}
