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
  // Native binding을 가진 모듈은 Turbopack이 번들링하지 말고
  // Node.js require로 직접 로드하도록 외부화 (pnpm isolated linker 호환).
  // Note: hash-wasm은 pure WebAssembly라 외부화 불필요.
  serverExternalPackages: ['@prisma/client', 'pg'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default config;
