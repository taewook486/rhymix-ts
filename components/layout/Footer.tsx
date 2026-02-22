import Link from 'next/link'

export function Footer() {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-6 border-t">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} Rhymix TS.</span>
        <span>Powered by Next.js and Supabase.</span>
      </div>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
          소개
        </Link>
        <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
          이용약관
        </Link>
      </nav>
    </div>
  )
}
