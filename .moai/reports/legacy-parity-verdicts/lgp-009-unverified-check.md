# LGP-009 "대응 있음" 미확인 항목 소스 추적 결과

- 작성: moai2 (읽기 전용, 저장소 파일 무수정)
- 입력: 009 방문자 판정표의 "대응 있음" 중 확인 요청 5건
- 방법: 라우트·서비스·스키마를 끝까지 따라가며 `grep`/줄 단위 확인. 화면을 띄우거나 테스트를 돌리지는 않았다.
- 결론 요약

| # | 확인 항목 | 결론 | 009 판정에 미치는 영향 |
|---|---|---|---|
| 1 | 비회원 글·댓글 비밀번호 저장·검증 | **경로 없음.** 해시 함수는 있으나 호출처가 없고 `Document.password`/`Comment.password` 는 어디서도 쓰이거나 읽히지 않는다. 비회원 작성 자체가 막혀 있다 | 쓰기 폼·댓글 행의 "대응 있음"에서 비회원 부분은 **격차**로 정정 권장. 레거시 이전 시 bcrypt 해시는 들어갈 곳만 있고 검증 경로는 새로 만들어야 함 |
| 2 | 목록 정렬·검색 대상 겹침 | 검색 대상 레거시 8종 중 **2종 동일 + 1종 부분**. 정렬은 레거시 선택 UI 와 구조가 다름 | "대응 있음" 유지 가능(부분 대응) |
| 3 | 첨부 목록·다운로드 권한 검사 | 다운로드 두 라우트에 **인증·권한 검사가 전혀 없다.** 목록 표시는 글 열람 권한 검사 뒤에 있음 | 판정 유지 + **별도 보안 결함으로 보고** |
| 4 | 쪽지 보관함 | **없다.** 폴더는 inbox/sent 둘뿐 | 판정 유지(비고의 "보관함 없음" 확정) |
| 5 | 수정 이력 접근 정책 | 레거시와 **다르다.** 로그인 필수 + 작성자/관리자만, 게시판 권한 설정 무시 | "대응 있음"은 화면 존재 기준으로 유지하되 접근 정책 격차를 비고에 추가 |

## 1. 비회원 글·댓글 비밀번호 (`Document.password` / `Comment.password`)

**결론: 저장 경로도 검증 경로도 없다. 레거시 이전 시 들어오는 해시는 검증할 곳이 없다.**

- 컬럼은 있다: `Document.password String?` (`packages/db/prisma/schema.prisma:817`), `Comment.password String?` (`:869`).
- 해시·검증 함수는 있다: `hashDocumentPassword`(`packages/document/src/secret.ts:42`), `verifyDocumentPassword`(`:68`), 잠금 해제 JWT `generateUnlockToken`(`:101`)·`verifyUnlockToken`(`:122`). argon2id(hash-wasm), 파라미터 `DOC_PASSWORD_PARAMS`(`:23-29`) 사용.
- **그러나 호출처가 없다.** `grep -rnE "hashDocumentPassword|verifyDocumentPassword|generateUnlockToken|verifyUnlockToken" packages apps` 결과는 `secret.ts` 자신, `index.ts:20` 의 `export *`, `secret.test.ts` 뿐이다. 문서·댓글 생성/수정/삭제 서비스·라우터·서버 액션에서 부르는 곳이 없다.
- `password` 를 쓰는 코드가 없다: `packages/document/src/document.ts` 의 `password` 언급은 응답에서 민감 필드를 빼는 `SENSITIVE_DOCUMENT_KEYS = ['password','email','ipAddress']`(`:114`)와 주석(`:611`, `:945`)뿐. `CreateDocumentSchema`(`document.ts:213-227`)와 `CreateCommentSchema`(`packages/comment/src/service.ts:53-66`)에는 `password` 입력 필드가 없다.
- 비회원 작성은 막혀 있다:
  - tRPC: `content.document.create`(`apps/web/server/api/routers/content/document.ts:155`)와 `content.comment.create`(`comment.ts:62`)는 `protectedProcedure`. 정의 `apps/web/server/api/trpc.ts:181` `protectedProcedure = publicProcedure.use(requireAuth)`, 세션이 없으면 `UNAUTHORIZED`(`trpc.ts` 157행 주석).
  - 글쓰기 화면: `apps/web/app/[mid]/write/page.tsx:44-48` 이 세션이 없으면 `/login?callbackUrl=…` 로 리다이렉트.
  - 서비스는 `authorId: number | null` 을 허용하지만(`document.ts:216`, `comment/service.ts:57`) 호출 경로가 없다.
- 수정·삭제 검증은 비밀번호가 아니라 작성자 번호 비교다:
  - 문서: `packages/document/src/document.ts:399-401` — `!isAdmin && doc.authorId !== actor.userId` 이면 `DocumentOwnershipError`. 비회원 글(`authorId = NULL`)은 `userId` 와 일치할 수 없어 **관리자만** 수정·삭제 가능.
  - 댓글: `packages/comment/src/service.ts:305-306` 같은 형태(`DocumentOwnershipError` 재사용).

**009 판정 영향**
- `dispBoardWrite`, `dispBoardWriteComment`, `dispBoardReplyComment`, `dispBoardModifyComment`, `dispBoardDeleteComment` 의 비고에 "비회원 불가"는 이미 적혀 있으나, 레거시의 비회원 글·댓글 수정·삭제(비밀번호 입력 화면)는 **대응이 아니라 격차**다. 해당 행은 "대응 있음(회원 한정)"으로 표기하는 것이 정확하다.
- **레거시 이전 시:** 레거시 `documents.password`·`comments.password` 해시(bcrypt 등)는 `Document.password`/`Comment.password` 에 넣을 수 있지만 **검증 코드가 없으므로** 비회원 글을 수정·삭제할 방법이 없다(관리자만). 비회원 기능을 지원하려면 (a) 작성 입력 + 해시 저장 (b) 레거시 해시(bcrypt 등) 검증 브리지 (c) 수정·삭제 시 비밀번호 확인 경로를 새로 만들어야 한다. 또한 `secret.ts` 의 `verifyDocumentPassword` 는 argon2id 전용이라 bcrypt 해시는 검증하지 못한다(`argon2Verify`, `:76`).

## 2. `dispBoardContent` 정렬·검색 대상 겹침

**레거시 폼(근거 `pages/dispBoardContent-{guest,admin}.json`)**: 필드 `category`, `search_target`, `search_keyword`. 선택지(본문 `excerpt`): 제목+내용, 제목, 내용, 댓글, 이름, 닉네임, 아이디, 등록일 (태그는 별도 링크). 정렬: 목록 머리글(번호·제목·글쓴이·날짜·조회 수) 정렬 링크와 모듈 설정 `order_target`.

**rhymix-ts**: `packages/board/src/routes/index-page.tsx:324-326` 의 `searchField` select 는 `title`/`content`/`author` 3종. 서버는 `packages/document/src/document.ts:577` `searchField: z.enum(['title','content','author'])`, 처리 `:711`(content, FTS), `:772-774`(title, `contains` insensitive), `:775-779`(author, `nickName` OR `userIdSnapshot`).

| 레거시 search_target | rhymix-ts | 겹침 |
|---|---|---|
| 제목 | `title` | 동일 |
| 내용 | `content` (Postgres FTS, `document.ts:711`) | 동일(검색 방식은 다름) |
| 제목+내용 | 없음 | 없음 |
| 댓글 | 없음 | 없음 |
| 이름 | `author` (닉네임/아이디 둘 다 검색) | 부분 |
| 닉네임 | `author` | 부분 |
| 아이디 | `author` (`userIdSnapshot`) | 부분 |
| 등록일 | 없음 | 없음 |
| 태그 | 별도 `/tag/[tagName]` 페이지 | 다른 경로 |

- 겹침: 8종 중 동일 2, `author` 하나로 합쳐진 3(이름·닉네임·아이디), 없음 3(제목+내용, 댓글, 등록일).
- **정렬**: `index-page.tsx:75-78` 의 `sort` 는 `latest`/`recommend`/`views` 3종(UI `SortSelect.tsx`). 서비스 스키마는 `['list_order','update_order','latest','recommend','views']`(`document.ts:568`)로 `list_order`·`update_order` 가 있으나 화면에서는 노출되지 않는다. 레거시 `order_target`(list_order, update_order, regdate, voted_count, readed_count, comment_count, …) + `order_type`(오름/내림)과 비교하면 `readed_count`→`views`, `voted_count`→`recommend`, `regdate`→`latest` 로 겹치고 **댓글 수 정렬·오름차순은 없다**. 정렬 방향은 항상 내림차순(`document.ts:789,811` `orderBy [{[sortField]:'desc'}, {id:'desc'}]`).
- 분류 `category` → `categoryId`(`index-page.tsx:294-296`)로 대응.

**판정 영향**: "대응 있음" 유지(핵심 검색·분류·정렬 있음). 비고에 "겹침 2/8 + 3/8 부분, 정렬 3종·내림차순만" 으로 구체화 권장.

## 3. 첨부 목록·다운로드 권한 검사 위치

**결론: 목록 표시는 글 열람 권한 뒤에 있으나, 다운로드 URL 자체에는 권한 검사가 없다.**

- 첨부 목록: `packages/board/src/routes/view-page.tsx:79-84` 가 문서·게시판·댓글·첨부를 병렬로 읽고(`listAttachments({documentId})`), 이후 `view-page.tsx:87-93` 에서 삭제된 글·다른 게시판 글·남의 `TEMP` 글을 `notFound()` 처리하고, `:96-110` 에서 게시판 `view` 권한 검사(`canPerformAction(board,'view',viewerContext)`, 실패 시 "열람 권한이 없습니다")를 한 **뒤에** 첨부 목록(`:190-196`)을 렌더한다. 즉 화면에서는 권한 없는 사람이 목록을 못 본다.
- `listAttachments` 자체(`packages/file/src/attachment.ts:266-277`)는 `where documentId/commentId` 만으로 `findMany` 하고 권한 검사가 없다(호출하는 화면이 검사).
- **다운로드 라우트에는 인증·권한 검사가 전혀 없다.**
  - `apps/web/app/api/files/[id]/download/route.ts:10-56`: `prisma.fileAttachment.findUnique({ where: { id: fileId, isvalid: true } })` 로 찾으면 바로 스트림/presigned URL 응답. 세션 확인·게시판 권한·글 상태(`SECRET`/`TEMP`/삭제) 검사 코드가 없다(파일 전체에서 `auth`·`session`·`permission` 문자열 없음, `grep` 확인).
  - `apps/web/app/api/files/by-key/[key]/download/route.ts:10-39`: 요청의 `key` 를 `decodeURIComponent` 해서 `storage.streamRead(storageKey)` 로 **저장소 키를 그대로 읽는다.** DB 조회도 없다. 경로 이탈은 `packages/file/src/storage/local-disk.ts:22-27` 가 막지만(루트 밖이면 예외), 저장소 안의 **어떤 키든** 키를 알면 인증 없이 받을 수 있다.
  - `apps/web/proxy.ts` 에는 `/api/files` 관련 규칙이 없다(`grep` 0건).
- 설정만 있고 쓰이지 않는 항목: 관리자 파일 설정 `downloadPermission`, `hotlinkProtection`, `pointDeduction`(`apps/web/app/admin/files/settings/FileSettingsForm.tsx`)은 저장되지만 `packages/file/src`·`apps/web/app/api`·`proxy.ts` 어디에서도 읽는 코드가 없다(`grep -rn "downloadPermission\|hotlink"` 결과 없음).
- 레거시와 비교: 레거시는 파일 모듈이 다운로드 시 게시판 `view` 권한·`download_grant`·포인트·핫링크를 검사한다(`modules/file/file.controller.php` 의 다운로드 처리 — 이번에 소스를 열어 확인하지는 않았고 009 에서 `dispBoardContentFileList` 가 단독 호출 오류였던 것과 별개로 일반 지식 기준).

**009 판정 영향**
- `dispBoardContentFileList` 의 "대응 있음"은 **목록 표시** 기준으로 유지하되, 비고에 "다운로드 URL 은 권한 검사 없음"을 추가해야 한다.
- **보안 결함 후보(별도 보고)**: 비공개(`SECRET`)·`TEMP` 글의 첨부, 열람 권한 없는 게시판의 첨부가 파일 id(순차 정수)를 추측하면 인증 없이 내려받아진다. `by-key` 는 저장소 키만 알면 된다(키에 UUID 가 있어 추측은 어렵다). 확정 전에 실제 요청으로 재현하는 것이 안전하다(이번 조사는 소스 확인만).

## 4. `dispCommunicationMessages` 보관함(저장) 개념

**결론: 없다.**

- `Message` 모델(`schema.prisma`)의 폴더·보관 관련 컬럼은 `senderDel`, `receiverDel` 뿐이다(`sed -n '/^model Message /,/^}/p'` 로 확인, `folder`·`box`·`archive` 없음).
- 서비스 입력: `packages/message/src/schemas.ts:20` `folder: z.enum(['inbox','sent'])`. 구현 `packages/message/src/service.ts:105-112` 가 `inbox`/`sent` 만 처리.
- 화면: `apps/web/app/(member)/messages/page.tsx:63` `folder: 'inbox' | 'sent'`, 탭 링크도 두 개(`:83`, `:94`).
- `grep -rniE "archive|storage box|보관|saved|folder" packages/message/src apps/web/app/(member)/messages` → `folder` 의 inbox/sent 사용처만 나온다.
- 레거시는 쪽지를 `member_message.message_type` 으로 `S`(보낸) `R`(받은) `T`(보관)로 나눈다(`modules/communication/communication.controller.php:237,257,402`).
- 읽지 않은 쪽지함·검색·수신 범위 3단계도 없다는 009 비고는 이번에 같이 확인: 읽음 여부는 `readAt` 으로 있으나 "읽지 않은 쪽지함" 필터 화면은 없고(`messages/page.tsx` 에 `unread` 탭 없음), 검색 입력도 없다.

**009 판정 영향**: 판정 유지. 비고의 "보관함·읽지 않은 쪽지함·검색 없음"은 소스로 확정.

## 5. `dispBoardUpdateLog` 접근 정책 (수정 이력)

**결론: 레거시 `update_view` 권한과 정책이 다르다.**

- rhymix-ts 화면: `apps/web/app/(member)/documents/[id]/history/page.tsx`. 세션이 없으면 `/login?callbackUrl=/documents/{id}/history` 로 보냄(`:47-52`). 로그인 후 `getUpdateHistory({documentId, actor:{userId, userGroupSrl: 1, isAdmin}})`(`:56-66`)를 부른다. **`userGroupSrl` 가 `1` 로 고정**되어 사용자의 실제 그룹을 넘기지 않는다(같은 시기의 `view-page.tsx:98` 은 `session.user.groups?.[0]?.id ?? 1` 사용).
- 서비스 `packages/document/src/history.ts`: `getUpdateHistory` 안에서 `!input.actor.isAdmin && doc.authorId !== input.actor.userId` 이면 `BoardPermissionDeniedError('update_view')` 를 던진다(약 80-81행). 즉 **관리자 또는 글 작성자만** 볼 수 있다. 게시판 권한 설정(`Board.permissions.update_view`)은 읽지 않는다.
- 권한 키 기본값: `packages/board/src/permissions.ts:60` `update_view: []`(주석상 관리자 전용, 빈 배열 = 전원 거부). 하지만 위 서비스가 이 키를 쓰지 않아 관리자 설정 화면(`boards/[mid]/permissions`)에서 `update_view` 를 바꿔도 이력 접근에 반영되지 않는다. 라우터 `content.history.document` 는 `protectedProcedure`(`routers/content/history.ts:32`)로 로그인 필수.
- 레거시: `modules/board/conf/module.xml:48` `<grant name="update_view" default="member">` — **기본값이 "로그인 회원"** 이고 게시판별로 그룹 단위로 조정한다. 액션 `dispBoardUpdateLog`, `dispBoardUpdateLogView`, `procBoardRevertDocument` 가 이 권한(`module.xml:88,89,104`)을 쓰고, 소스에서 `if($this->grant->update_view !== true)` 로 막는다(`board.view.php:1497,1530`). 레거시 비회원은 로그인 안내를 보고(009 근거 `msg_not_logged`), 관리자는 목록(로그 없음 문구)을 본다.

| 항목 | 레거시 | rhymix-ts |
|---|---|---|
| 비회원 | 로그인 안내 | 로그인으로 리다이렉트 (동일) |
| 일반 회원(기본) | `default="member"` → 열람 가능 | **작성자 본인 글만** |
| 다른 회원의 글 이력 | 열람 가능(권한이 있으면 모든 글) | 불가 (작성자·관리자만) |
| 권한 설정 | 게시판별 그룹 지정 | 설정 화면은 있으나 이력 접근에 **반영 안 됨**, 기본 `[]` |
| 복원 | `procBoardRevertDocument` | 화면에서 복원 동작 확인 못함 |
| 그룹 번호 | 실제 그룹 | `userGroupSrl: 1` 고정 |

**009 판정 영향**: "대응 있음"은 화면 존재 기준이라 유지 가능하나, 비고에 **접근 정책 격차**(기본값·설정 미반영·그룹 고정·복원 없음)를 추가해야 정확하다.

## 정정이 필요한 009 행 정리

| act | 기존 판정 | 제안 |
|---|---|---|
| `dispBoardWrite`, `dispBoardWriteComment`, `dispBoardReplyComment`, `dispBoardModifyComment`, `dispBoardDeleteComment` | 대응 있음 | 대응 있음(회원 한정). 비밀번호 기반 비회원 작성·수정·삭제는 격차(§1) |
| `dispBoardContentFileList` | 대응 있음 | 목록은 대응 있음. **다운로드 권한 검사 없음**을 비고에 추가, 보안 결함 후보로 별도 보고(§3) |
| `dispBoardUpdateLog`, `dispBoardUpdateLogView` | 대응 있음 | 접근 정책 격차(§5)를 비고에 추가 |
| `dispBoardContent` | 대응 있음 | 겹침 수치(§2) 반영 |
| `dispCommunicationMessages` | 대응 있음 | 변경 없음, 보관함 없음 확정(§4) |

## 근거 명령과 실제 출력 요약

모두 `/mnt/d/project/rhymix-ts` 에서 읽기 전용. 레거시는 소스 파일만 읽었다(`/mnt/d/project/rhymix/modules/board/conf/module.xml`, `board.view.php`, `communication.controller.php`). 레거시 DB·화면은 열지 않았다.

1. 비밀번호 경로
   - `grep -rnE "\bpassword\b" packages/document/src packages/comment/src packages/board/src apps/web/server/api/routers/content` (테스트·fixtures 제외) → `document.ts:114,611,945`, `secret.ts` 내부, `routers/content/document.ts:139` 주석만
   - `grep -rnE "hashDocumentPassword|verifyDocumentPassword|generateUnlockToken|verifyUnlockToken" packages apps` → `secret.ts`, `index.ts:20`, `secret.test.ts` 만
   - `grep -nE "protectedProcedure" apps/web/server/api/trpc.ts` → 181행 정의, 157행 주석 UNAUTHORIZED
   - `grep -nE "auth\(|redirect\(|login|session" "apps/web/app/[mid]/write/page.tsx"` → 44, 47, 48행
   - 소유권: `document.ts:399-401`, `comment/service.ts:305-306`
2. 검색·정렬: `index-page.tsx:75-78,324-326`, `document.ts:568,577,678,711,772-779,789,811`, 레거시 선택지는 `legacy-front-map/pages/dispBoardContent-*.json` 의 `excerpt`·`forms`
3. 첨부: `cat -n` 으로 두 라우트 전체 확인(각 56·39행), `grep -rn "downloadPermission\|hotlink" packages/file/src apps/web/app/api apps/web/proxy.ts` → 출력 없음, `grep -n "/api/files" apps/web/proxy.ts` → 출력 없음, `local-disk.ts:22-27`(경로 이탈 방어)
4. 쪽지: `sed -n '/^model Message /,/^}/p' schema.prisma | grep -n "folder\|box\|archiv\|Del"` → `senderDel`, `receiverDel` 만, `schemas.ts:20`, `service.ts:105-112`, `messages/page.tsx:63`
5. 이력: `history/page.tsx:47-66`, `history.ts` 의 소유권 검사, `permissions.ts:60`, `routers/content/history.ts`, 레거시 `module.xml:48,88,89,104`, `board.view.php:1497,1530`

## 한계 (미검증)

- 실제 요청으로 재현하지 않았다. 특히 §3 다운로드 무인증은 소스 읽기 기준이며, 프런트 프록시·배포 설정(리버스 프록시의 인증)이 별도로 있는지는 저장소에서 확인되지 않았다.
- 레거시 파일 다운로드의 권한·포인트·핫링크 검사 세부는 이번에 소스를 열지 않았다.
- `getUpdateHistory` 의 소유권 검사 줄 번호는 `grep -n` 출력의 상대 위치(80-81행)이며, 이력 복원 UI 가 없다는 판단은 `history/page.tsx` 와 `packages/document/src/history.ts` 의 공개 함수 목록만 본 결과다.
- 비회원 글·댓글을 막는 곳이 tRPC `protectedProcedure` 와 글쓰기 페이지의 리다이렉트이므로, 다른 입력 경로(예: 직접 서버 액션 호출)가 있는지는 `packages/board/src/actions/*` 에서 세션 검사 코드를 찾지 못했으나(`grep` 0건) apps 쪽 래퍼가 검사하는 구조라 단정하지 않는다.
