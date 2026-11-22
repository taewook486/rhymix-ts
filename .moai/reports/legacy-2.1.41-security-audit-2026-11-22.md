# 레거시 Rhymix 2.1.33 → 2.1.41 보안 수정 대조 보고서

- 작성일: 2026-11-22
- 대상: `/mnt/d/project/rhymix` `4e8c55108`(2.1.33+2, 2026-05-16 pull) → `08dda97d6`(2.1.41+2, 2026-11-20)
- 변경 규모: 커밋 253개(vendor·번역 제외 235개), 파일 415개
- 방법: RVE 번호별 레거시 수정 커밋(37개)의 diff 를 읽고 rhymix-ts 의 대응 코드 경로를 대조.
  읽기 전용 조사 4묶음(A 접근 제어 / B 권한·인증 / C URL·이스케이프·쪽지 / D HTML·업로드·스킨).
  결함 판정 항목은 총괄 세션이 코드를 다시 열어 확인했다.

## 1. 확인된 결함

### D-1. 글 단건·목록 조회에 권한 검사가 없음 (RVE-2026-33·34 계열) — 높음

- `apps/web/server/api/routers/content/document.ts:90` `list`, `:116` `get` 모두 `publicProcedure`
- `packages/document/src/document.ts:824` `getDocument` 는 `findUniqueOrThrow({ where: { id } })` 뿐.
  상태(SECRET/TEMP)·`deletedAt`·게시판 열람 권한·작성자 검사 없음
- `listDocuments`(`:555`) 는 요청의 `status` 를 그대로 where 에 사용하고, `list` 권한·작성자 필터 없음
- 응답에 `password`·`email`·`ipAddress`·`memberId` 열이 그대로 포함된다(비회원 글의 비밀번호 해시·IP 노출)
- 실측(비로그인, dev 서버): `content.document.get id=1` → 200 + 전체 행,
  `content.document.list status=TEMP` / `status=SECRET` → 200 (권한 거부 없음)
- 미관찰: 개발 DB 에 SECRET/TEMP/삭제 글이 0건이라 실제 비공개 내용 유출 장면은 보지 못했다(코드 경로로 확정)
- 수정 방향: 라우터에서 actor 를 넘기고 도메인에서 `canPerformAction(board, 'view'|'list', actor)` 검사,
  `deletedAt: null` 강제, SECRET/TEMP 는 작성자·관리자만, 응답에서 민감 열 제외(select 또는 직렬화 단계)

### D-2. 로그인·관리자 2FA 오픈 리다이렉트 (RVE-2026-25·29·47 계열) — 높음

- `apps/web/lib/auth/actions.ts:240` 이 `callbackUrl` 을 trim 만 하고 `:281` 에서 `redirect(callbackUrl)`
- `apps/web/app/admin/2fa/verify/TwoFactorVerifyForm.tsx:74`, `apps/web/app/admin/2fa/enroll/TwoFactorEnrollForm.tsx:94` 가
  `searchParams.get('callbackUrl')` 을 그대로 `router.push`
- 저장소 전체에 내부 URL 검증 함수가 없다(`isInternalUrl`·`safeRedirect` 류 0건)
- 공격: `/login?callbackUrl=https://evil.com` (또는 `//evil.com`, `/\evil.com`, `https:/evil.com`) — 로그인 직후 외부로 이동
- 미관찰: `javascript:` 값의 스크립트 실행 여부는 브라우저 미확인
- 수정 방향: 공용 `safeInternalPath()` — 제어·구분 문자 제거, `\`→`/`, 단일 `/` 로 시작하고 `//`·`/\` 아님,
  `new URL(v, origin).origin === origin` 이 아니면 `/`(2FA 는 `/admin`). 서버 액션 쪽 검증이 핵심

### D-3. 페이지 본문 살균 우회 (RVE-2026-21 계열) — 중간 (관리자만 작성 가능)

- `packages/page/src/service.ts:141-178` `sanitizePageBody` 가 `<rx-widget …>` 토큰을 DOMPurify 전에 빼 두었다가
  살균 후 원본 그대로 복원 → 토큰의 모든 속성(`onmouseover` 등)이 살균을 통과
- `packages/page/src/components/PageBody.tsx` 가 결과를 `dangerouslySetInnerHTML` 로 출력 → 방문자 전원에게 저장형 XSS
- 작성 경로는 관리자 전용(`savePageAction`)이라 위험도는 중간. 단, 이 함수 주석이 스스로를 "XSS 방어의 단일 게이트웨이"로 규정한다
- 수정 방향: 토큰을 파싱된 `name` + 검증된 `data-*` 로 재구성하거나, `renderBodyWithWidgets`(`apps/web/lib/widgets/render.tsx`) 경로로 일원화

## 2. 확인이 더 필요한 항목

| 항목 | 내용 |
|---|---|
| RVE-22 로그아웃 CSRF | `apps/web/app/auth/signout/route.ts` POST 에 출처 검사 없음. 세션 쿠키 기본 `SameSite=Lax` 라 외부 사이트 공격은 막히고 같은 상위 도메인의 하위 도메인만 남음. 실제 Set-Cookie 속성 확인 필요 |
| RVE-34 상담 게시판 | `Board.consultation` 값이 존재하지만 어느 코드도 읽지 않음 — 기능 미구현. 켜지는 순간 전체 공개 |
| 관리자 서버 액션 가드 | `savePageAction` 등은 `isAdminSession` 만 검사해 tRPC `protectedAdminProcedure` 가 적용하는 관리자 IP 제한·사이트 잠금·2FA 를 건너뜀. `isAdminSession` 을 쓰는 `actions.ts` 16개 파일 중 몇 개가 해당하는지는 파일별로 미확인 |
| 도달 불가 코드 | `packages/board/src/actions/comment-update.ts:90` 무살균 저장 + `CommentItem.tsx:108` innerHTML, `apps/web/lib/widgets/renderer.tsx:57` 무살균 innerHTML — 현재 호출자 없음(조사 에이전트 보고, 총괄 미확인) |

## 3. 해당 없음·안전

| 판정 | RVE | 근거 요약 |
|---|---|---|
| 해당 없음 | 20, 35, 36, 40 | 모듈 관리자 역할 자체가 없음(관리자는 전부/전무) |
| 해당 없음 | 23 | 사용자 정의 다국어 기능 없음 |
| 해당 없음 | 24, 45 | 외부 페이지(OUTSIDE) 유형 없음 |
| 해당 없음 | 26, 28 | 위젯이 문서를 저장·미리보기하지 않음 |
| 해당 없음 | 31, 41 | 에디터 컴포넌트 시스템 없음 |
| 해당 없음 | 37 | 기기 등록 로그인 없음, IP 검사는 매 관리자 요청마다 실행 |
| 해당 없음 | 44 | 스킨 설정이 이름 문자열뿐, `unserialize` 없음 |
| 해당 없음 | 46 | 대상별 알림 수신거부 기능 없음 |
| 안전 | 19 | 로그인에서 Referer 를 읽지 않음 |
| 안전 | 27, 쪽지 읽음 처리 | 수신자 확인 후 읽음 처리, 목록은 세션 사용자로 필터 |
| 안전 | 30 | 닉네임은 JSX 텍스트로만 출력 |
| 안전 | 32 | 저장 키가 `yyyy/mm/<uuid>`, 다운로드는 허용 MIME + nosniff |
| 안전 | 38 | 수정 이력은 작성자·관리자만, 투표자 목록 조회 기능 없음 |
| 안전 | 39 | 입력 필드 명시, 카운터는 서버에서만 증감 |
| 안전 | 43 | 문서 id 는 autoincrement, 클라이언트 지정 불가 |

## 4. 남은 것

- 기능 변경(회원 인증 로그 통합 `member_auth_log`, 계정 찾기 보안 옵션, 세션 ID 갱신 옵션, 문서·댓글 관리에서 차단 등)은
  목록만 작성했고 rhymix-ts 와 대조하지 않았다
- 모든 판정은 코드 읽기 기반이며, 실측은 D-1 의 비로그인 요청 3건뿐이다
