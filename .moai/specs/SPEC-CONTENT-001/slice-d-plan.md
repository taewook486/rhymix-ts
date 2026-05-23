# SPEC-CONTENT-001 — Slice D 플랜

**Status**: ready
**Methodology**: TDD (RED → GREEN → REFACTOR)
**Base**: main = ba05f0b (CONTENT-001 Slice C 완료, 638 tests)
**Depends on**: Slice A (Prisma 모델 — DocumentVote / DocumentReport / Trash / DocumentUpdateLog 정의됨), Slice B (Document CRUD + tRPC), Slice C (Category + Search + cursor pagination)
**Scope**: Document Lifecycle 세트 — Vote + Report + Trash 소프트 삭제/복원 + Edit History
**Spec source**: `.moai/specs/SPEC-CONTENT-001/spec.md` REQ-CONTENT-090/091, REQ-CONTENT-100/101, REQ-CONTENT-110, AC-CONTENT-090/100/110

---

## 1. 목표 (What & Why)

Slice B/C 가 Document CRUD + Comment + Category + Search 의 정적 경로를 완성했다면,
Slice D 는 문서의 **수명주기(lifecycle) 이벤트** 를 채운다.

1. **Vote** (REQ-CONTENT-090) — 추천/비추천/신고(blame) 1인 1회. 동일 사용자 재호출 시 toggle.
2. **Report** (REQ-CONTENT-091) — 문서/댓글 신고 row 생성. 동일 사용자 동일 대상 중복 차단.
3. **Trash** (REQ-CONTENT-100/101) — `deletedAt` 세팅 + `Trash` row 동시 생성 (현재 Slice B 는 `deletedAt` 만 세팅 — Trash row 미생성, 미해결). 복원/영구삭제 트리거.
4. **Edit History** (REQ-CONTENT-110) — `updateDocument` 호출 시 변경 전 snapshot 을 `DocumentUpdateLog` 에 자동 기록 + 조회 API.

이 슬라이스 완료 후 문서 도메인의 모든 mutation 경로가 audit-able 해진다.

---

## 2. Pre-Flight Findings

### Q1 — Vote 중복 방지 + Toggle 시맨틱 (REQ-CONTENT-090, AC-CONTENT-090)

**현재 스키마**: `DocumentVote` 는 `@@unique([documentId, voterId, voteType])` (Slice A).

**중요 함의**: unique key 가 `(documentId, voterId, voteType)` 이므로 **같은 사용자가 UP 과 DOWN 을 모두 누르는 것은 unique 제약으로 막히지 않는다**. AC-CONTENT-090 의 "이미 UP 을 누른 사용자가 다시 UP 을 누르면 409" 는 unique 제약이 자동 처리하지만, "UP 을 누른 사용자가 DOWN 으로 바꾸려 할 때" 의 의미는 비즈니스 결정 사항.

**결정** — 단순 모델 채택:

- `voteDocument({ documentId, voterId, voteType })`:
  - 동일 `(documentId, voterId, voteType)` row 가 이미 있으면 → **toggle off** (해당 row 삭제 + 카운트 -1, `point` 가 그대로 환원).
  - 없으면 → row 생성 + 카운트 +1.
  - **다른 voteType 으로의 전환은 별도 동작** — UP 을 끄고 DOWN 을 누르는 식의 2-step.
- UP / DOWN / BLAME 카운트는 각각 `votedCount` / (downCount 컬럼은 없음 — Document 스키마 확인 결과 `blamedCount` 만 존재), `blamedCount` 로 매핑:
  - UP → `votedCount` ±1
  - DOWN → `votedCount` ∓1 (음수 점수 누적; 사용자 직관 위해 `point: -1` 로 저장하되 동일 컬럼 사용)
  - BLAME → `blamedCount` ±1
  - **추후 명시적 down 컬럼이 필요하면 Slice E 마이그레이션에서 추가**. Slice D 는 기존 컬럼만 사용 — `point` 컬럼이 +1/-1 로 이를 구분.
- 트랜잭션 원자성: row 생성/삭제 + 카운트 증감은 단일 `$transaction` 내에서.

`getVoteCount({ documentId })` → `{ up: number; down: number; blame: number }` — `groupBy voteType`.

### Q2 — Document.deletedAt vs Trash 테이블 (REQ-CONTENT-100, AC-CONTENT-100)

**현재 Slice B 상태**: `deleteDocument` 가 `deletedAt = new Date()` 만 세팅. `Trash` row 는 생성하지 않음.

**spec.md 의 흐름** (REQ-CONTENT-012, REQ-CONTENT-100): `trash_use = true` 인 게시판이면 soft delete + Trash 보관. 30일 retention.

**결정**:

- `softDeleteDocument({ documentId, deletedById, actor })`:
  - `Board.trashUse` 가 true 인 경우 → `Document.deletedAt = now()` + `Trash { documentId, deletedById, deletedAt, expiresAt = now() + 30 days }` 생성 (단일 트랜잭션).
  - `Board.trashUse` 가 false 인 경우 → `Document.deletedAt = now()` 만 세팅 (Trash 생략, 영구 삭제 cron 대상 아님).
  - categoryId 가 있으면 `incrementDocumentCount(-1)` 도 동일 트랜잭션 (Slice B/C 의 deleteDocument 흐름 유지).
- `restoreDocument({ documentId, actor })`:
  - admin 권한 필요.
  - `Trash` row 가 존재해야 함 → 없으면 `TrashNotFoundError`.
  - `expiresAt > now()` 검사 (만료된 휴지통은 복원 거부 → `TrashExpiredError`).
  - `Document.deletedAt = null` + `Trash` row 삭제 (단일 트랜잭션).
  - categoryId 가 있으면 `incrementDocumentCount(+1)` 동일 트랜잭션.
- `purgeDocument({ documentId, actor })`:
  - admin 권한 필요. **하드 삭제**.
  - `Document` row 자체를 삭제 → cascade 로 `Trash`, `Comment`, `FileAttachment`, `DocumentVote`, `DocumentReport`, `DocumentUpdateLog` 동시 삭제 (스키마의 onDelete: Cascade 활용).
  - 주의: `FileAttachment` 의 storage object (S3) 까지는 Slice D 범위 밖 — 추후 storage cleanup hook 은 Slice E.
- `listTrash({ boardId?, page?, actor })`:
  - admin 권한 필요.
  - `Trash` 테이블 join `Document` → 삭제된 문서 목록.

**기존 `deleteDocument` 와의 관계**:

- Slice B 의 `deleteDocument` 는 그대로 유지 (`softDeleteDocument` 가 그 위에 trash row 생성을 더하는 형태). 단, **본 슬라이스에서 `deleteDocument` 를 `softDeleteDocument` 의 wrapper 로 리팩토링**하여 단일 경로로 통일한다.
  - 즉 `deleteDocument` → 내부적으로 `softDeleteDocument` 를 호출하되 board.trashUse 분기를 그 안에서 처리.
- tRPC `content.document.delete` 는 변경 없음 (호출 시그니처 유지). 기존 Slice B/C 테스트 회귀 보장.

### Q3 — Trash 보관 기간 (REQ-CONTENT-101)

- spec.md: 기본 30일 retention.
- 자동 영구 삭제 cron (REQ-CONTENT-101 "WHEN the retention window expires THEN a scheduled job shall purge…") 은 **Slice D 범위 밖**. Slice D 는 수동 `purgeDocument` 만 제공.
- cron / scheduled-job 인프라는 별도 SPEC (`SPEC-INFRA-CRON-001` 가칭) 으로 이월.
- 다만 `expiresAt` 컬럼은 정상 세팅 (값은 `deletedAt + 30 days`) — 추후 cron 이 `WHERE expiresAt < now()` 만 조회하면 됨.

### Q4 — Edit History 저장 정책 (REQ-CONTENT-110, REQ-CONTENT-011, AC-CONTENT-110)

**현재 스키마**: `DocumentUpdateLog { documentId, prevTitle, prevContent, prevExtraVars, editorId, editorIp, regdate }` (Slice A).

**결정**:

- `recordUpdate({ documentId, prevTitle, prevContent, prevExtraVars, editorId, editorIp }, tx)`:
  - 단순 row 추가. update 호출당 1 row.
  - **line-level diff 는 저장하지 않음** — 클라이언트가 history 조회 시 prev 와 현재를 비교해 계산.
- `updateDocument` (Slice B) 를 수정 — **변경 전 snapshot 을 캡처해 `recordUpdate` 를 트랜잭션 내에서 호출**:
  - `Board.updateLog` 가 true 인 게시판만 기록 (REQ-CONTENT-011).
  - 변경된 필드만 추적할 필요는 없음 — title/content/extraVars 의 변경 전 값을 모두 snapshot.
  - title 또는 content 가 실제로 변경된 경우에만 row 추가 (정렬/status 변경만 있으면 skip — false positive 방지).
- `getUpdateHistory({ documentId, actor })`:
  - 조회 권한: 작성자 본인 + admin.
  - 비작성자/비admin → `ForbiddenError` (tRPC FORBIDDEN).
  - 반환: `{ id, prevTitle, prevContent, prevExtraVars, editorId, regdate }[]` (최신순).

### Q5 — Report 처리 (REQ-CONTENT-091)

**현재 스키마**: `DocumentReport { documentId?, commentId?, reporterId, reporterIp, reason, resolved }`. unique 제약 **없음**.

**결정**:

- `reportDocument({ documentId, reporterId, reporterIp, reason })`:
  - 동일 `(documentId, reporterId)` row 가 이미 존재하면 → `DuplicateReportError` (application-level 검증, `findFirst` 후 분기).
  - 신규 row 생성.
  - **DB-level unique constraint 추가는 별도 마이그레이션 필요** — 본 슬라이스는 application-level 만으로 충족 (race condition 가능성은 낮음; admin 알림이 중복돼도 운영상 큰 문제 아님). DB constraint 는 Heads-up 으로 이월.
- `reportComment({ commentId, reporterId, reporterIp, reason })` — 동일 로직.
- **admin 알림/리뷰 워크플로 (이메일/notification 발송, resolve UI) 는 Slice D 범위 밖** → Slice E (또는 admin notification SPEC). `resolved` 컬럼 토글 API 만 본 슬라이스에서 최소 제공:
  - `resolveReport({ reportId, actor })` — admin 권한, `resolved = true` 세팅.
- `listReports({ resolved?, page?, actor })` — admin 전용 목록 조회. moderation 라우터.

### Q6 — moduleInstanceId vs documentId 입력 일관성

**현재 패턴**:
- `createDocument` 는 `moduleInstanceId` 로 board 를 lookup.
- `updateDocument` / `deleteDocument` 는 `documentId` 만 받음 (board 는 doc.boardId 로 lookup).

**Slice D 도메인 함수 입력**:
- Vote / Report / Trash / History 모두 **`documentId` 직접 입력**. (vote/report 는 board 권한 검사를 위해 `doc.boardId` → `board` lookup 필요 — `voteDocument` 내부에서 처리).

### Q7 — Anonymous Vote / Report identity

spec.md OQ-CONTENT-005: 익명 vote 정책은 사이트별 — 기본은 로그인 필수.

**결정 (본 슬라이스)**:
- Slice D 는 **로그인 사용자 전용**. `voterId` / `reporterId` 는 `User.id.toString()` (DocumentVote.voterId 는 String 컬럼).
- 익명 voting (board.useAnonymous 기반 IP 해시) 은 Slice E 이월.
- tRPC 라우터는 `protectedProcedure` 사용 — 미인증 시 자동 401.

---

## 3. 구현 파일 목록

### 3.1 packages/board/src/vote.ts (신규)

```ts
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { PrismaClient, DocumentVote, VoteType } from '@prisma/client';

const VoteDocumentSchema = z.object({
  documentId: z.number().int().positive(),
  voterId: z.string().min(1),                      // User.id.toString()
  voteType: z.enum(['UP', 'DOWN', 'BLAME']),
});

export type VoteDocumentInput = z.input<typeof VoteDocumentSchema>;

export interface VoteResult {
  action: 'created' | 'removed';
  vote: DocumentVote | null;                       // removed 면 null
  newCounts: { voted: number; blamed: number };
}

export async function voteDocument(
  input: VoteDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<VoteResult>;

export async function getVoteCount(
  documentId: number,
  ctx: { prisma: PrismaClient },
): Promise<{ up: number; down: number; blame: number }>;
```

**구현 핵심** (voteDocument):
- 단일 `$transaction` 내:
  1. `findUnique` on `(documentId, voterId, voteType)`.
  2. 있으면 → `delete` + `Document` 카운트 감소.
  3. 없으면 → `create` (point: UP=+1, DOWN=-1, BLAME=+1) + `Document` 카운트 증가.
- 카운트 매핑:
  - UP / DOWN → `Document.votedCount` ±1 (point 부호와 일치).
  - BLAME → `Document.blamedCount` ±1.

### 3.2 packages/board/src/vote.test.ts (신규)

TDD 테스트 (V-1 ~ V-8):

- **V-1** `voteDocument` UP 신규 → row 생성 + `votedCount` +1.
- **V-2** `voteDocument` 동일 UP 재호출 → row 삭제 + `votedCount` -1 (toggle off).
- **V-3** `voteDocument` UP 후 DOWN → 두 row 공존 (현재 비즈니스 결정), `votedCount` 는 +1 그대로 (DOWN 의 point: -1 가 별도 row 로 저장 — Document.votedCount 산식은 sum(point) 가 아니라 ±1 즉시 적용; 두 row 합산 결과는 별도 검증 필요 없음 — toggle 모델).
  - **재검토 노트**: V-3 의 정확한 기대값은 GREEN 단계에서 confirmation 필요. 본 슬라이스 결정은 "UP +1, DOWN 누르면 votedCount -1 즉시 적용 (두 row 합산 = 0)" — 자연스러운 사용자 경험.
- **V-4** `voteDocument` BLAME 신규 → `blamedCount` +1.
- **V-5** `voteDocument` BLAME toggle off.
- **V-6** `getVoteCount` → `{ up, down, blame }` 정확.
- **V-7** 존재하지 않는 documentId → `P2025` Prisma error → `DocumentNotFoundError` 로 변환.
- **V-8** 트랜잭션 격리 — 카운트 증가와 row 생성이 atomic (롤백 시 모두 원복).

### 3.3 packages/board/src/report.ts (신규)

```ts
const ReportDocumentSchema = z.object({
  documentId: z.number().int().positive().optional(),
  commentId: z.number().int().positive().optional(),
  reporterId: z.string().min(1),
  reporterIp: z.string().nullable().default(null),
  reason: z.string().min(1).max(500),
}).refine(
  (d) => d.documentId !== undefined || d.commentId !== undefined,
  { message: 'documentId 또는 commentId 중 하나는 필수' },
);

export class DuplicateReportError extends Error {
  readonly code = 'DUPLICATE_REPORT';
  constructor(targetType: 'document' | 'comment', targetId: number) {
    super(`Already reported ${targetType} ${targetId}`);
    this.name = 'DuplicateReportError';
  }
}

export async function reportDocument(input, ctx): Promise<DocumentReport>;
export async function resolveReport({ reportId, actor }, ctx): Promise<DocumentReport>;
export async function listReports({ resolved?, page?, limit? }, ctx): Promise<{ items, total }>;
```

**구현 핵심**:
- `reportDocument`: `prisma.documentReport.findFirst({ where: { documentId, reporterId } })` → 있으면 `DuplicateReportError`. 없으면 create.
- `resolveReport`: admin 검사 (호출자가 actor.isAdmin 인지 확인 — actor 미주입 시 거부). `resolved = true` update.
- `listReports`: admin 검사, `findMany` + `count`.

### 3.4 packages/board/src/report.test.ts (신규)

TDD 테스트 (R-1 ~ R-6):

- **R-1** `reportDocument` 정상 → row 생성, `resolved = false`.
- **R-2** `reportDocument` 동일 사용자 동일 문서 → `DuplicateReportError`.
- **R-3** `reportDocument` 다른 사용자 동일 문서 → 정상 생성 (사용자 단위 unique).
- **R-4** `reportDocument` documentId / commentId 모두 누락 → ZodError.
- **R-5** `resolveReport` admin → `resolved = true`.
- **R-6** `listReports` admin, `resolved = false` 필터 → 미해결 신고만 반환.

### 3.5 packages/board/src/trash.ts (신규)

```ts
import { z } from 'zod';
import type { PrismaClient, Trash } from '@prisma/client';
import { incrementDocumentCount } from './category.js';

const TRASH_RETENTION_DAYS = 30;

export class TrashNotFoundError extends Error {
  readonly code = 'TRASH_NOT_FOUND';
  constructor(documentId: number) {
    super(`No trash entry for document ${documentId}`);
    this.name = 'TrashNotFoundError';
  }
}

export class TrashExpiredError extends Error {
  readonly code = 'TRASH_EXPIRED';
  constructor(documentId: number) {
    super(`Trash entry for document ${documentId} has expired`);
    this.name = 'TrashExpiredError';
  }
}

export async function softDeleteDocument(
  input: { documentId: number; deletedById: number | null; actor: AuthorActor },
  ctx: { prisma: PrismaClient },
): Promise<{ document: Document; trash: Trash | null }>;

export async function restoreDocument(
  input: { documentId: number; actor: AdminActor },
  ctx: { prisma: PrismaClient },
): Promise<Document>;

export async function purgeDocument(
  input: { documentId: number; actor: AdminActor },
  ctx: { prisma: PrismaClient },
): Promise<{ documentId: number }>;

export async function listTrash(
  input: { boardId?: number; cursor?: string; limit?: number; actor: AdminActor },
  ctx: { prisma: PrismaClient },
): Promise<{ items: (Trash & { document: Document })[]; nextCursor: string | null }>;
```

**구현 핵심** (softDeleteDocument):
- 단일 `$transaction`:
  1. `findUniqueOrThrow({ where: { id }, include: { board: true } })`.
  2. 소유권 검사 — admin 이거나 본인.
  3. `Document.update({ deletedAt: now })`.
  4. `board.trashUse` 가 true 면 → `Trash.upsert({ where: { documentId }, create: { documentId, deletedById, expiresAt: now + 30days }, update: { deletedAt: now, expiresAt: now + 30days } })` (이미 휴지통에 있던 문서를 재삭제하는 엣지케이스 처리).
  5. `categoryId` 가 있으면 `incrementDocumentCount(-1)`.

**구현 핵심** (restoreDocument):
- 단일 `$transaction`:
  1. `Trash.findUnique({ where: { documentId }, include: { document: true } })` → 없으면 `TrashNotFoundError`.
  2. `expiresAt < now` → `TrashExpiredError`.
  3. `Document.update({ deletedAt: null })`.
  4. `Trash.delete({ where: { documentId } })`.
  5. `categoryId` 가 있으면 `incrementDocumentCount(+1)`.

**구현 핵심** (purgeDocument):
- admin 검사 후 `Document.delete({ where: { id } })`. Cascade 로 Trash, Comment, DocumentVote, DocumentReport, DocumentUpdateLog 일괄 삭제.
- categoryId 가 있으면 `incrementDocumentCount(-1)` (deletedAt=null 인 상태에서 purge 호출되는 경우는 거의 없지만, 일관성 위해 — purge 직전 상태가 trashed 이면 이미 -1 처리됨 → 중복 감소 방지 가드 필요). **GREEN 단계 검토**: trash 에 있는 문서를 purge 할 때는 카운트 미조정 (이미 soft delete 시점에 -1 됐으므로). trash 가 아닌 (정상) 문서를 purge 호출하는 경로는 본 슬라이스에서 노출하지 않음 (admin tRPC 가 trash 조회 후 purge 만 허용).

### 3.6 packages/board/src/trash.test.ts (신규)

TDD 테스트 (T-1 ~ T-10):

- **T-1** `softDeleteDocument` trashUse=true 게시판 → `deletedAt` set + `Trash` row 생성 + `expiresAt = deletedAt + 30days`.
- **T-2** `softDeleteDocument` trashUse=false 게시판 → `deletedAt` set, `Trash` row 미생성.
- **T-3** `softDeleteDocument` categoryId 있으면 `documentCount` -1.
- **T-4** `softDeleteDocument` 비소유자 비admin → `DocumentOwnershipError`.
- **T-5** `restoreDocument` admin + 유효 Trash → `deletedAt = null` + Trash 삭제 + 카운트 +1.
- **T-6** `restoreDocument` non-admin → 권한 거부 (BoardPermissionDeniedError 또는 별도 에러).
- **T-7** `restoreDocument` Trash 없음 → `TrashNotFoundError`.
- **T-8** `restoreDocument` expiresAt 만료 → `TrashExpiredError`.
- **T-9** `purgeDocument` admin → Document + cascade 모두 삭제 (Trash, Vote, Report, Comment 0건).
- **T-10** `listTrash` admin → expiresAt asc 정렬, document include 됨.

### 3.7 packages/board/src/history.ts (신규)

```ts
const RecordUpdateSchema = z.object({
  documentId: z.number().int().positive(),
  prevTitle: z.string(),
  prevContent: z.string(),
  prevExtraVars: z.unknown().nullable().default(null),
  editorId: z.number().int().positive().nullable(),
  editorIp: z.string().nullable().default(null),
});

export async function recordUpdate(
  input: z.input<typeof RecordUpdateSchema>,
  tx: PrismaClient | Prisma.TransactionClient,
): Promise<DocumentUpdateLog>;

export async function getUpdateHistory(
  input: { documentId: number; actor: AuthorActor },
  ctx: { prisma: PrismaClient },
): Promise<DocumentUpdateLog[]>;
```

**구현 핵심**:
- `recordUpdate` 는 트랜잭션 클라이언트를 받도록 설계 — `updateDocument` 가 자신의 트랜잭션 안에서 호출.
- `getUpdateHistory` 는 권한 검사: `doc.authorId === actor.userId || actor.isAdmin` — 위배 시 `BoardPermissionDeniedError('update_view')`.

### 3.8 packages/board/src/history.test.ts (신규)

TDD 테스트 (H-1 ~ H-6):

- **H-1** `recordUpdate` → DocumentUpdateLog row 추가, `regdate` 자동 세팅.
- **H-2** `recordUpdate` 트랜잭션 클라이언트 사용 → 트랜잭션 롤백 시 row 미생성.
- **H-3** `getUpdateHistory` 본인 → 자신의 문서 history 반환 (최신순).
- **H-4** `getUpdateHistory` admin → 타인의 문서 history 반환.
- **H-5** `getUpdateHistory` 비본인 비admin → `BoardPermissionDeniedError`.
- **H-6** `getUpdateHistory` history 없는 문서 → 빈 배열.

### 3.9 packages/board/src/document.ts (수정)

**`updateDocument` 확장** — board.updateLog 가 true 이고 title 또는 content 가 실제로 바뀌면, 트랜잭션 내에서 `recordUpdate` 호출:

```ts
export async function updateDocument(input, ctx) {
  // ... 기존 권한 검사 ...
  const doc = await ctx.prisma.document.findUniqueOrThrow({ ... include: { board: true } });

  const titleChanged = parsed.title !== undefined && parsed.title !== doc.title;
  const contentChanged = parsed.content !== undefined && sanitizeHtml(parsed.content) !== doc.content;
  const shouldLog = doc.board.updateLog && (titleChanged || contentChanged);

  if (shouldLog) {
    return ctx.prisma.$transaction(async (tx) => {
      await recordUpdate({
        documentId: doc.id,
        prevTitle: doc.title,
        prevContent: doc.content,
        prevExtraVars: doc.extraVars,
        editorId: parsed.actor.userId,
        editorIp: null,                // tRPC 레이어가 ip 를 actor 에 주입하지 않는 한 null
      }, tx);
      return tx.document.update({ where: { id: parsed.id }, data });
    });
  }

  return ctx.prisma.document.update({ where: { id: parsed.id }, data });
}
```

**`deleteDocument` 리팩토링** — 본 슬라이스에서 `softDeleteDocument` 의 thin wrapper 로 단순화 (실제 logic 은 `trash.ts` 로 위임). 단, 외부 시그니처/반환 타입은 유지 (Document 반환).

```ts
// 변경 후 deleteDocument: softDeleteDocument 호출하고 { document } 만 반환
export async function deleteDocument(input, ctx): Promise<Document> {
  const { document } = await softDeleteDocument(
    { documentId: input.id, deletedById: input.actor.userId, actor: input.actor },
    ctx,
  );
  return document;
}
```

### 3.10 packages/board/src/document.test.ts (회귀 확장)

신규/회귀 테스트 (DD-1 ~ DD-5):

- **DD-1** (회귀) `deleteDocument` Slice B/C 호출 시그니처 그대로 동작 — `Document` 반환, `deletedAt` set.
- **DD-2** (회귀) `deleteDocument` 가 board.trashUse=true 면 Trash row 생성 (위임된 결과).
- **DD-3** `updateDocument` board.updateLog=true + title 변경 → DocumentUpdateLog row 1개 추가.
- **DD-4** `updateDocument` board.updateLog=false → DocumentUpdateLog 미생성 (기존 동작 유지).
- **DD-5** `updateDocument` content 만 변경 (title 동일) → DocumentUpdateLog row 1개 추가, prevContent 가 sanitize 이전이 아닌 **저장 시점의 sanitize 결과 (doc.content)** 임을 확인.

### 3.11 packages/board/src/index.ts (수정)

신규 export 추가:

```ts
export {
  voteDocument,
  getVoteCount,
} from './vote.js';
export type { VoteResult } from './vote.js';

export {
  reportDocument,
  resolveReport,
  listReports,
  DuplicateReportError,
} from './report.js';

export {
  softDeleteDocument,
  restoreDocument,
  purgeDocument,
  listTrash,
  TrashNotFoundError,
  TrashExpiredError,
} from './trash.js';

export {
  recordUpdate,
  getUpdateHistory,
} from './history.js';
```

### 3.12 apps/web/server/api/routers/content/vote.ts (신규)

```ts
export const contentVoteRouter = router({
  toggle: protectedProcedure
    .input(z.object({
      documentId: z.number().int().positive(),
      voteType: z.enum(['UP', 'DOWN', 'BLAME']),
    }))
    .mutation(async ({ ctx, input }) =>
      voteDocument(
        { documentId: input.documentId, voterId: ctx.session.user.id.toString(), voteType: input.voteType },
        { prisma: ctx.prisma },
      ),
    ),

  count: publicProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => getVoteCount(input.documentId, { prisma: ctx.prisma })),
});
```

### 3.13 apps/web/server/api/routers/content/vote.test.ts (신규)

- **CV-1** `content.vote.toggle` UP → row 생성.
- **CV-2** `content.vote.toggle` 동일 UP 재호출 → row 삭제.
- **CV-3** `content.vote.toggle` 미인증 → UNAUTHORIZED.
- **CV-4** `content.vote.count` → `{ up, down, blame }`.

### 3.14 apps/web/server/api/routers/content/report.ts (신규)

```ts
export const contentReportRouter = router({
  create: protectedProcedure
    .input(z.object({
      documentId: z.number().int().positive().optional(),
      commentId: z.number().int().positive().optional(),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await reportDocument(
          { ...input, reporterId: ctx.session.user.id.toString(), reporterIp: null },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof DuplicateReportError) {
          throw new TRPCError({ code: 'CONFLICT', message: err.message });
        }
        throw err;
      }
    }),
});
```

### 3.15 apps/web/server/api/routers/content/report.test.ts (신규)

- **CR-1** `content.report.create` 정상.
- **CR-2** `content.report.create` 중복 → CONFLICT (409).
- **CR-3** `content.report.create` 미인증 → UNAUTHORIZED.

### 3.16 apps/web/server/api/routers/admin/trash.ts (신규)

```ts
export const adminTrashRouter = router({
  list: protectedAdminProcedure
    .input(z.object({
      boardId: z.number().int().positive().optional(),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }))
    .query(async ({ ctx, input }) =>
      listTrash({ ...input, actor: buildAdminActor(ctx.session) }, { prisma: ctx.prisma }),
    ),

  restore: protectedAdminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await restoreDocument(
          { documentId: input.documentId, actor: buildAdminActor(ctx.session) },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof TrashNotFoundError) throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
        if (err instanceof TrashExpiredError) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: err.message });
        throw err;
      }
    }),

  purge: protectedAdminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      purgeDocument(
        { documentId: input.documentId, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),
});
```

### 3.17 apps/web/server/api/routers/admin/trash.test.ts (신규)

- **AT-1** `admin.trash.list` → trash 목록 반환.
- **AT-2** `admin.trash.list` 비admin → UNAUTHORIZED (protectedAdminProcedure 가 차단).
- **AT-3** `admin.trash.restore` 정상 → 복원.
- **AT-4** `admin.trash.restore` trash 없음 → NOT_FOUND.
- **AT-5** `admin.trash.restore` 만료 → PRECONDITION_FAILED.
- **AT-6** `admin.trash.purge` → cascade 삭제 확인.

### 3.18 apps/web/server/api/routers/admin/moderation.ts (신규 — Report admin 액션)

```ts
export const adminModerationRouter = router({
  reports: protectedAdminProcedure
    .input(z.object({ resolved: z.boolean().optional(), page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) =>
      listReports({ ...input, actor: buildAdminActor(ctx.session) }, { prisma: ctx.prisma }),
    ),

  resolveReport: protectedAdminProcedure
    .input(z.object({ reportId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      resolveReport({ reportId: input.reportId, actor: buildAdminActor(ctx.session) }, { prisma: ctx.prisma }),
    ),
});
```

### 3.19 apps/web/server/api/routers/admin/moderation.test.ts (신규)

- **AM-1** `admin.moderation.reports` resolved=false 필터.
- **AM-2** `admin.moderation.reports` 비admin → UNAUTHORIZED.
- **AM-3** `admin.moderation.resolveReport` → resolved=true.

### 3.20 apps/web/server/api/routers/content/history.ts (신규)

```ts
export const contentHistoryRouter = router({
  document: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getUpdateHistory(
          { documentId: input.documentId, actor: buildActorWithId(ctx.session) },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof BoardPermissionDeniedError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
        }
        throw err;
      }
    }),
});
```

### 3.21 apps/web/server/api/routers/content/history.test.ts (신규)

- **CH-1** `content.history.document` 본인 → 목록 반환.
- **CH-2** `content.history.document` admin → 타인 문서 history 반환.
- **CH-3** `content.history.document` 비본인 비admin → FORBIDDEN.
- **CH-4** `content.history.document` 미인증 → UNAUTHORIZED.

### 3.22 apps/web/server/api/routers/content/index.ts (수정)

```ts
export const contentRouter = router({
  document: contentDocumentRouter,
  comment: contentCommentRouter,
  category: contentCategoryRouter,
  search: contentSearchRouter,
  vote: contentVoteRouter,          // 추가
  report: contentReportRouter,       // 추가
  history: contentHistoryRouter,     // 추가
});
```

### 3.23 apps/web/server/api/routers/admin/index.ts (수정)

```ts
export const adminRouter = router({
  // ... 기존 라우터들
  category: adminCategoryRouter,
  trash: adminTrashRouter,           // 추가
  moderation: adminModerationRouter,  // 추가
});
```

### 3.24 UI (선택 — MVP 수준)

본 슬라이스에서는 **UI 미포함**. vote 버튼/신고 폼/휴지통 admin 페이지는 Slice E 에서 별도 작업.
이유: 도메인 + tRPC 경로 검증이 본 슬라이스의 1차 목표이며, UI 작업은 frontend-dev 의 별도 사이클로 분리하는 것이 회귀 위험을 낮춤.

---

## 4. TDD 테스트 시나리오 (총 ~48개)

| 그룹 | 테스트 ID | 수 |
|------|-----------|----|
| Vote domain | V-1 ~ V-8 | 8 |
| Report domain | R-1 ~ R-6 | 6 |
| Trash domain | T-1 ~ T-10 | 10 |
| History domain | H-1 ~ H-6 | 6 |
| Document 회귀/확장 | DD-1 ~ DD-5 | 5 |
| Content vote tRPC | CV-1 ~ CV-4 | 4 |
| Content report tRPC | CR-1 ~ CR-3 | 3 |
| Admin trash tRPC | AT-1 ~ AT-6 | 6 |
| Admin moderation tRPC | AM-1 ~ AM-3 | 3 |
| Content history tRPC | CH-1 ~ CH-4 | 4 |

**합계 ~55 tests**. 예상: 638 → ~690 tests after Slice D.

---

## 5. REQ Enforcement Chain

| REQ | 충족 코드 | 검증 테스트 |
|-----|----------|-----------|
| REQ-CONTENT-090 (one-vote-per-user, audit log) | `vote.ts::voteDocument` + `DocumentVote @@unique([documentId, voterId, voteType])` | V-1, V-2, AC-CONTENT-090 |
| REQ-CONTENT-091 (report row, moderator 알림) | `report.ts::reportDocument` + 중복 차단. **알림 발송은 Slice E 이월** (REQ 부분 충족 표시) | R-1, R-2, R-3 |
| REQ-CONTENT-100 (soft delete + Trash + restore 30일) | `trash.ts::softDeleteDocument` + `restoreDocument` | T-1, T-2, T-5, T-8, AC-CONTENT-100 |
| REQ-CONTENT-101 (retention 만료 시 purge) | `trash.ts::purgeDocument` (수동만). cron 은 인프라 SPEC 이월 | T-9 |
| REQ-CONTENT-110 (update 시 prev snapshot 기록) | `document.ts::updateDocument` + `history.ts::recordUpdate` | DD-3, DD-5, AC-CONTENT-110 |
| REQ-CONTENT-011 (update_log 가 true 일 때만 기록) | `updateDocument` 내 `doc.board.updateLog` 분기 | DD-4 |
| REQ-CONTENT-012 (trash_use 가 true 일 때만 Trash 이동) | `softDeleteDocument` 내 `board.trashUse` 분기 | T-1, T-2 |

---

## 6. 팀 구성 (Team Mode)

| 역할 | 파일 소유 | 담당 |
|------|-----------|------|
| **backend-dev** | `packages/board/src/{vote,report,trash,history,document}.ts`, `index.ts`, `apps/web/server/api/routers/{content,admin}/*.ts` | 도메인 함수 + tRPC 라우터 + TDD (V/R/T/H/DD/CV/CR/AT/AM/CH 그룹 전체) |

본 슬라이스는 UI 가 없으므로 **단일 backend-dev 로 충분**. team mode 불필요 (sub-agent 모드로 단일 manager-tdd 가 처리).

---

## 7. 우선순위와 작업 순서

### 작업 순서 (직렬)

**T-001**: `packages/board/src/vote.ts` + `vote.test.ts` (V-1 ~ V-8) — 독립.
**T-002**: `packages/board/src/report.ts` + `report.test.ts` (R-1 ~ R-6) — 독립.
**T-003**: `packages/board/src/trash.ts` + `trash.test.ts` (T-1 ~ T-10) — `incrementDocumentCount` 의존 (Slice C 완료됨).
**T-004**: `packages/board/src/history.ts` + `history.test.ts` (H-1 ~ H-6) — 독립.
**T-005**: `packages/board/src/document.ts` 수정 (updateDocument 의 recordUpdate 호출, deleteDocument 의 softDeleteDocument 위임) + `document.test.ts` 신규 (DD-1 ~ DD-5) — T-003, T-004 완료 후.
**T-006**: `packages/board/src/index.ts` re-export 업데이트.
**T-007**: `apps/web/server/api/routers/content/{vote,report,history}.ts` + tests (CV/CR/CH).
**T-008**: `apps/web/server/api/routers/admin/{trash,moderation}.ts` + tests (AT/AM).
**T-009**: `apps/web/server/api/routers/{content,admin}/index.ts` 라우터 등록.
**T-010**: 전체 `pnpm -r typecheck` + `pnpm -r build` + `pnpm -r test`.

**병렬 가능**: T-001, T-002, T-004 는 서로 독립 (병렬 실행 가능). T-003 도 다른 셋과 독립이지만 incrementDocumentCount import 만 공유.

---

## 8. @MX 태그 후보

| 위치 | 태그 | 사유 |
|------|------|------|
| `trash.ts::softDeleteDocument` | `@MX:ANCHOR` | **Document 삭제의 단일 진입점**. fan_in >= 2 (deleteDocument wrapper, admin tRPC 향후). `@MX:REASON: $transaction 내 Document.update + Trash.upsert + incrementDocumentCount 원자성 — 셋 중 하나라도 실패 시 모두 롤백되어야 한다`. `@MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-100` |
| `vote.ts::voteDocument` | `@MX:NOTE` | UPSERT-or-DELETE 패턴 + 카운트 원자성. `@MX:REASON: DocumentVote unique = (documentId, voterId, voteType). 동일 type 재호출은 toggle off 의미 — 비즈니스 결정 사항. 다른 voteType 으로 전환은 별도 동작.` `@MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-090` |
| `document.ts::updateDocument` | `@MX:NOTE` (추가) | `recordUpdate` 를 **반드시 트랜잭션 내**에서 호출. 호출 누락 시 history 가 안 남으며 사후 복구 불가. `@MX:REASON: board.updateLog=true 면 audit 의무 — 트랜잭션 외 호출 금지`. `@MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-110` |
| `report.ts::reportDocument` | `@MX:NOTE` | 중복 차단이 **application-level only** — DB unique 제약 없음. race condition 시 중복 row 가능 (운영상 무해). `@MX:REASON: findFirst + create 사이의 race window. DB-level unique 추가는 Slice E 마이그레이션 이월`. `@MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-091` |
| `trash.ts::purgeDocument` | `@MX:WARN` | **하드 삭제** — cascade 로 모든 관련 데이터 (Comment, Vote, Report, FileAttachment, UpdateLog) 즉시 삭제. 복구 불가. `@MX:REASON: Document.delete cascade 의 부수효과. S3 storage object 삭제는 별도 hook (Slice E)`. `@MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-101` |

---

## 9. DoD (Definition of Done)

- [ ] `pnpm -r typecheck` 0 errors.
- [ ] `pnpm -r build` green.
- [ ] `pnpm -r test` ~690 tests pass (638 + ~55).
- [ ] `content.vote.toggle`, `content.vote.count` 엔드포인트 노출 및 동작.
- [ ] `content.report.create` 엔드포인트 노출, 중복 시 409.
- [ ] `content.history.document` 엔드포인트 — 본인/admin 만.
- [ ] `admin.trash.{list, restore, purge}` 엔드포인트.
- [ ] `admin.moderation.{reports, resolveReport}` 엔드포인트.
- [ ] `softDeleteDocument` — `Document.deletedAt` 세팅 + `Trash` row 생성 (board.trashUse=true 일 때) 원자적.
- [ ] `restoreDocument` — admin 권한, expiresAt 만료 거부.
- [ ] `purgeDocument` — cascade 삭제.
- [ ] `voteDocument` — toggle 동작, 카운트 원자성.
- [ ] `updateDocument` 가 board.updateLog=true 일 때 `DocumentUpdateLog` row 자동 생성 (트랜잭션 내).
- [ ] Slice B/C 기존 테스트 회귀 없음 (`deleteDocument` 호출 시그니처/반환 타입 호환).
- [ ] @MX 태그: `softDeleteDocument` ANCHOR, `purgeDocument` WARN, `voteDocument`/`updateDocument`/`reportDocument` NOTE — `@MX:REASON` 포함.

---

## 10. Heads-up for Slice E

본 슬라이스 의도적 이월 사항:

- **DB unique constraint** on `DocumentReport(documentId, reporterId)` + `DocumentReport(commentId, reporterId)` — 마이그레이션으로 race condition 차단.
- **Anonymous voting** (board.useAnonymous + IP+UA 해시 + bot mitigation, OQ-CONTENT-005).
- **Vote 의 DOWN 카운트 분리 컬럼** — 현재는 `Document.votedCount` 가 sum-of-points 의미. 명시적 `downCount` 추가 마이그레이션 검토.
- **Trash retention cron** — `WHERE expiresAt < now()` 자동 `purgeDocument` 일괄 실행. 별도 인프라 SPEC.
- **Report admin notification** — 이메일/Slack/notification 발송 (REQ-CONTENT-091 의 "notify moderators" 부분).
- **File Attachments** (REQ-CONTENT-030/031) — S3 presigned upload, ClamAV virus scan, `direct_download`, `cover_image`.
- **Custom Fields** (REQ-CONTENT-120/121) — DocumentExtraKey + 동적 Zod schema generation.
- **Rate Limiting** (REQ-CONTENT-140/141) — 미인증 IP per-hour throttle, HTTP 429 + Retry-After.
- **Password-protected documents** (REQ-CONTENT-014) — bcrypt hash + IP rate limit on attempts.
- **Vote/Report UI** — frontend-dev 의 별도 사이클.
- **Trash 관리 UI** — admin 대시보드 페이지.
- **Purge 시 S3 storage object 삭제 hook** — FileAttachment.storageKey cleanup.

---

**Plan version**: 1.0
**Author**: MoAI orchestrator (SPEC-CONTENT-001 Slice D)
**Date**: 2026-05-23
**Base SHA**: ba05f0b
**Slice scope**: Document Lifecycle 세트 (Vote + Report + Trash + Edit History)
