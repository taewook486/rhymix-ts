# @rhymix-ts/test-utils

Rhymix-TS 테스트 공용 유틸리티 패키지.

여러 패키지의 유닛 테스트에서 공통으로 쓰는 Prisma mock 헬퍼를 제공한다. `devDependencies`로만 사용된다.

## 설치

```bash
pnpm add -D @rhymix-ts/test-utils
```

## 주요 exports

| export | 설명 |
|---|---|
| `createMockPrismaClient` | `vitest-mock-extended` 기반 `PrismaClient` mock 생성 |
| `MockPrismaClient` (type) | 위 mock의 타입 |

## 사용 예

```typescript
import { createMockPrismaClient } from '@rhymix-ts/test-utils';

const prisma = createMockPrismaClient();
prisma.document.findUnique.mockResolvedValue(fixture);
```

## 의존성

- `@prisma/client`, `vitest-mock-extended`
