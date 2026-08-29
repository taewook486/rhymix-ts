# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-29 (검색 실측으로 미검증분 종료 + 제품 결함 3건 수리 +
>       packages/file/src/server 정리. 커밋 5개 `137c527`..`3896250`)
> source_session_id: 2f8b2d77-cc25-4db4-9f5c-046000108216

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. rhymix-ts — 후보 작업에서 하나 골라 진행.
지난 회차에 미검증분(게시판 내 검색)을 브라우저로 닫았고, 그 과정에서
결함 3건(검색 링크 searchField / 이력 페이지 자리표시자 / 중첩 main)을
수리했다. 지금은 열려 있는 미검증분이 없다.

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
2) docker start rhymix-ts-db → 컨테이너 기동
   (docker CLI 가 안 잡히면 Docker Desktop 부터: 아래 '환경 함정' 참고)
3) apps/web dev 서버 기동 (콜드 ~220초). /mnt/d 는 inotify 미작동이라
   패키지 수정 후에는 반드시 재기동해야 반영된다

실행: docs/NEXT_SESSION.md '후보 작업' 에서 하나 고른다.
      기본값은 '15개 패키지 린트 구성' 이다.

후속: FTS 한국어 형태소, 주 DB 재시드, 비회원 비밀글.

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-29)

지난 회차가 남긴 유일한 미검증분(게시판 내 검색)을 브라우저로 확인했다.
**3겹 수리는 전부 정상이었고**, 확인하는 과정에서 새 결함 3건이 나왔다.

### 수리한 결함 3건

| # | 결함 | 커밋 |
|---|---|---|
| 1 | 검색 결과 화면의 모든 링크가 `searchField` 에 검색어를 실어 보냄 | `137c527` |
| 2 | `/documents/[id]/history` 가 "구현 예정" 자리표시자 | `64c3223` |
| 3 | 페이지 16개가 루트 레이아웃의 `<main>` 안에 `<main>` 을 또 염 | `3a23950` |
| 4 | `packages/file/src/server/` 미사용 계층 1,811행 (정리) | `3896250` |

**1번**: `index-page.tsx` 의 `buildUrl` 이 `searchField: search` 로 되어 있었다.
검색어가 `searchField` 자리에 들어가고, 그 값은 title/content/author 중 어느
것도 아니라 페이지 파싱에서 `title` 로 폴백된다. 결과적으로 **내용 검색을 한 뒤
링크를 한 번 누르면 조용히 제목 검색으로 바뀐다**.
실측: `/free?search=작성자&searchField=content` 2건 → 카드형 링크 이동 후 1건.
수리 후 2건 유지. 회귀 테스트 2건 추가(결함 되돌려 RED 확인).

**2번**: 페이지 주석이 "listDocumentHistory 가 패키지에 없다" 고 적어 뒀는데,
실제 함수 이름은 `getUpdateHistory` 였고 `packages/document/src/history.ts` 에
이미 있었다. tRPC 라우터(`content.history.document`)도 그 함수를 쓰고 있었다.
drafts 페이지와 같은 방식(Server Component → 도메인 함수 직접 호출)으로 배선.
권한 판정은 도메인이 하고 페이지는 `BoardPermissionDeniedError` 를 안내로 바꾼다.
돌아가기 링크는 `board.moduleInstance.mid` 를 조회해 `/{mid}/{id}` 로 만든다
(`/documents/{id}` 라우트는 존재하지 않는다).

**3번**: 2번을 실측하다 Playwright 가 `locator('main')` strict mode 위반을 냈다.
`/tags` 가 `<main>` 을 2개 내보내고 있었다. 루트 레이아웃 것만 남기고 안쪽
16개 파일을 `<div>` 로 바꿨다. className 무변경이라 화면은 그대로다.

**4번**: document 쪽(`cf16c6e`)과 같은 형태의 미사용 계층. 근거 4가지가 전부
같은 방향이었다 — 호출자 0곳 / `package.json` 의 `exports` 가 `.` 뿐이라 주석이
안내하는 `@rhymix-ts/file/server/actions` 경로가 해석조차 안 됨 / 패키지 자신의
`tsconfig.json` 이 `src/server/actions.ts` 를 exclude(앱 alias 를 못 풀어서) /
**커버리지 100% 는 앱 전용 alias 를 mock 해서 나온 숫자**였다. 곁들여
`vitest.config.ts` 의 `coverage.include` 에서 이미 지워진
`packages/document/src/server/**` 도 함께 정리했다(지난 회차 누락분).

### 검증

- 브라우저 실측(admin 로그인): 비로그인 차단 / 이력 0건 / 문서 수정 후 이력 1건
  렌더 / 돌아가기 링크 `/free/2` / 없는 문서·잘못된 id 404 / member1 권한 거부
- 로그인 상태 11개 라우트 전부 200 · `<main>` 1개 · 에러 화면 없음
- 설치 라우트 4개 410(설치 완료 상태), `/install/complete` 200
- 타입체크: packages/board, apps/web 각 0건
- 테스트: index-page 24건, history/page 6건 통과.
  전체 `apps/web/app` 63파일 366건 통과(중첩 main 치환 후 회귀 확인)
- 검증에 쓴 DB 변경(board.updateLog, 이력 행, 문서 제목)은 전부 되돌렸다
- 정리 후: packages/file 8파일 97건, 소비자(admin.file 라우터 + FileManagementClient)
  2파일 10건 통과, packages/file·apps/web 타입체크 각 0건

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

- **린트 구성** (기본 권장) — `packages/admin` 만이 아니라 15개 패키지 전부
  `echo 'no lint'` 다
- **FTS 한국어 형태소** — config 가 'simple' 이라 "첫 공지입니다" 가 '공지' 로
  검색되지 않는다(토큰이 '공지입니다'). pg_bigm 또는 n-gram 검토
- **주 DB 재시드** — 설치 마법사를 실제로 태워 그룹/메뉴가 있는 상태로 만들기
- **미병합 브랜치 19개** — 17개는 동일한 harness 훅 커밋 중복, 1개는 두 달 전
  feature 브랜치. 제품 작업은 아니다
- **`/admin/members` 하이드레이션 경고** — 재현이 들쭉날쭉해 원인 미특정
- **비회원 비밀글** — `packages/document/src/secret.ts` 의 비밀번호/해제토큰 4함수는
  구현·테스트가 있으나 호출자 0곳. 회원 비밀글은 작성자·관리자 게이트로 동작한다

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
