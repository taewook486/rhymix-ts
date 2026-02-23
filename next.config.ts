import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Allow server actions in 'use server' files
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Disable static generation for problematic routes
  skipTrailingSlashRedirect: false,
}

export default nextConfig
