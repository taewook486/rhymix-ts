# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-13 (알림 폼 JSX 수리 반영) / source_session_id: 7352565e-ef45-4c59-bb52-cf804324af63

## 붙여넣을 메시지

```text
ultrathink. rhymix-ts 후속 작업 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-cg-mode-path-corruption, feedback-stale-git-index-lock, project-setup

전제 검증:
1) docker.exe ps → rhymix-app/rhymix-db/rhymix-ts-db 3개 Up (Exited면 docker.exe start <name>)
2) git log --oneline -1 → ed6fb9c 이거나 그 이후 SHA, main == origin/main
3) git status --porcelain → 비어있어야 함
4) pnpm --filter web dev 기동 후 curl localhost:3000 → 200 (첫 컴파일 ~2분)

실행: 아래 "다음 작업 후보"에서 하나 선택 후 /moai plan

후속: plan → run → sync
```

## 현재 상태 (2026-08-13)

- **main == origin/main (`ed6fb9c` 이후), 작업 트리 clean.**
- 완료된 SPEC: `SPEC-FRONT-PARITY-001` **completed** (AC-FP-001~007 7건 전부 PASS)
- 진행 중인 SPEC: 없음
- e2e 인프라 수리 완료 (`9cf3149`) — `db-reset.ts`가 `pg_tables` 동적 조회로 전환되어
  재설치 롤백 결함이 해소됐다.
- RSS 500 수리 완료 (`d6de5d1`) — `feed.spec.ts`가 통과한다. **현재 알려진 e2e 실패는 없다.**
- 알림 설정 폼 JSX 수리 완료 (`ed6fb9c`) — 파싱 불가 결함 + form 중첩 hydration 오류 해소.
  `/admin/settings/notification`이 브라우저 콘솔 오류 0건으로 렌더된다.

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

### 1. 남은 typecheck 오류 10건 (권장 — 타입 검사 게이트화의 마지막 관문)

`pnpm --filter @rhymix-ts/web typecheck`가 아래 10건으로 여전히 실패한다. 전부 커밋
`baf71b3`(SPEC-CONTENT-PARITY-001 M7 메일 로그)에서 유입된 기존 결함이다.

```
app/admin/site/mail/logs/page.tsx        2건 — TS2307 모듈 해석 실패
  ('@/lib/api/client', '@rhymix-ts/trpc-server')
server/api/routers/admin/mail-log.test.ts 8건 — Context 타입 불일치
  (storage / scanner / uploadTokenSecret 누락) + TS2532
```

> 참고: `packages/board`의 `TagInput.test.tsx`에도 jest-dom 매처 타입 오류 5건이 있다
> (`toBeInTheDocument` 미인식). 커밋 `1426861`에서 유입된 별개의 기존 결함이며,
> `[[feedback-jest-dom-vitest-version-mismatch]]` 메모리의 vitest 버전 혼재 문제와 같은 계열이다.

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

이 세션에서 반복 확인된 것: 서브에이전트가 "테스트 전체 통과 / typecheck 0 errors"로 보고했으나 **재실행 결과 테스트
8건 실패**였다. 보고서의 Evidence 블록 자체가 자기모순(`<main>` 2개를 나열해두고 둘 다
"유지"라 쓴 뒤 "main 정확히 1개" PASS를 주장)이라 정독만으로도 탐지 가능했다.
완료 보고는 **반드시 같은 명령을 직접 재실행**해 확인할 것.

같은 계열의 결함이 이 세션에서 3건 더 나왔다 — 전부 **정적 검사나 mock이 실제 형태를
가리고 있던** 경우였다.

| 결함 | 가린 것 |
|---|---|
| RSS 500 (`doc.tags is not iterable`) | `as unknown as` 캐스트 + 픽스처가 `tags: []` 손수 주입 |
| e2e 재설치 롤백 | 손으로 관리하던 TRUNCATE 목록이 스키마 성장을 못 따라감 |
| 알림 폼 form 중첩 | 파일이 파싱조차 안 돼 hydration 오류가 드러날 기회가 없었음 |

교훈: **컴파일/테스트 통과는 "실제로 렌더된다"의 증거가 아니다.** 화면이 있는 변경은
브라우저로 열어 콘솔까지 확인할 것.
