# @rhymix-ts/db

Rhymix-TS Prisma 클라이언트 패키지.

싱글턴 `PrismaClient` 인스턴스와 설치 단계에서 쓰이는 advisory lock, 트랜잭션 시드 함수를 제공한다. 거의 모든 패키지가 이 패키지에 의존한다.

## 설치

```bash
pnpm add @rhymix-ts/db
```

## 주요 exports

| export | 설명 |
|---|---|
| `prisma` | 싱글턴 `PrismaClient` (개발 환경에서 `globalThis` 캐싱, 쿼리 로깅) |
| `Prisma` / `PrismaClient` | `@prisma/client`의 타입·런타임 re-export |
| `acquireInstallLock` | 설치 동시 실행 방지용 advisory lock |
| `seedInstall` | 설치 마법사 트랜잭션 시드 |

## 개발

```bash
pnpm --filter @rhymix-ts/db prisma:generate   # Prisma Client 생성
pnpm --filter @rhymix-ts/db prisma:migrate    # 마이그레이션 (dev)
pnpm --filter @rhymix-ts/db prisma:studio     # Prisma Studio
```

## 의존성

- `@prisma/client`, `@rhymix-ts/core`, `@rhymix-ts/theme-default`, `pg`
