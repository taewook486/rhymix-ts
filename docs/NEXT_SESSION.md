# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-11-22 (3세션 협업 첫 회차 — 레거시 2.1.41 보안 대조 + 결함 수리 7건,
>       main HEAD `3f88ab5`. 미완성 D-7 은 브랜치 `WT-admin-guard-wip` `e5a54f5`)
> source_session_id: a7f0ac2e-6672-4e9c-82b3-efba47bd0e71

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. rhymix-ts — D-7 관리자 서버 액션 가드 통일 마무리.
applied lessons: feedback-agent-test-claims-verify-by-rerun.md, feedback-domain-fix-count-all-callers.md, feedback-batch-replace-needs-line-numbers.md
source_session_id: a7f0ac2e-6672-4e9c-82b3-efba47bd0e71

전제 검증:
1) git fetch origin && git rev-list --count --left-right origin/main...main → 0 0
2) git rev-parse --short origin/WT-admin-guard-wip → e5a54f5
3) docker start rhymix-ts-db → 컨테이너 기동

실행: WT-admin-guard-wip 를 워크트리로 열어(main 체크아웃에서 브랜치 전환 금지)
      실패 테스트 3파일 31건을 고치고 tsc apps/web 0건 확인 → main 에 병합·푸시.
      상세는 docs/NEXT_SESSION.md 'D-7 이어하기' 절.

후속: 보고서 §2 남은 항목(로그아웃 출처 검사, 상담 게시판, 무살균 HTML 출력 2곳),
      레거시 2.1.41 기능 변경 대조.

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-11-22)

3세션 협업 구성(moai=opus 총괄, moai2=sonnet 구현, moai3=haiku 보조)으로 진행했다.
구성 규칙은 각 컴퓨터의 `CLAUDE.local.md`(커밋 안 함). `start-moai-cg.ps1 -Session <이름> -Model <모델>`.

### 지난 회차 미검증분 마감 (`c660c23` 린트 정리)

- apps/web vitest 전체: 157파일 1,112 통과 / 5 skip, exit 0 (`--testTimeout=300000`, 39분)
- 브라우저: 관리자 모듈·`<Link>` 변경 4화면·`/signup` 약관·`/notifications`·그룹 하이드레이션 정상,
  그룹 추가 화면 "← 목록으로" 링크 정상. 알림 데이터가 있을 때의 목록은 미확인

### 레거시 Rhymix 2.1.33 → 2.1.41 보안 대조

`/mnt/d/project/rhymix` 를 pull(커밋 253, `4e8c55108`→`08dda97d6`). RVE-2026-19~47 의 28건을
rhymix-ts 와 대조 → 결함 3, 확인 필요 4, 해당 없음 12, 안전 8.
보고서: `.moai/reports/legacy-2.1.41-security-audit-2026-11-22.md` (`9da9003`)

### 수리 (전부 main 에 푸시, 재현 테스트 → 수정 → 통과, 총괄이 재실행으로 확인)

| 커밋 | 내용 | 실측 |
|---|---|---|
| `b21130d` | 로그인·2FA `callbackUrl` 오픈 리다이렉트 차단(`lib/auth/safe-redirect.ts`) | 브라우저: 외부 주소 3종 → `/`, `/free` 정상 |
| `61a794c` | `content.document.get/list` 열람 권한 + 비밀번호 해시·메일·IP 응답 제외 | curl: 없는 글 404, 비로그인 TEMP 빈 목록 |
| `dd4e66e` | 페이지 본문 `rx-widget` 원본 토큰 복원 중단(저장형 XSS) | 단위 테스트만 |
| `b397b1a` | 권한 미설정 게시판의 list·view 기본값을 전체 허용(레거시 default="guest") | — |
| `4a93f65` | 상세·수정 화면: 삭제 글·남의 TEMP·다른 게시판 글 404, view 권한 검사 | curl: `/notice/2` 404, `/free/2` 200 |
| `fdf524c` | 상세 이전글·다음글을 `Board.id` 로 조회(인스턴스 id 를 넘기던 결함) | 단위 테스트만(dev DB 는 두 id 가 같음) |
| `3f88ab5` | `content.document.adjacent` 에 list 권한·기준 글 상태 검사 | 단위 테스트만 |

부수 영향: `b397b1a` 로 권한 미설정 게시판의 RSS 피드가 공개로 바뀜(레거시와 동일, 실측 안 함).

## D-7 이어하기 — 관리자 서버 액션 가드 통일 (미완성)

**문제**: tRPC `protectedAdminProcedure` 는 ① 관리자 판정 ② 관리자 IP 제한·사이트 잠금
③ 2FA 를 거치는데, tRPC 를 거치지 않는 관리자 Server Action 은 ①만 하거나
(`session.user.isAdmin` 만 보는 7개는 관리자 그룹 사용자를 오히려 막음) ②③을 건너뛴다.
**가장 큰 구멍**: `apps/web/app/admin/boards/[mid]/{categories,extra-keys,feed,permissions}/page.tsx`
의 인라인 Server Action 6개는 본문에 가드가 전혀 없고 렌더 시점 검사에만 의존한다
(feed·permissions 는 `board.update` 직접 수행).

**브랜치 `WT-admin-guard-wip` (`e5a54f5`) 상태**
- `apps/web/server/api/admin-guard.ts` — tRPC 에서 ②③ 로직 추출(trpc.ts 는 이 함수를 import).
  server/api 50파일 408건 통과로 회귀 없음 확인
- `apps/web/lib/auth/admin-guard.ts` — Server Action 용 헬퍼 `assertAdminServerAction()`
- 33개 함수에 적용 완료. 실패 방식: 가드 없던 8개(인라인 6 + theme 2)는 throw Error,
  기존 계약이 있는 함수는 각자 계약(throw / redirect / {error}) 유지
- **실패 중**: 테스트 3파일 31건
  - `apps/web/app/admin/site/design/actions.test.ts`, `apps/web/lib/auth/admin-actions.test.ts` — auth mock 이 옛 방식
  - `apps/web/app/admin/pages/[instanceId]/edit/actions.guard.test.ts` — `adminServerActionCheck` 대신
    `assertAdminServerAction` 을 mock 한 오류
- **미실행**: 헬퍼 적용 후 `tsc --noEmit -p apps/web/tsconfig.json`

**마무리 순서**: 실패 3파일 수정 → 헬퍼·인라인 액션 재현 테스트가 수정 전 상태에서 실패하는지 확인
→ `apps/web/app/admin` + `apps/web/lib` + `apps/web/server/api` 테스트 → tsc → main 병합·푸시.

⚠️ 이 컴퓨터(작성 시점)의 main 체크아웃에는 같은 D-7 변경이 **미커밋으로 남아 있다**.
브랜치와 동일하므로, 브랜치에서 이어 작업한다면 main 체크아웃의 미커밋분은 버려도 된다
(버리기 전에 `git diff --stat` 이 23파일인지 확인). 워크트리: `/mnt/d/project/rhymix-ts-wt-admin-guard`.

## 보고서 §2 남은 확인 항목

- 로그아웃 출처 검사 없음(`apps/web/app/auth/signout/route.ts`) — `SameSite=Lax` 라 외부 사이트 공격은 막힘
- 상담 게시판 `Board.consultation` — 값은 있으나 미구현
- 무살균 innerHTML 2곳 — `packages/board/src/actions/comment-update.ts:90`+`CommentItem.tsx:108`,
  `apps/web/lib/widgets/renderer.tsx:57` (현재 호출자 없음)
- 회원 다중 그룹은 첫 그룹으로만 권한 판정(기존 규칙, 미변경)


## 검증 방법론 메모 (계속 유효 + 이번 추가분)

- **자리표시자 주석의 "없다" 를 믿지 말 것.** 이력 페이지는 없는 이름
  (`listDocumentHistory`)을 찾고 있었고, 실제 함수는 다른 이름으로 이미 있었다.
  "미구현" 주석을 보면 도메인 패키지에서 **기능**으로 먼저 grep 할 것
- **링크를 만드는 코드도 검증 대상이다.** 첫 화면만 보면 결함 1번은 안 보인다.
  검색·필터 화면은 **거기서 나가는 링크를 한 번 따라가 봐야** 한다
- **커버리지 100% 도 죽은 코드일 수 있다.** `packages/file/src/server` 가 정확히
  그랬다. 테스트가 앱 전용 alias(`@/lib/...`)를 mock 하면, 패키지에서는 성립할 수
  없는 배선도 100% 로 찍힌다. 판단 기준은 커버리지 수치가 아니라 **도달 가능성**
  (호출자 / `exports` 서브패스 / tsconfig 포함 여부)이다
- **일괄 치환은 "같은 문자열의 몇 번째"를 반드시 지정할 것.** 린트 정리 중
  `const result = await voteComment(` 를 문자열로 바꿨더니 지적받은 141행이 아니라
  **앞쪽의 정상 동작하던 39행**이 바뀌었다. 4개 파일에서 같은 사고가 났고
  되돌린 뒤 줄 번호를 직접 지정해 다시 했다. 린터 출력의 line 을 쓸 것
- **E2E 도구의 strict mode 위반은 제품 결함 신호일 수 있다.** `locator('main')`
  이 2개를 잡은 것이 곧 중첩 랜드마크 결함이었다
- (이전 세션분) "테스트 0%" 는 대상이 없다는 뜻일 수도 있다 / `as any` 는 결함을
  숨긴다 / 회귀 테스트는 결함 상태로 되돌려 실패를 확인할 것 / mock 이 손수 넣은
  필드는 증거가 아니다 / Playwright `hasText` 는 select 옵션까지 매칭한다 /
  호출자 수를 세고 시작 / `networkidle` 은 HMR 때문에 안정되지 않는다 /
  `button[type=submit]` 은 헤더의 로그아웃을 먼저 잡는다

## 로그인 자격증명 (로컬 dev DB)

`admin` / `Admin1234!` · `member1` / `Member1234!` (일반회원)

## 현재 DB 상태

- 게시판 2개: `notice`(id=2) / `free`(id=3), 문서 3건, 태그 0건, 수정이력 0건
- `boards.updateLog` 는 둘 다 false — **이력이 쌓이지 않는 설정**이다.
  이력 화면을 다시 볼 일이 있으면 free 게시판만 켜고 확인 후 되돌릴 것
- 회원 그룹 1개(`일반회원`, isDefault). 이 DB 는 설치 마법사가 아니라 e2e 시드로
  만들어져 그룹·메뉴가 비어 있다. 설치 시드
  (`packages/db/src/install/seed.ts:181`)는 정상이므로 코드 결함이 아니다

## 후보 작업 (전부 선택적)

- **D-7 마무리** (기본 권장) — 위 절 참고
- **레거시 2.1.41 기능 변경 대조** — 회원 인증 로그 통합(`member_auth_log`), 계정 찾기 보안 옵션,
  세션 ID 갱신 옵션, 문서·댓글 관리에서 차단, 존재하지 않는 페이지·분류 404 등. 목록만 있음
- **글쓰기·댓글 기본 권한** — ts 는 회원만, 레거시는 비회원 허용. 의도 확인 필요
- **FTS 한국어 형태소** — config 가 'simple' 이라 "첫 공지입니다" 가 '공지' 로
  검색되지 않는다(토큰이 '공지입니다'). pg_bigm 또는 n-gram 검토
- **주 DB 재시드** — 설치 마법사를 실제로 태워 그룹/메뉴가 있는 상태로 만들기
- **비회원 비밀글** — `packages/document/src/secret.ts` 의 비밀번호/해제토큰 4함수는
  구현·테스트가 있으나 호출자 0곳
- **레이아웃 extraVars 경고** — `/`·`/notifications` 에서 `extraVars 파싱 실패 … received null`


## 린트 현황

`eslint.config.mjs`(루트) 가 `packages/*` + `themes/*` 를 담당하고, apps/web 은
기존 `apps/web/eslint.config.mjs`(eslint-config-next)를 그대로 쓴다. 각 패키지의
`lint` 스크립트는 `eslint --config ../../eslint.config.mjs src` 다 — ESLint 9 는
cwd 위로 설정을 찾아 올라가지 않으므로 경로를 명시해야 한다.

심각도 방침: **error** 는 고치면 코드가 줄거나 위험이 사라지는 것,
**warn** 은 한 번에 못 없애는 기존 부채.

| 대상 | error | warning |
|---|---|---|
| `packages/*` + `themes/*` | **0** | 363 |
| `apps/web` | **0** | 263 |

`pnpm lint` 는 이제 19/19 성공한다.

### 켜면서 끈 규칙과 이유

- `no-undef`, `no-redeclare`: TS 가 이미 담당. 특히 `const X = {...} as const` +
  `type X = ...` 는 이 저장소가 열거형에 쓰는 정상 관용구라 TS 인지 버전까지 껐다
- `no-explicit-any`: 308건이라 warn. 테스트에서 끄지 **않았다** — 저장소가 이미
  줄 단위 `eslint-disable-next-line` 으로 표시해 온 관례가 있어서, 끄면 그 주석
  245개가 전부 "미사용 disable" 이 된다

### 남긴 부채

- `getSiteSetting` / `setSiteSetting` 의 `any`: `Prisma.JsonValue` 로 좁히면
  호출부 3곳에서 실제 타입 불일치가 드러난다(`null` 이 `boolean` 자리 등).
  값진 신호이므로 그 정리는 별도 작업으로 남겼다
- `set-state-in-effect` 6건: 서버 데이터를 로컬 상태로 복사하거나 연쇄 초기화하는
  자리라 파생값으로 만들 수 없어 사유를 적어 disable 했다

## 커버리지 현황 메모

`vitest.config.ts` 의 `coverage.include` 는 이제 11개 항목 14,022행이고
`apps/web/server/api` 가 10,172행(73%)으로 지배적이다. 임계값 85% 는 CI 에서
강제되지 않는다 — `package.json` 의 수동 `test:coverage` 뿐이고 워크플로에
coverage 실행이 없다. `packages/file` 은 이번 정리로 include 에서 완전히
빠졌으므로, 그 패키지의 커버리지를 다시 재고 싶으면 include 항목을 새로
추가해야 한다(`attachment.ts` / `storage/**` / `admin.ts` 등).

## 환경 함정 (계속 유효 + 이번 추가분)

- **Docker CLI 가 `command not found` 면 Docker Desktop 이 꺼진 것이다.**
  `/usr/bin/docker` 는 `/mnt/wsl/docker-desktop/...` 로 가는 심볼릭 링크라
  Desktop 이 꺼지면 깨진 링크가 된다. 기동:
  `nohup "/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe" >/dev/null 2>&1 &`
  기동 후에도 PATH 에 안 잡히면 `/mnt/wsl/docker-desktop/cli-tools/usr/bin/docker`
  를 직접 지목. 그 다음 `docker start rhymix-ts-db`
- **dev 서버는 `./node_modules/.bin/next` 를 셸로 실행할 것.** `node` 로 실행하면
  그 파일이 셸 스크립트라 `SyntaxError` 가 난다. 경로도 `apps/web/node_modules`
  아래지 저장소 루트가 아니다
- **vitest 는 저장소 루트에서 실행할 것.** include 패턴이 루트 기준이라
  `apps/web` 안에서 돌리면 "No test files found" 가 난다
- **`/mnt/d` 는 inotify 미작동 → 코드 수정 후 dev 서버 재기동 필수.**
  `.next/dev/lock` 먼저 제거. 콜드 컴파일 ~220초. 라우트별 첫 컴파일도
  120초를 넘길 수 있으니 Playwright 전에 curl 로 워밍할 것
- **`.git/index.lock` 충돌이 잦다.** `moai statusline` 이 매 렌더마다 git 을 돌린다.
  `for i in 1 2 3; do rm -f .git/index.lock; git add ... && git commit ... && break; done`
- **`pgrep -f "next[ ]dev"` 도 자기 자신을 잡는다**(exit 144). PID 를
  `ps -eo pid,cmd | grep -F "next/dist/bin/next"` 로 뽑아 `kill <pid>`
- **`npx` 가 Windows 바이너리로 잡힌다.** 매 Bash 앞에
  `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"`, 도구는
  `node_modules/.bin/<tool>` 직접 지목
- **DB 테이블은 snake_case, 컬럼은 camelCase 다** (`documents` / `"boardId"`).
  psql 에서 컬럼은 큰따옴표로 감쌀 것
- **DB 접속**: `docker exec rhymix-ts-db psql -U rhymix -d rhymix_ts`
  (`postgres` 롤은 없다)
- **foreground `sleep` 은 막혀 있다.** 대기는 `curl --retry N --retry-delay S
  --retry-connrefused` 로 대체
- **vitest `--reporter=line` 은 이 설정에서 안 먹는다.** `--reporter=verbose` 또는 `dot`
- **vitest 위치 인자는 글롭이 아니라 경로 정규식이다.** 괄호가 든 경로는
  이스케이프가 꼬이므로 `'history/page'` 같은 단순 부분문자열을 쓸 것
- **`moai gate` pre-commit 은 전체 vitest 스위트를 돌린다.** 범위에 맞는 검증을 직접 하고
  `SKIP_MOAI_PRECOMMIT=1` + 사유를 커밋 본문에 남기는 게 이 저장소의 규약이다
- **커밋은 명시 pathspec 으로만.** 미커밋 400+ 하네스 템플릿 상주 — `git add -A` 금지
- **docker**: rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444)

- **`.git/index.lock` 이 몇 초 만에 다시 남는다.** 3세션 상태표시줄의 `git status` 가 부하로
  느려졌다가 시간 초과로 죽으며 잠금을 남긴다. 잠금 파일의 생성 시각이 지금 떠 있는 git 프로세스보다
  오래됐으면 지우고 **같은 명령 안에서** 바로 add·commit 할 것
