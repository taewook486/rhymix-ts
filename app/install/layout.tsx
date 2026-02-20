import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Installation - Rhymix TS',
  description: 'Install Rhymix TS - Modern Community Platform',
  robots: {
    index: false,
    follow: false,
  },
}

export default function InstallLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
