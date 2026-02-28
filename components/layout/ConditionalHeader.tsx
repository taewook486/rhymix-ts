'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './Navigation'

export function ConditionalHeader() {
  const pathname = usePathname()

  // Hide header on installation pages
  if (pathname?.startsWith('/install')) {
    return null
  }

  return <Navigation />
}
