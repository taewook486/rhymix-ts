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
  // isomorphic-dompurify(jsdom)는 __dirname 기준 fs.readFileSync로 자체
  // default-stylesheet.css를 로드하는데, Turbopack이 번들링 시 __dirname을
  // 가상 경로(/ROOT)로 치환해버려 ENOENT가 발생한다 — 외부화로 우회.
  serverExternalPackages: ['@prisma/client', 'pg', 'sharp', 'isomorphic-dompurify', 'jsdom'],
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
