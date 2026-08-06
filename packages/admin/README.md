# @rhymix-ts/admin

Rhymix-TS 관리자 기능 패키지.

사이트 설정, 내보내기/가져오기, 2단계 인증, IP 접근 제어, 즐겨찾기, 통계, 로그 등 관리자 화면에서 쓰이는 기능을 모아둔다.

## 설치

```bash
pnpm add @rhymix-ts/admin
```

## 주요 exports

| export | 설명 |
|---|---|
| `serializeBundle` / `dryRun` / `applyImport` | 사이트 설정 내보내기·가져오기 (dry-run + 충돌 리포트) |
| `checkAdmin2FA` / `getSiteAdminTwoFactorPolicy` | 관리자 2단계 인증 정책 조회·검증 |
| `getIpControlSettings` / `checkIpAccess` | IP 허용/차단 목록 관리 |
| `parseIpFilter` / `matchesIpFilter` | 로그 조회용 IP 필터 파싱 |
| `validateFavoriteHref` | 관리자 즐겨찾기 URL 유효성 검증 |
| `invalidateAdminMenuCache` / `purgeExpiredSessions` | 관리자 유틸리티 (캐시 무효화, 세션 정리) |
| `validatePresetProps` | 위젯 프리셋 속성 검증 |
| `export * from './settings'` | `SiteSetting` 기반 설정 CRUD (알림/보안/SEO/사이트락 등) |
| `export * from './stats'` | 대시보드 통계 |
| `export * from './poll/poll'` | 투표 관리자 기능 |

## 의존성

- `@prisma/client`, `ipaddr.js`, `zod`
