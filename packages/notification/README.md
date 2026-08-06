# @rhymix-ts/notification

Rhymix-TS 알림 패키지.

댓글/쪽지 등 다른 모듈에서 발생한 이벤트를 알림으로 만들어 회원별로 조회·읽음 처리한다.

## 설치

```bash
pnpm add @rhymix-ts/notification
```

## 주요 exports

| export | 설명 |
|---|---|
| `createNotificationService` / `NotificationService` | 알림 생성/조회/읽음 처리 서비스 |
| `notificationHooks` | 다른 모듈(댓글 등)이 알림을 발생시키는 크로스 모듈 훅 |
| `NotificationCreateInputSchema` / `NotificationListInputSchema` 등 | Zod 입력 스키마 |
| `defaultNotificationConfig` | 기본 설정 |
| `NotificationRecipientNotFoundError` / `NotificationForbiddenError` 등 | 도메인 에러 클래스 |

## 의존성

- `@rhymix-ts/db`, `zod`
