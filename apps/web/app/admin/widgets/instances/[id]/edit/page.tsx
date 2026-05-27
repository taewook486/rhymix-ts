/**
 * 위젯 인스턴스 수정 페이지 — SPEC-WIDGET-001 Slice D
 * @MX:SPEC: SPEC-WIDGET-001 REQ-WIDGET-D-002
 */
import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@rhymix-ts/db'
import { WidgetInstanceEditForm } from './_components/WidgetInstanceEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function EditWidgetInstancePage({ params }: PageProps) {
  const { id: idStr } = await params
  const id = Number.parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const instance = await prisma.widgetInstance.findUnique({ where: { id } })
  if (!instance) notFound()

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2 text-sm">
        <Link href="/admin/widgets" className="text-zinc-500 hover:text-zinc-900">
          위젯 시스템
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="font-medium">인스턴스 수정</span>
      </header>

      <h1 className="text-2xl font-bold">위젯 인스턴스 수정</h1>
      <p className="text-sm text-zinc-500">
        <span className="font-mono text-blue-700">{instance.widgetName}</span> —{' '}
        {instance.label}
      </p>

      <WidgetInstanceEditForm
        id={instance.id}
        initialLabel={instance.label}
        initialProps={JSON.stringify(instance.props, null, 2)}
      />
    </section>
  )
}
