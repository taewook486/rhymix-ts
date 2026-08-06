# @rhymix-ts/auth

Rhymix-TS 인증/인가 패키지.

회원가입, 로그인, 비밀번호 해싱, 이메일 인증, 자동로그인, 비밀번호 재설정, 세션 무효화, 관리자 권한(RBAC), 소셜 로그인, 캡차 검증까지 인증 전 영역을 담당한다.

## 설치

```bash
pnpm add @rhymix-ts/auth
```

## 주요 exports

| export | 설명 |
|---|---|
| `hashPassword` / `verifyPassword` / `needsUpgrade` | Argon2id 비밀번호 해싱 |
| `signup` / `validateNickname` / `validatePasswordPolicy` | 회원가입 파이프라인 |
| `login` | 로그인 파이프라인 |
| `verifyEmail` | 이메일 인증 |
| `revokeAllSessions` / `isSessionRevoked` | 세션 무효화 |
| `resolveAdminPrivilege` / `isLastAdmin` / `assertCanDemote` | 관리자 권한(RBAC) — 마지막 관리자 강등 방지 |
| `createAutoLogin` / `verifyAutoLogin` / `revokeAutoLogin` | 자동로그인(remember me), 토큰 재사용 감지 |
| `requestPasswordReset` / `confirmPasswordReset` | 비밀번호 재설정 |
| `toggleAdminRole` / `changeUserStatus` / `softDeleteUser` | 관리자 — 회원 상태 변경 |
| `socialAuth` | 소셜 OAuth 설정 |
| `verifyTurnstileToken` | Cloudflare Turnstile 캡차 검증 |
| `createMailDispatcher` / `SmtpMailDispatcher` | 메일 발송 추상화 (SMTP) |
| `isDisposableEmail` | 일회용 이메일 도메인 차단 |

## 의존성

- `@rhymix-ts/core`, `@rhymix-ts/db`, `@rhymix-ts/point`
- `next-auth`, `hash-wasm`, `nodemailer`, `zod`
