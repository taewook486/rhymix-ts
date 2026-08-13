# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-13 (모노레포 전체 typecheck 0건 달성) / source_session_id: 66162e5b-24ee-4070-be75-d505dcc10501

## 붙여넣을 메시지

```text
ultrathink. rhymix-ts 후속 작업 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-cg-mode-path-corruption, feedback-stale-git-index-lock, project-setup

전제 검증:
1) docker.exe ps → rhymix-app/rhymix-db/rhymix-ts-db 3개 Up (Exited면 docker.exe start <name>)
2) git log --oneline -1 → d291891 이거나 그 이후 SHA, main == origin/main
3) git status --porcelain → 비어있어야 함
4) pnpm --filter web dev 기동 후 curl localhost:3000 → 200 (첫 컴파일 ~2분)

실행: 아래 "다음 작업 후보"에서 하나 선택 후 /moai plan

후속: plan → run → sync
```

## 현재 상태 (2026-08-13 밤)

- **main == origin/main, 작업 트리 clean.** 이번 세션 커밋: `e641e8a`, `537b876`, `d291891`
- 완료된 SPEC: `SPEC-FRONT-PARITY-001` **completed**
- 진행 중인 SPEC: `SPEC-CONTENT-PARITY-001` (in-progress)
- **`pnpm typecheck` 전체 통과 (17/17, exit 0)** — 모노레포 전체 게이트화 달성.
  이번 세션에서 남아 있던 72건을 해소했다:
  - `@rhymix-ts/page` 1건 — `react-dom`/`@types/react-dom` 미선언 (`537b876`)
  - `@rhymix-ts/notification` 2건 — `noUncheckedIndexedAccess` 옵셔널 체이닝 (`e641e8a`)
  - `@rhymix-ts/document` 69건 — 부분 픽스처가 Prisma 모델 타입과 불일치 (`e641e8a`)
- **`packages/document/src/__fixtures__.ts` 신설** — 5개 모델의 완전한 기본값 + 빌더.
  override 가 `Partial<Model>` 로 검사되므로 **스키마가 바뀌면 테스트가 먼저 깨진다.**
  기존처럼 `as any` 로 덮는 방식이 아니다.
- **vitest 이중 설치 해소** (`537b876`) — 루트 `^2.1.9` / 패키지 `^3.0.0` 혼재로
  `@vitest/expect` 2.1.9 와 3.2.4 가 동시 설치돼 `rejects.toThrow(문자열)` 만
  오작동하고 있었다. 루트/admin/test-utils 를 `^3.0.0` 으로 통일.
- **`packages/page` 테스트 최초 배선** (`537b876`) — `vitest.config.ts` 도 `test` 스크립트도
  없어 테스트 2파일이 한 번도 실행된 적이 없었다. 배선하니 24건 통과.
  `environment: 'node'` 에서는 `isomorphic-dompurify` 로드가 끝나지 않아 jsdom 필요.
- **루트 `testTimeout` 15초 → 60초** (`537b876`) — 개별 패키지는 이미 60초였고 루트만
  뒤처져, WSL2 병렬 실행에서 매번 임의의 파일 4~6개가 타임아웃으로 실패하고 있었다.
- **`.gitignore` 결함 수리** (`d291891`) — `*-key.*` 가
  `apps/web/server/api/routers/admin/content-extra-key.ts` 와 그 테스트를 삼켜
  **한 번도 커밋되지 못하고 있었다.** 다른 PC 에서는 이 파일들이 없었다는 뜻이다.

### ⚠️ 다음 세션에서 먼저 할 일: 전체 스위트 완주 확인

루트 `testTimeout` 상향 후 전체 스위트를 돌렸으나 **255/290 파일 시점에서 중단**했다
(사용자 PC 종료). **중단 시점까지 실패 0건**이었고, 그 전 실행에서 실패했던 6건
(`document A-9`, `page SVC-8`, `comment` 2건, `board VP-1`, `AdminSidebar M1-1`)이
모두 통과로 바뀐 것은 확인했다. 남은 35개 파일은 미검증이다.

```bash
pnpm test    # 약 1시간. 0 실패면 타임아웃 원인이 최종 확정된다
```

개별 검증은 모두 통과한 상태다 — `pnpm typecheck` 17/17, document 237건,
admin 179건, page 24건, notification 48건, test-utils 5건.

## SPEC-FRONT-PARITY-001 결과 요약

| 마일스톤 | 내용 | 커밋 |
|---|---|---|
| M1 | 중복 마크업 해소 (footer 3→1, main 3→1) | `64136f5` → `3b003d5`(결함 복구) |
| — | 실제 렌더 검증 e2e 신설 | `6f69b12` |
| M2 | 인덱스 모듈 board → page 전환 + 환영 콘텐츠 | `068eefb` |
| sync | 3-phase close | `578625d`, `fa86b52` |

핵심 설계: `GlobalFooter`는 **동기·무의존** 컴포넌트로 유지하고, DB/auth 접근이 필요한
FOOTER 슬롯은 `FooterMenuSlot.tsx`(async)로 분리해 루트 레이아웃에서 children으로 합성한다.
`GlobalFooter`에 prisma/next-auth를 직접 import하면 jsdom 테스트에서 모듈 해석이 깨진다.

## 다음 작업 후보

### 1. 전체 스위트 완주 확인 (권장 — 위 ⚠️ 항목)

`pnpm test` 를 끝까지 돌려 0 실패를 확인한다. 실패가 남으면 타임아웃 외의 원인이
있다는 뜻이므로 개별 조사가 필요하다.

### 2. `extraVars.footerText` 루트 배선 (SPEC-FRONT-PARITY-001 잔여 부채)

`GlobalFooter({ footerText })` prop 구조는 갖췄으나, 도메인 레이아웃 레코드의
`extraVars.footerText`를 루트 레이아웃까지 전달하는 배선이 없어 현재는 항상 기본
attribution이 렌더된다. 루트 레이아웃에는 module-instance 컨텍스트가 없어 별도 조회가 필요.

### 3. 방문자 화면 parity 2단계 (SPEC-FRONT-PARITY-001 Out of Scope 분리분)

디자인 자산 제작 영역: 히어로 캐러셀(레거시 슬라이드 6개, swiper), 메인 섹션(intro/가이드
6카드/커뮤니티 4카드), 웹폰트(`webfont.css`), 모듈별 스킨 CSS 계층.
그리고 `/admin`·`/install`·`(member)` 라우트의 `<main>` 중첩 전역 정리(22개 파일) —
`/install/**`는 Playwright 스냅샷에서 `main > main` 중첩이 실측 확인됨.

## 환경 재현

- Node: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"`
- 컨테이너: `rhymix-app`(레거시 PHP :8080), `rhymix-db`(MariaDB :3307),
  `rhymix-ts-db`(Postgres :5444)
- 관리자 계정(설치 위저드 기본): `admin` / `Admin1234!` / comfit99@gmail.com
  (e2e 스펙은 `admin` / `e2e-password-1234` / admin@e2e.local 사용)
- DB 접속: `docker.exe exec rhymix-ts-db psql -U rhymix -d rhymix_ts -c "<SQL>"`
  (WSL2에 psql 클라이언트가 없으므로 컨테이너 경유)
- DB 재설치:
  ```bash
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<동의 문구>" \
    pnpm --filter @rhymix-ts/db exec prisma migrate reset --force --skip-generate
  ```
  **재설치 후 dev 서버 재시작 필수** — enum 타입 OID가 재생성되어 기존 커넥션 풀이
  `cache lookup failed for type NNNNN`로 실패한다.
- e2e 실행: `cd apps/web && npx playwright test --workers=1` (전체)
  일부 spec은 `CI_E2E=1` 게이트가 걸려 있어 기본 실행에서 skip된다 —
  `CI_E2E=1 npx playwright test board-ui layout-default page-module widget-login-info feed`
  `resetDb()`는 이제 public 스키마 전체를 TRUNCATE 하므로 연속 재설치가 정상 동작한다
  (설치 위저드 마지막 버튼은 Playwright click이 안 먹으므로 `form.requestSubmit()` 사용)
- 레거시 재설치: 컨테이너 안에서 `files/config/{config,db.config,ftp.config}.php` 비활성화
  (config.php만 지우면 구버전 마이그레이션 경로를 잘못 타서 Fatal error) + DB drop/create
- `.git/index.lock`이 살아있는 프로세스 없이 자주 남음 → `lsof .git/index.lock` 확인 후
  `rm -f`. 상태줄 훅이 `git status --porcelain`을 자주 폴링해 재발하므로, 커밋은
  `rm -f .git/index.lock && git commit` 을 짧은 루프로 재시도하는 편이 안정적이다.

## 이번 세션의 교훈

**비결정적 실패는 단일 대조로 판정할 수 없다.** 전체 스위트에서 6건이 실패해
"내 변경 탓인가"를 가리려고 baseline worktree 에 변경 전 커밋을 체크아웃해 같은
스위트를 돌렸다. 변경 전은 4건 실패였는데 **겹치는 것은 1건뿐**이었다. 두 실행의
실패 집합이 거의 겹치지 않아 대조 자체가 성립하지 않았다. 원인은 전부
`Test timed out in 15000ms` 하나였고, 어느 파일이 걸리느냐만 실행마다 달랐던 것이다.

교훈: 실패 목록을 비교하기 전에 **실패 원인부터 분류**할 것. 전부 타임아웃이면 그
자체가 비결정성 신호다. 그리고 대조를 반복하지 말고 **원인 가설을 직접 제거해서
검증**할 것 — 이번엔 `testTimeout` 을 올려 재실행하는 게 답이었다.

**넓은 gitignore 패턴은 소스를 조용히 삼킨다.** `*-key.*` 가 `content-extra-key.ts` 와
그 테스트를 한 번도 커밋되지 못하게 막고 있었다. `git status` 에는 무시된 파일이
안 나오므로 아무 신호가 없었고, baseline worktree 의 테스트 파일 수가 1개 적은 것
(290 vs 289)에서 우연히 드러났다. `.gitignore` 에 이미 "overly broad 패턴을 좁혔다"는
주석이 있었는데도 여전히 넓었다.

점검: `git status --porcelain --ignored=matching | grep '^!!'`,
개별 확인은 `git check-ignore -v <path>`.

---

## 이전 세션의 교훈 (유지)

컴파일/테스트 통과는 "실제로 렌더된다"의 증거가 아니다. 화면이 있는 변경은
브라우저로 열어 콘솔까지 확인할 것. 그리고 정적 검사나 mock 이 실제 형태를 가리는
결함이 반복해서 나왔다 — 캐스트(`as unknown as`)와 손수 채운 픽스처가 대표적이다.
이번 세션의 `__fixtures__.ts` 는 그 대응으로, 픽스처가 실제 모델 타입 검사를 받게 했다.
