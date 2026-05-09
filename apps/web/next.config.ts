import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  transpilePackages: [
    '@rhymix-ts/auth',
    '@rhymix-ts/core',
    '@rhymix-ts/db',
    '@rhymix-ts/ui',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default config;
