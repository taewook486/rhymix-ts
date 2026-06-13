import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  transpilePackages: [
    '@rhymix-ts/auth',
    '@rhymix-ts/board',
    '@rhymix-ts/comment',
    '@rhymix-ts/core',
    '@rhymix-ts/db',
    '@rhymix-ts/document',
    '@rhymix-ts/file',
    '@rhymix-ts/page',
    '@rhymix-ts/point',
    '@rhymix-ts/ui',
    '@rhymix-ts/theme-default',
  ],
  // Native binding을 가진 모듈은 Turbopack이 번들링하지 말고
  // Node.js require로 직접 로드하도록 외부화 (pnpm isolated linker 호환).
  // Note: hash-wasm은 pure WebAssembly라 외부화 불필요.
  serverExternalPackages: ['@prisma/client', 'pg', 'sharp'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Turbopack: alias native modules to stubs at build time.
  // sharp is a native binary loaded at runtime; Turbopack cannot bundle it.
  turbopack: {
    resolveAlias: {
      sharp: './sharp-stub.js',
    },
  },
};

export default config;
