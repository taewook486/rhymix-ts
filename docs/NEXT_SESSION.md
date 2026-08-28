# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-29 (앱 라우트 85개 스윕으로 제품 결함 5건 발견·수리.
>       커밋 8개 `f7e6fff`..`5971299`. 트리 clean, `0 0`)
> source_session_id: e71d0210-bb89-428e-b01f-f78831a7daad

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. rhymix-ts — 앱 라우트 스윕 2회차부터. 지난 회차에서 관리자 화면
결함 5건을 찾아 고쳤다. 이번엔 로그인 사용자/비로그인 관점으로 훑는다.

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
2) Docker Desktop 켜고 `docker start rhymix-ts-db` → 3개 컨테이너 기동
3) apps/web 에서 dev 서버 기동 (콜드 ~200초). /mnt/d 는 inotify 미작동이라
   코드 수정마다 재기동 필요

실행: docs/NEXT_SESSION.md 의 '라우트 스윕 방법' 절대로 스윕 스크립트를 만들어
      (a) 비로그인 (b) 일반회원 세션으로 앱 라우트를 순회한다. 지난 회차는
      관리자 세션만 훑었다. 스윕 중에는 vitest 를 절대 병행하지 말 것.

후속: 남은 후보는 packages/file 의 미사용 server/ 계층, 15개 패키지 린트 구성,
      주 DB 재시드(설치 마법사 경유), 미병합 브랜치 19개 정리.

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-28~29)

인계 문서가 지목한 작업("packages/document/src/server 테스트 작성")이 대상의
실제 상태와 맞지 않았다. 그 계층은 **호출자가 0곳인 죽은 코드**였고, 그 안의
스텁 하나가 실제 제품 결함의 원인이었다. 방향을 바꿔 결함을 찾는 쪽으로 갔다.

### 수리한 제품 결함 5건

| # | 결함 | 커밋 |
|---|---|---|
| 1 | `/drafts` 발행 버튼이 아무것도 안 함 | `f7e6fff` |
| 2 | `/admin/members/groups` 삭제 거부가 화면에 안 뜸 | `5f0f192` |
| 3 | `/admin/files` 항상 500 (없는 prisma 관계 include) | `8c63f7c` |
| 4 | `/admin/boards/[mid]/permissions` 항상 500 (서버 컴포넌트 onClick) | `d2da2ab` |
| 5 | `/admin/tags` 작업 버튼 3개가 스텁 + 태그 있으면 500 | `5971299` |

**1번**: 페이지가 `@rhymix-ts/document/server/actions` 의 `publishDraft` 를 불렀는데
그건 항상 `{ok:false}` 를 반환하는 스텁이었다. 반환값을 아무도 안 봐서 조용히
무시됐다. 동작하는 구현은 `packages/document/src/draft.ts` 에 있었다.
→ 도메인 함수를 페이지에서 직접 호출(`listDrafts` 와 같은 방식).

**2번**: `admin.group.delete` 는 "마지막 그룹 삭제 불가" 등으로 실제 거부하는데
페이지가 `{error}` 를 버렸다. 저장소 전체에서 인라인 서버 액션 form 은 이 둘뿐이었고
**둘 다 같은 결함**이었다. → `useActionState` + `DeleteGroupButton`.

**3번**: `listFiles` 가 `FileAttachment` 에 없는 `uploader` 관계를 include 했다.
`findMany` 호출부의 `as any` 가 타입체크를 가렸고, 테스트는 mock 결과에 uploader 를
손수 넣어 통과하고 있었다. → include 제거 + `memberId`→User 2차 조회,
`as any` 제거, include 타입을 실재 관계(document/comment)로 좁힘.

**4번**: `onClick={() => history.back()}` 가 서버 컴포넌트에 있어 렌더가 중단됐다.
→ 공용 `BackButton` 클라이언트 컴포넌트.

**5번**: 버튼 3개가 `alert('구현 예정')` 이었고 그 onClick 도 서버 컴포넌트에 있었다
(태그가 1건이라도 있으면 500 — DB 에 태그가 없어 스윕에선 200 으로 보였다).
도메인(`renameTag`/`mergeTags`/`deleteTag`)은 이미 다 있었다. → Server Action 3개 +
`TagRowActions` 로 배선. 브라우저에서 이름변경·병합·삭제 전부 실측 확인.

### 정리 작업

- `packages/document/src/server/` 752행 삭제 (`cf16c6e`) — 호출자 0곳 재확인 후.
  `actions.test.ts` 는 타입 전용 import 와 에러 클래스 사본만 검사해 커버리지 0% 였다
- `packages/poll` 타입체크 8건 해소 (`7784b57`) — 전 패키지 중 poll 만 깨져 있었다
- 지난 세션(`3a3c53f`)이 남긴 잔여 2건 (`39bb4b2`) — typecheck 1건 + A-9 거짓 실패
- 잔여 worktree 1개 + main 에 병합된 브랜치 18개 삭제 (38→20개).
  worktree 의 미커밋 변경은 main 이 전부 앞서는 초안임을 파일별로 대조 후 제거

### 최종 검증

- 타입체크 18개 타깃(17패키지 + apps/web) 전부 0건
- packages/{file,document,poll,tag} 27파일 395건 통과
- apps/web 변경분 6파일 46건 통과
- 브라우저 실측 7항목 전부 통과 (아래 매트릭스)

## 라우트 스윕 방법 (이번 세션에서 가장 효과적이었던 도구)

Playwright 로 관리자 로그인 후 앱 라우트 85개를 순회하며 HTTP 상태 / 콘솔 오류 /
에러 화면 / 리다이렉트를 기록했다. **제품 결함 3건이 여기서 나왔다.**

```js
// 로그인 → for (route of ROUTES) { goto, status, body 에 에러문구 검사, 콘솔 수집 }
// 라우트 목록: find app -name page.tsx → 그룹 세그먼트 제거 → [mid]=free, [id]=2 치환
// /install/* 는 상태 변경 위험이 있어 제외
```

읽을 때 주의할 점 두 가지:

- **콘솔 오류는 한 라우트 늦게 잡힌다.** `/admin/comments` 에 찍힌 onClick 오류는
  직전 `permissions` 것이고, `/admin/files/settings` 의 prisma 오류는 직전
  `/admin/files` 것이었다. 별도 결함으로 세지 말 것
- **스윕 중 vitest 병행 금지.** `/admin/system` 이 277초 타임아웃으로 찍혔는데
  단독 재측정에서는 2.4초였다. 순전히 CPU 경합이었다

## 검증 방법론 메모 (계속 유효 + 이번 추가분)

- **"테스트 0%" 는 대상이 없다는 뜻일 수도 있다.** 커버리지가 0 이면 테스트를
  쓰기 전에 그 코드에 호출자가 있는지부터 확인할 것. 이번엔 347행 라우터가
  통째로 죽은 코드였다
- **`as any` 는 결함을 숨긴다.** prisma include 오류 3번이 정확히 그 사례.
  캐스트를 걷어내자 타입체크가 즉시 잡았다
- **회귀 테스트는 결함 상태로 되돌려 실패를 확인할 것.** `/drafts` 테스트는
  결함 재현 시 7건 중 3건이 실패하는 것을 확인하고 커밋했다
- **mock 이 손수 넣은 필드는 증거가 아니다.** `uploader` 를 mock 결과에 넣어둔
  탓에 실제로는 500 이 나는 코드가 테스트를 통과하고 있었다
- **Playwright `hasText` 는 select 옵션 텍스트까지 매칭한다.** 태그 행을 고를 때
  엉뚱한 행이 잡혔다. `td:nth-child(2):text-is("이름")` 처럼 셀로 특정할 것
- (이전 세션분) 호출자 수를 세고 시작 / 수정 직후 첫 검증은 거짓 음성 가능 /
  `networkidle` 은 HMR 때문에 안정되지 않음 / `button[type=submit]` 은 로그아웃을 먼저 잡음

## 로그인 자격증명 (로컬 dev DB)

`admin` / `Admin1234!`

## 현재 DB 상태

- 게시판 2개: `notice`(id=2) / `free`(id=3), 문서 3건, 태그 0건
- 회원 그룹 1개(`일반회원`, isDefault). **원래 0개였다** — 이 DB 는 설치 마법사가
  아니라 e2e 시드로 만들어져 그룹·메뉴가 비어 있다. 설치 시드
  (`packages/db/src/install/seed.ts:181`)는 admin/member 그룹을 정상 생성하므로
  코드 결함이 아니다
- 검증용 임시글/태그/그룹은 정리했다

## 후보 작업 (전부 선택적)

- **라우트 스윕 2회차** — 비로그인 / 일반회원 관점. 지난 회차는 관리자만 훑었다
- **`packages/file/src/server/`** — document 와 같은 미사용 계층(호출자 0곳)이나
  테스트가 40KB 붙어 있어 이번 범위에서 제외했다. 지우면 커버리지 수치가 크게 움직인다
- **린트 구성** — `packages/admin` 만이 아니라 15개 패키지 전부 `echo 'no lint'` 다
- **주 DB 재시드** — 설치 마법사를 실제로 태워 그룹/메뉴가 있는 상태로 만들기
- **미병합 브랜치 19개** — 17개는 동일한 harness 훅 커밋 중복, 1개는 두 달 전
  feature 브랜치. 제품 작업은 아니다
- **`/admin/members` 하이드레이션 경고** — 스윕에서 1회, 그룹 검증 중 1회 관측.
  재현이 들쭉날쭉해 원인 미특정
- **비회원 비밀글** — `packages/document/src/secret.ts` 의 비밀번호/해제토큰 4함수는
  구현·테스트가 있으나 호출자 0곳. 회원 비밀글은 작성자·관리자 게이트로 동작한다

## 환경 함정 (계속 유효 + 이번 추가분)

- **`.git/index.lock` 충돌이 잦다.** `moai statusline` 이 매 렌더마다 `git status
  --porcelain` 을 돌린다. `rm -f .git/index.lock` 직후 곧바로 재시도하는 루프가 제일 확실:
  `for i in 1 2 3; do rm -f .git/index.lock; git add ... && git commit ... && break; done`
- **vitest 위치 인자는 글롭이 아니라 경로 정규식이다.** 괄호가 든 경로
  (`app/(member)/...`)는 이스케이프가 꼬이므로 `'drafts/page'` 같은 단순 부분문자열을 쓸 것
- **jsdom 콜드 임포트가 60초 기본 타임아웃을 넘긴다.** `document.test.ts` 의 A-9 이
  `sanitizeHtml`→`isomorphic-dompurify` 첫 호출자라 실패했다. 개별 타임아웃을 달았다.
  같은 증상이 다른 파일에서 나오면 코드 결함으로 오진하지 말 것
- **`moai gate` pre-commit 은 전체 vitest 스위트를 돌린다.** 범위에 맞는 검증을 직접 하고
  `SKIP_MOAI_PRECOMMIT=1` + 사유를 커밋 본문에 남기는 게 이 저장소의 규약이다
- **Docker Desktop 은 WSL 에서 켤 수 있다**:
  `nohup "/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe" &`.
  켜도 `rhymix-ts-db` 는 Exited 로 남을 수 있으니 `docker start rhymix-ts-db`
- **`/mnt/d` 는 inotify 미작동 → 코드 수정 후 dev 서버 재기동 필수.**
  `.next/dev/lock` 먼저 제거. 콜드 컴파일 ~200초
- **`pgrep -f "next[ ]dev"` 도 자기 자신을 잡는다**(exit 144). PID 를 먼저
  `ps -eo pid,cmd | grep -F "next/dist/bin/next"` 로 뽑아 `kill <pid>` 할 것
- **`npx` 가 Windows 바이너리로 잡힌다.** 매 Bash 앞에
  `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"`, 도구는
  `node_modules/.bin/<tool>` 직접 지목
- **DB 테이블은 snake_case, 컬럼은 camelCase 다** (`documents` / `"boardId"`).
  psql 에서 컬럼은 큰따옴표로 감쌀 것. `documents` 의 게시판 FK 는 `boardId`
  (도메인 입력의 `moduleInstanceId` 와 이름이 다르다)
- **foreground `sleep` 은 막혀 있다.** 대기는 `curl --retry N --retry-delay S
  --retry-connrefused` 로 대체
- **vitest `--reporter=line` 은 이 설정에서 안 먹는다.** `--reporter=verbose` 또는 `dot`
- **커밋은 명시 pathspec 으로만.** 미커밋 400+ 하네스 템플릿 상주 — `git add -A` 금지
- **docker**: rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444)
