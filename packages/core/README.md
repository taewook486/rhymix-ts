# @rhymix-ts/core

Rhymix-TS 공유 도메인 타입·Zod 스키마 패키지.

설치 마법사, 테마/레이아웃 시스템 등 여러 모듈이 공통으로 참조하는 타입과 스키마를 담는다. 대부분의 다른 패키지가 이 패키지에 의존한다.

## 설치

```bash
pnpm add @rhymix-ts/core
```

## 주요 exports

| export | 설명 |
|---|---|
| `UserStatus` | 회원 상태 enum (Prisma와 동기화) |
| `dbConfigSchema` / `adminConfigSchema` / `installSessionSchema` 등 | 설치 마법사 Zod 스키마 |
| `runEnvDiagnostics` | 설치 전 환경 진단 |
| `parseManifest` / `themeTokensSchema` | 테마 매니페스트 파싱·검증 |
| `LayoutContext` / `LayoutProvider` / `useLayoutContext` | 레이아웃 시스템 React 컨텍스트 |
| `registerLayout` / `getLayout` | 레이아웃 레지스트리 |
| `renderModuleWithLayout` | 모듈 출력을 레이아웃으로 감싸는 렌더 파이프라인 |
| `./modules`, `./widgets`, `./addons` (subpath) | 모듈 정의 타입, 위젯 시스템, 애드온 훅 |

## 의존성

- `@prisma/client`, `@rhymix-ts/db`, `zod`
- `next`, `react` (peer, 선택)
