'use client'
/**
 * 스팸필터 허브+탭 공유 레이아웃 — SPEC-CONTENT-PARITY-001 M1 (REQ-CPAR-002, design.md D-4).
 *
 * `/admin/settings/spamfilter/{ip,words,block,captcha,url}` 5개 기존 화면을 공유 탭
 * 내비게이션으로 잇는다. `/admin/spam-review`는 세그먼트가 달라(레이아웃 중첩 불가)
 * 탭 목록에 외부 링크로만 포함한다.
 *
 * 5개 화면 자체의 로직은 수정하지 않는다(PRESERVE — plan.md §2) — 이 레이아웃은
 * 래핑만 담당한다. 상위 `/admin/layout.tsx`가 세션 가드를 이미 수행하므로 여기서는
 * 중복 가드를 두지 않는다.
 *
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-002
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@rhymix-ts/ui'

interface SpamfilterTab {
  href: string
  label: string
}

const TABS: ReadonlyArray<SpamfilterTab> = [
  { href: '/admin/settings/spamfilter/ip', label: '차단 IP' },
  { href: '/admin/settings/spamfilter/words', label: '금지어' },
  { href: '/admin/settings/spamfilter/block', label: '속도 제한' },
  { href: '/admin/settings/spamfilter/captcha', label: '캡차' },
  { href: '/admin/settings/spamfilter/url', label: 'URL 블랙리스트' },
  // 별도 세그먼트 — 레이아웃 중첩 불가, 탭 목록에는 외부 링크로만 포함.
  { href: '/admin/spam-review', label: '검토 큐' },
]

export default function SpamfilterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">스팸필터</h1>
      <nav aria-label="스팸필터 탭" className="mb-6 border-b border-zinc-200">
        <ul className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cn(
                    'inline-block px-4 py-2 text-sm rounded-t border-b-2 transition-colors',
                    isActive
                      ? 'border-zinc-900 text-zinc-900 font-semibold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      {children}
    </section>
  )
}
