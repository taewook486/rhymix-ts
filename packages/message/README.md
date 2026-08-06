# @rhymix-ts/message

Rhymix-TS 회원 간 쪽지(메시지) 패키지.

쪽지 발송, 목록 조회, 읽음 처리, 차단 회원 처리를 담당한다.

## 설치

```bash
pnpm add @rhymix-ts/message
```

## 주요 exports

| export | 설명 |
|---|---|
| `createMessageService` / `MessageService` | 쪽지 서비스 (발송/조회/읽음/삭제/안읽음 카운트) |
| `MessageSendInputSchema` 등 | 각 동작의 Zod 입력 스키마 |
| `defaultMessageConfig` | 기본 설정 |
| `MessageReceiverNotFoundError` / `MessageBlockedError` / `MessageSelfSendError` 등 | 도메인 에러 클래스 |

## 의존성

- `@rhymix-ts/db`, `@rhymix-ts/notification`, `zod`
