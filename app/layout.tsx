import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ConditionalHeader } from '@/components/layout/ConditionalHeader'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rhymix TS - Modern CMS',
  description: 'Modern React/Next.js CMS built with Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ConditionalHeader />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
