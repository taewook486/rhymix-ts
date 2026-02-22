import { cookies } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MessageSquare, Users } from 'lucide-react'
import { getLocale } from '@/lib/i18n/config'
import type { Locale } from '@/lib/i18n/config'
import koTranslations from '@/lib/i18n/locales/ko.json'
import enTranslations from '@/lib/i18n/locales/en.json'
import jaTranslations from '@/lib/i18n/locales/ja.json'
import zhTranslations from '@/lib/i18n/locales/zh.json'

const translations: Record<Locale, typeof koTranslations> = {
  ko: koTranslations,
  en: enTranslations,
  ja: jaTranslations,
  zh: zhTranslations,
}

interface BoardPageProps {
  params: Promise<{ locale: string }>
}

export default async function LocaleBoardPage({ params }: BoardPageProps) {
  const { locale: localeParam } = await params
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value

  const locale = getLocale(localeParam, localeCookie) as Locale
  const t = translations[locale]

  const supabase = await createClient()

  // Fetch all boards
  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .order('order_index', { ascending: true })

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t.board.title}</h1>
        <p className="text-muted-foreground mt-2">
          {t.board.selectBoard}
        </p>
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Link key={board.id} href={`/${locale}/board/${board.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {board.title}
                  </CardTitle>
                  {board.description && (
                    <CardDescription>{board.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {t.board.posts}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t.board.active}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t.board.noBoards}</CardTitle>
            <CardDescription>{t.board.noBoardsDesc}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
