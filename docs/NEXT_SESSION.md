# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-11-24 (D-7 재검증 후 origin/main 반영 — HEAD `3f83a44` 다음 이 문서 커밋)
> source_session_id: 2e62006e-6a35-4cbd-a898-8dfd3b6839e3

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. rhymix-ts — 레거시 2.1.41 보안 보고서 §2 남은 항목 처리.
applied lessons: feedback-stale-git-index-lock.md, feedback-agent-test-claims-verify-by-rerun.md, feedback-domain-fix-count-all-callers.md
source_session_id: 2e62006e-6a35-4cbd-a898-8dfd3b6839e3

전제 검증:
1) git fetch origin && git merge --ff-only origin/main → main 이 origin/main 과 같아짐 (지난 세션은 index.lock 때문에 로컬 main 을 못 올림)
2) git rev-list --count --left-right origin/main...main → 0 0
3) docker start rhymix-ts-db → 컨테이너 기동

실행: 무살균 innerHTML 2곳 확인·수리부터
      (packages/board/src/actions/comment-update.ts:90 + CommentItem.tsx:108, apps/web/lib/widgets/renderer.tsx:57).
      상세는 docs/NEXT_SESSION.md '보고서 §2 남은 확인 항목' 절.

후속: 로그아웃 출처 검사, 상담 게시판, 레거시 2.1.41 기능 변경 대조, 워크트리 2개 정리.

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-11-24)

- **D-7 관리자 서버 액션 가드 완료** — `3f83a44` 를 origin/main 에 fast-forward 푸시.
  - 11-23 에 moai2 가 실패 테스트 4파일의 mock 을 고쳤고(프로덕션 코드 무수정, 단언 무변경), 워크트리에서 한 커밋으로 정리됨
  - 재검증(워크트리 `3f83a44`): `vitest run apps/web/app/admin apps/web/lib apps/web/server/api` → 112파일 864건 통과 exit 0,
    `tsc --noEmit -p apps/web/tsconfig.json` → exit 0, `error TS` 0건. 로그: 메인 체크아웃 `.moai/state/verify/d7-merge/`
  - admin 아래 `'use server'` 파일 중 가드 패턴이 없는 파일 0개 (grep)
- **미완료 — 로컬 main 체크아웃이 `057b6db` 에 머묾.** `.git/index.lock` 을 지워도 몇 분 안에 다시 생김(빈 파일,
  살아 있는 git 프로세스 없음 → Windows 쪽 편집기/다른 세션의 git 폴링 추정). 그래서 푸시는 워크트리에서 `git push origin 3f83a44:main` 으로 함.
  다음 세션에서 lock 원인(VS Code 등)을 끈 뒤 `git merge --ff-only origin/main`
- 원격 `origin/WT-admin-guard-wip` 는 옛 WIP `e5a54f5` 그대로 — main 에 이미 반영됐으므로 삭제 대상
- 워크트리 `/mnt/d/project/rhymix-ts-wt-admin-guard`, `/mnt/d/project/rhymix-ts-baseline` 정리 대상
- 브라우저 실측은 하지 않음(관리자 IP 제한·2FA 상태에서 Server Action 거부 화면)

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

## D-7 관리자 서버 액션 가드 — 완료 (2026-11-24, `3f83a44`)

tRPC `protectedAdminProcedure` 의 판정(관리자 → IP 제한·사이트 잠금 → 2FA)을 `apps/web/server/api/admin-guard.ts` 로 추출하고,
Server Action 은 `apps/web/lib/auth/admin-guard.ts` 의 `assertAdminServerAction` / `adminServerActionCheck` 로 같은 판정을 받는다.
가드가 없던 게시판 인라인 액션 6개 + 테마 2개에 추가, 기존 33개는 실패 계약 유지한 채 교체.

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

- **보고서 §2 무살균 innerHTML 2곳** (기본 권장) — 위 절 참고
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
