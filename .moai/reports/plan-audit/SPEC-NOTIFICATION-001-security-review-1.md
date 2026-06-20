# IDOR Security Review — SPEC-NOTIFICATION-001 Slice A

Quality Gate item 4 (acceptance.md §3): "expert-security 독립 리뷰 — IDOR(회원 간 알림 격리, AC-NOTIF-A4 후반부) CRITICAL/HIGH 0건."

## Verdict: PASS — CRITICAL: 0, HIGH: 0

Member-to-member notification isolation (AC-NOTIF-A4) is correctly enforced. Ownership is checked at the service layer (`NotificationService.markRead`), and actor/recipient identity is always derived server-side from `auth()`, never from client input.

## Findings

1. **`markRead` / `actorMemberId`** — Always server-resolved from `session.user.id` (`actions.ts:26,30-33`). No client-suppliable path.
2. **`markAllRead` / `recipientId`** — Server-resolved from session (`actions.ts:49,51`); action takes no client parameters.
3. **`list` / `recipientId`** — Server-resolved in both call sites: `page.tsx:50,55-57` and `GlobalHeader.tsx:35,51`.
4. **Server Actions exposed to `NotificationBell` (key IDOR vector)** — A client can invoke `markOneRead(arbitraryNotificationId)`, but `actorMemberId` is injected server-side, and `service.ts:154-156` throws `NotificationForbiddenError` when `notification.recipientId !== input.actorMemberId`, before any mutation (`service.ts:158`). PASS.
5. **`upsertPreference` / `memberId`** — Server-resolved (`settings/notifications/page.tsx:55-57,67-70`).
6. **`onCommentCreated` recipientId provenance** — `documentAuthorId`/`parentCommentAuthorId` come from trusted Prisma reads (`comment/service.ts:135-139,147`), never request body/form input.

## Non-blocking notes

- `markOneRead` swallows `NotificationForbiddenError`/`NotificationRecipientNotFoundError` without leaking existence — good anti-enumeration hygiene.
- `markAllRead`/`countUnread`/`list` are inherently scoped by `recipientId` in the `where` clause.
- No tRPC router or alternate transport exposes any notification method — the four audited Server Action / RSC call sites are the complete Slice A attack surface.

No findings require remediation.

---
Reviewed by: expert-security (independent review)
Date: 2026-06-20
