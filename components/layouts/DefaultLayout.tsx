'use client'

import { ReactNode } from 'react'
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer'
import { MainNav } from '@/components/layout/MainNav'
import { Footer } from '@/components/layout/Footer'

interface DefaultLayoutProps {
  children: ReactNode
  sidebarPosition?: 'left' | 'right' | 'none'
  showHeader?: boolean
  showFooter?: boolean
}

export function DefaultLayout({
  children,
  sidebarPosition = 'right',
  showHeader = true,
  showFooter = true,
}: DefaultLayoutProps) {
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

      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          {sidebarPosition === 'left' && (
            <aside className="w-72 flex-shrink-0">
              <WidgetRenderer position="sidebar_left" />
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <WidgetRenderer position="content_top" className="mb-6" />
            {children}
            <WidgetRenderer position="content_bottom" className="mt-6" />
          </main>

          {/* Right Sidebar */}
          {sidebarPosition === 'right' && (
            <aside className="w-72 flex-shrink-0">
              <WidgetRenderer position="sidebar_right" />
            </aside>
          )}
        </div>
      </div>

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
