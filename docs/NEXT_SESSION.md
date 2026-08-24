# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-24 (앱을 실제로 띄워 결함 4건 발견·수리. `2e422dd` + `5e7e46c`.
>       트리 clean, `0 0`)
> source_session_id: 5b98d696-190e-45f1-93ec-9f2c55431558

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. rhymix-ts — IndexModuleForm select 갱신 재확인부터.

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
2) docker 켜고 `docker ps` → rhymix-ts-db(5444) 등 3개 기동
3) apps/web 에서 `node_modules/.bin/next dev --turbopack` 재기동
   — /mnt/d 는 inotify 미작동이라 코드 수정 후 반드시 재기동해야 반영된다.

실행: /admin/domains 에서 홈 모듈을 바꾼 뒤, **새로고침 없이** select 값이
      방금 저장한 값으로 갱신되는지 확인. 이게 이번 커밋의 유일한 미검증분이다.

후속: 확인되면 packages/document/src/server 테스트 작성(원래 다음 작업)으로 복귀.

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-24)

**커버리지 작업이 아니라 "앱을 실제로 띄워본" 세션이다.** 그 결과 단위 테스트로는
잡히지 않는 제품 결함 4건이 나왔다.

### 환경 — 문서의 기존 서술 2건이 틀렸다

- **"68개 테이블 전부 0행"은 사실이 아니었다.** `users`/`sites`/`site_settings`/
  `domains` 각 1행 + `_prisma_migrations` 32행이 있었다. 설치는 이미 끝난 상태고
  `/install` 은 **410 Gone** 으로 정상 차단된다. 재시드했으면 멀쩡한 설치를 지웠다.
- 다만 그 설치는 사람이 한 게 아니라 **e2e 시드**다
  (`sites.installerUserAgent = 'e2e-seed'`, 2026-08-17).
- Docker Desktop 만 꺼져 있었고, 켜니 3개 컨테이너가 전부 자동 기동됐다.

### 로그인 자격증명 (로컬 dev DB)

`admin` / `Admin1234!` — DB에 실제 argon2id 해시는 있었지만 평문이 어디에도
기록돼 있지 않아 로그인 불가였다. 프로젝트와 동일 파라미터(t=3, m=64MiB, p=4)로
재설정했다. 프로덕션 소스 무변경.

### 수리한 결함 4건

| ID | 증상 | 커밋 |
|---|---|---|
| F1 | 관리자 대시보드 전일 대비 통계가 매 요청 실패 | `2e422dd` |
| D1 | 관리자 UI로 게시판/페이지 **생성 자체가 불가** | `5e7e46c` |
| D3 | 목록의 작성자가 항상 `-` | `5e7e46c` |
| D2 | 인덱스(홈) 모듈을 지정할 방법이 제품에 **없었음** | `5e7e46c` |

**F1** — `getDayOverDay` 가 Document 용 `siteFilter`(`board.moduleInstance`)를
`prisma.comment.count` 에 그대로 펼쳤다. Comment 에는 `board` 관계가 없어
(`boardId` 스칼라 + `document` 관계만) Prisma 가 거부했다.
→ `documentSiteFilter` / `commentSiteFilter` 분리 + 명시 Prisma 타입 주석.
타입 주석을 붙인 뒤로는 같은 실수가 `TS2561` 로 잡힌다(반증 실험 확인).

**D1** — `initModules()` 가 `instrumentation.ts` 에서만 호출돼, Turbopack 이
라우트/Server Action 을 별도 모듈 그래프로 묶는 순간 core 의 process-scoped
REGISTRY 가 빈 인스턴스로 보였다. 서버 컨텍스트 실측:
`{"runtimeRegistry":[], "staticRegistry":["board","page"]}`.
→ `createContext()` 에서 `initModules()` 호출 (HTTP tRPC 라우트와
`getServerCaller` 의 공통 진입점).

**D3** — `handleCreateDocumentForm` 이 `nickName: null` 하드코딩.
목록(`index-page.tsx`)과 작성자 검색이 `Document.nickName` 스냅샷을 직접 읽어
로그인 사용자 글도 전부 익명처럼 보였다. 상세 페이지는 User 조인이라 정상
표시돼 **목록/상세가 불일치**했다. → 작성 시 nickName 조회·스냅샷.

**D2** — `domain` 라우터에 `list`/`getById` 만 있고 mutation 이 없었다.
`indexModuleInstanceId` 를 쓰는 코드는 e2e 4곳의 raw SQL 뿐이었다.
→ `admin.domain.setIndexModule` mutation 신설(도메인/모듈 siteId 일치 검증 포함)
   + `/admin/domains` 선택 UI(`IndexModuleForm`) + Server Action.

### 미검증 — 다음 세션 첫 작업

`IndexModuleForm` 의 **저장 직후 select 갱신**이 코드만 적용되고 브라우저
재확인 전이다. 수정 전 실측 증상:

| 시점 | select | DB |
|---|---|---|
| 새로고침 직후 | 3 ✓ | 3 |
| 2 선택 후 저장 | **3** ✗ | 2 |
| 새로고침 | 2 ✓ | 2 |

저장은 항상 정상이고 DB 값도 정확했다. 드롭다운만 직전 값을 보여줘서 저장
실패로 오해할 수 있는 문제다. `router.refresh()` + select `key` remount 로
고쳤으나 **재확인 필요**.

### 현재 DB 상태 (검증용 데이터)

- 게시판 2개: `notice`(공지사항, id=2) / `free`(자유게시판, id=3)
- 문서 2건, 도메인 인덱스는 마지막 실행 기준 `notice`(id=2)
- 방문자 화면 3종(`/`, `/free`, `/free/1`) 전부 200, 콘솔 에러 0건

## 검증 방법론 메모 (반복 재발 방지)

- **mock 단위 테스트로는 이번 4건 중 어느 것도 못 잡는다.** F1/D3 은 Prisma mock 이
  잘못된 where 를 그대로 받아주고, D1 은 Turbopack 번들링, D2 는 부재하는 기능이다.
  커버리지 수치와 이 결함들은 **다른 축**이다.
- **수정 직후 첫 검증이 거짓 음성이었다.** F1 수정 후에도 브라우저에 에러가 그대로
  3건 나왔는데, 코드가 아니라 `/mnt/d` inotify 미작동으로 dev 서버가 변경을 못 본
  것이었다. **재기동 없이 "고쳤다"고 판단하면 틀린 보고가 된다.**
- Playwright 프로브에서 `button[type="submit"]` 은 헤더의 **로그아웃 버튼**을 먼저
  잡는다. `getByRole('button', { name: ... })` 로 특정할 것.
- `networkidle` 은 Next dev 의 HMR 웹소켓 때문에 **절대 안정되지 않는다**. URL 조건
  대기를 쓸 것.

## 후보 작업 (전부 선택적)

- **packages/document/src/server 테스트** — 원래 다음 작업이었다. `router.ts`(347행)
  + `actions.ts`(236행) 전량 0%. `packages/file/src/server` 를 본으로 삼을 것.
- **`userIdSnapshot` 미채움** — D3 에서 nickName 만 채웠다. 작성자 검색이
  `nickName OR userIdSnapshot` 을 보므로 절반만 동작한다. 스키마 확장 필요.
- **`packages/admin` 린트 구성** — 현재 `"lint": "echo 'no lint'"`.
- **주 DB 재시드 판단** — 지금 데이터는 e2e 시드 + 이번 세션 검증용 게시판/글이다.
- **잔여 worktree 정리**: `.claude/worktrees/agent-a09e6b3213e201359/`.

## 환경 함정 (계속 유효)

- **`/mnt/d` 는 inotify 미작동 → 코드 수정 후 dev 서버 재기동 필수.** `.next/dev/lock`
  먼저 제거. 이번 세션에서 이걸로 한 번 오판할 뻔했다.
- **`pgrep -f "next[ ]dev"` 도 자기 자신을 잡는다**(exit 144). PID 를 먼저
  `ps -eo pid,cmd | grep -F "next/dist/bin/next"` 로 뽑아 `kill <pid>` 할 것.
  `kill -9` 와 `pkill -9` 는 가드에 막힌다.
- **`moai` 바이너리가 2개다.** PATH 는 2.14.0(`gate` 없음), `~/.local/bin` 은 3.1.2.
  pre-commit 이 `moai gate` 로 실패하면 `SKIP_MOAI_PRECOMMIT=1` + 사유를 커밋 본문에.
- **`.git/index.lock` 은 `moai statusline` 이 만든다.** 재시도 루프로 뚫을 것
  (`sleep` 대신 fifo + `read -t`). 커밋 성공 여부는 파이프 없이 `git log` 로 확인.
- **`npx` 가 Windows 바이너리로 잡힌다.** 매 Bash 앞에
  `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"`, 도구는
  `node_modules/.bin/<tool>` 직접 지목. next 는 `apps/web/node_modules/.bin/next`.
- **vitest `--reporter=line` 은 이 설정에서 안 먹는다**(커스텀 리포터로 오인).
  `--reporter=verbose` 또는 `--reporter=dot`.
- **커밋은 명시 pathspec 으로만.** 미커밋 400+ 하네스 템플릿 상주 — `git add -A` 금지.
- **첫 요청은 Turbopack 콜드 컴파일로 30~90초.** 두 번째부터 2~3초.
- **docker**: rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444).
  WSL 에서 안 잡히면 Docker Desktop 의 WSL2 통합을 켤 것.
