# @rhymix-ts/point

Rhymix-TS 포인트 시스템 독립 패키지.

회원별 포인트 적립/차감 이력 관리, 잔액 캐시, 크로스 모듈 통합 훅을 제공한다.

## 설치

```bash
pnpm add @rhymix-ts/point
```

## 주요 exports

| export | 설명 |
|---|---|
| `PointService` | 포인트 CRUD 서비스 클래스 |
| `pointHooks` | 크로스 모듈 통합 훅 (document/comment/signup) |
| `getSitePointConfig` | 사이트 포인트 설정 조회 |
| `setSitePointConfig` | 사이트 포인트 설정 저장 |
| `PointSiteConfigSchema` | Zod 스키마 (사이트 설정 유효성 검증) |
| `PointAmountInvalidError` | 잘못된 amount 입력 에러 |
| `PointMemberNotFoundError` | 존재하지 않는 회원 에러 |
| `PointInsufficientError` | 잔액 부족 에러 |
| `PointDuplicateSourceError` | 중복 포인트 적립 시도 에러 |

## 기본 사용법

```typescript
import { PointService } from '@rhymix-ts/point';
import { prisma } from '@rhymix-ts/db';

// 포인트 적립
const service = new PointService(prisma);
await service.add({
  memberId: 42,
  amount: 100,
  reason: 'document.create',
  sourceType: 'DOCUMENT',
  sourceId: documentId,
  boardId: boardId,
});

// 잔액 조회
const balance = await service.getBalance(42);

// 포인트 이력 조회 (cursor 기반 페이징)
const { items, nextCursor } = await service.getHistory({
  memberId: 42,
  limit: 20,
});

// 트랜잭션 안에서 사용 (원자성 보장)
await prisma.$transaction(async (tx) => {
  // ... 문서 생성 로직
  await service.add({ memberId, amount, reason, sourceType: 'DOCUMENT', sourceId }, tx);
});
```

## 크로스 모듈 통합

`pointHooks`를 사용해 document/comment/signup 트랜잭션과 통합한다.

```typescript
import { pointHooks } from '@rhymix-ts/point';

// packages/document/src/document.ts 내부에서
await prisma.$transaction(async (tx) => {
  const document = await tx.document.create({ ... });
  await pointHooks.onDocumentCreated(tx, { board, document, authorId });
  return document;
});
```

## 사이트 설정

```typescript
import { getSitePointConfig, setSitePointConfig } from '@rhymix-ts/point';

// 현재 설정 조회
const config = await getSitePointConfig(prisma);
// { signupBonus: 0, clampToZero: true, allowNegativeBalance: false, defaultLevel: 1 }

// 설정 변경
await setSitePointConfig(prisma, {
  signupBonus: 100,
  clampToZero: true,
  allowNegativeBalance: false,
  defaultLevel: 1,
});
```

## 음수 잔액 정책 (clamp)

- `clampToZero: true` (기본값): 차감 시 잔액이 음수가 되면 0으로 클램프
- `allowNegativeBalance: true`: 음수 잔액 허용 (외상/디버트 모드)

두 옵션이 동시에 true이면 `allowNegativeBalance`가 우선한다.
