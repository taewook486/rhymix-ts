'use client'

import { ReactNode } from 'react'
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer'
import { MainNav } from '@/components/layout/MainNav'
import { Footer } from '@/components/layout/Footer'

interface FullWidthLayoutProps {
  children: ReactNode
  showHeader?: boolean
  showFooter?: boolean
}

export function FullWidthLayout({
  children,
  showHeader = true,
  showFooter = true,
}: FullWidthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4">
            <MainNav />
            <WidgetRenderer position="header" className="py-2" />
          </div>
        </header>
      )}

      <main className="flex-1">
        <WidgetRenderer position="content_top" />
        {children}
        <WidgetRenderer position="content_bottom" />
      </main>

      {showFooter && (
        <footer className="border-t mt-12">
          <div className="container mx-auto px-4 py-6">
            <WidgetRenderer position="footer" />
            <Footer />
          </div>
        </footer>
      )}
    </div>
  )
}
