# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-12 / source_session_id: 7352565e-ef45-4c59-bb52-cf804324af63

## 붙여넣을 메시지

```text
ultrathink. rhymix-ts 후속 작업 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-cg-mode-path-corruption, feedback-stale-git-index-lock, project-setup

전제 검증:
1) docker.exe ps → rhymix-app/rhymix-db/rhymix-ts-db 3개 Up (Exited면 docker.exe start <name>)
2) git log --oneline -1 → fa86b52 이거나 그 이후 SHA, main == origin/main
3) git status --porcelain → 비어있어야 함
4) pnpm --filter web dev 기동 후 curl localhost:3000 → 200 (첫 컴파일 ~2분)

실행: 아래 "다음 작업 후보"에서 하나 선택 후 /moai plan

후속: plan → run → sync
```

## 현재 상태 (2026-08-12)

- **main == origin/main (`fa86b52`), 작업 트리 clean.**
- 완료된 SPEC: `SPEC-FRONT-PARITY-001` **completed** (AC-FP-001~007 7건 전부 PASS)
- 진행 중인 SPEC: 없음

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

### 1. e2e 인프라 수리 (권장 — 다른 모든 e2e 작업의 선행 조건)

`apps/web/e2e/support/db-reset.ts`의 TRUNCATE 목록에 `theme_assignments`가 빠져 있다.
그래서 **한 번 설치된 뒤 재설치를 시도하면 항상 롤백**된다:

```
prisma:error Invalid `tx.themeAssignment.create()` invocation
Unique constraint failed on the fields: (`scope`,`refType`,`refId`)
```

기존 `install-happy-path.spec.ts`도 동일하게 실패한다(오래된 결함). 현재는 매번 수동으로
`DELETE FROM theme_assignments;`를 실행해 우회하고 있다. 스키마가 자란 만큼 목록 전반을
재점검할 것.

### 2. `extraVars.footerText` 루트 배선 (SPEC-FRONT-PARITY-001 잔여 부채)

`GlobalFooter({ footerText })` prop 구조는 갖췄으나, 도메인 레이아웃 레코드의
`extraVars.footerText`를 루트 레이아웃까지 전달하는 배선이 없어 현재는 항상 기본
attribution이 렌더된다. 루트 레이아웃에는 module-instance 컨텍스트가 없어 별도 조회가 필요.

### 3. `NotificationSettingsForm.tsx` JSX 문법 오류 (typecheck 차단)

```
app/admin/settings/notification/NotificationSettingsForm.tsx(55,6): error TS17008: JSX element 'div' has no corresponding closing tag.
app/admin/settings/notification/NotificationSettingsForm.tsx(308,1): error TS1381
app/admin/settings/notification/NotificationSettingsForm.tsx(309,1): error TS1005
```

커밋 `9af1042`(SPEC-CONTENT-PARITY-001 M6)에서 유입된 기존 결함.
`pnpm --filter @rhymix-ts/web typecheck`가 이 3건으로 실패한다.

### 4. 방문자 화면 parity 2단계 (SPEC-FRONT-PARITY-001 Out of Scope 분리분)

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
- e2e 실행: `cd apps/web && npx playwright test front-parity --workers=1`
  (설치 위저드 마지막 버튼은 Playwright click이 안 먹으므로 `form.requestSubmit()` 사용)
- 레거시 재설치: 컨테이너 안에서 `files/config/{config,db.config,ftp.config}.php` 비활성화
  (config.php만 지우면 구버전 마이그레이션 경로를 잘못 타서 Fatal error) + DB drop/create
- `.git/index.lock`이 살아있는 프로세스 없이 자주 남음 → `lsof .git/index.lock` 확인 후
  `rm -f`. 상태줄 훅이 `git status --porcelain`을 자주 폴링해 재발하므로, 커밋은
  `rm -f .git/index.lock && git commit` 을 짧은 루프로 재시도하는 편이 안정적이다.

## 이번 세션의 교훈

서브에이전트가 "테스트 전체 통과 / typecheck 0 errors"로 보고했으나 **재실행 결과 테스트
8건 실패**였다. 보고서의 Evidence 블록 자체가 자기모순(`<main>` 2개를 나열해두고 둘 다
"유지"라 쓴 뒤 "main 정확히 1개" PASS를 주장)이라 정독만으로도 탐지 가능했다.
완료 보고는 **반드시 같은 명령을 직접 재실행**해 확인할 것.
