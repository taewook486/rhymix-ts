# @rhymix-ts/spam

Rhymix-TS 스팸 필터링 패키지.

작성 콘텐츠(문서/댓글)를 규칙 기반으로 스팸 판정하고, 관리자용 스팸 로그·차단 규칙을 제공한다.

## 설치

```bash
pnpm add @rhymix-ts/spam
```

## 주요 exports

| export | 설명 |
|---|---|
| `export * from './filter'` | 스팸 판정 필터 로직 |
| `export * from './types'` | 스팸 관련 타입 |
| `./router` (subpath) | tRPC 라우터 |

## 의존성

- `@rhymix-ts/core`, `@rhymix-ts/db`, `@trpc/server`, `hash-wasm`, `zod`
