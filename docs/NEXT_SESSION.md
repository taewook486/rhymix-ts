# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-12 / source_session_id: 289cbc7b-e279-4155-8349-d4ca38426228

## 붙여넣을 메시지

```text
ultrathink. SPEC-FRONT-PARITY-001 run 진입 (M1부터).
applied lessons: feedback-cg-mode-path-corruption, feedback-stale-git-index-lock,
feedback-shared-helper-refactor-grep-mocks, project-setup

전제 검증:
1) docker.exe ps → rhymix-app/rhymix-db/rhymix-ts-db 3개 Up (Exited면 docker.exe start <name>)
2) git log --oneline -1 → cfcb7cf 이거나 그 이후 SHA, main == origin/main
3) git status --porcelain → 비어있어야 함
4) pnpm --filter web dev 기동 후 curl localhost:3000 → 200
   (WSL2+D드라이브는 패키지 변경을 HMR이 못 잡으므로 코드 수정 시 서버 재시작 필요)

실행: /moai run SPEC-FRONT-PARITY-001 (M1: 푸터·main 중복 해소부터)

후속: M2(인덱스를 page 모듈로 전환) → 재설치 검증 → /moai sync
```

## 현재 상태 (2026-08-12)

- **main == origin/main (`cfcb7cf`), 작업 트리 clean.**
- 오늘 완료된 SPEC: `SPEC-ADMIN-MENU-PARITY-001` **completed** (sync까지 마감)
- 진행 대기 SPEC: `SPEC-FRONT-PARITY-001` **draft** — plan-audit 2회(0.72 FAIL → **0.83 PASS**)
  완료, 사용자 구현 승인까지 받았으나 **구현은 미착수**.

## SPEC-FRONT-PARITY-001 재개 요령

- 산출물: `.moai/specs/SPEC-FRONT-PARITY-001/{spec,plan,acceptance,research}.md`
  (progress.md는 아직 없음 — Kickoff 시점에 생성하고, spec.md 본문의 `§F Phase 4 Mode
  Selection`을 **복제가 아니라 이동**할 것. 감사 지적사항)
- 감사 리포트: `.moai/reports/plan-audit/SPEC-FRONT-PARITY-001-review-{1,2}.md`
- **M1 착수 전 필독**: plan.md §1의 라우트별 실측 표. `/board/[id]`는 DefaultLayout을
  타지 않으므로(`app/[mid]/[id]/page.tsx`가 `renderModuleWithLayout` 미호출), 모듈 쪽
  `<main>`(index-page L287, view-page L107·L119)을 낮추고 **루트 `app/layout.tsx:71`은 유지**한다.
  루트를 건드리면 범위 밖 22개 파일에 영향.
- **M2 착수 전 필독**: `seed.test.ts:406`·`:469`가 `indexModuleInstanceId === board`를
  단언한다. REQ-FP-001이 이를 뒤집으므로 **이 2건의 실패는 의도된 변경**이며 page 기준으로
  갱신해야 한다(acceptance.md "의도된 변경 carve-out" 절). 그 외 실패는 회귀.
- 푸터 통합 시 두 완료 SPEC 계약 보호 필수: `Footer.tsx:20`이 `MenuSlotRenderer slot="FOOTER"`
  유일 렌더러(SPEC-MENU-001), `GlobalFooter.tsx`가 SPEC-INSTALL-003 REQ-INSTALL3-040~042 이행.
- 검증은 **DB 재설치 후 실제 렌더**로 한다(mock 단위 테스트는 연결 누락을 못 잡음 — 실측 사례 있음).
  AC 샘플 라우트: `/`, `/board`, `/board/[id]` 3개.

## 오늘 해결된 것 (배경 지식)

설치 시드가 "행은 만들되 연결은 안 하는" 결함 3건을 발견·수정(`30acfeb`, 재설치로 검증 완료):

| 대상 | 증상 | 상태 |
|---|---|---|
| `domains.defaultLayoutId` NULL | 레이아웃 미적용 → 본문 컨테이너 없음 (`[Layout] no layout resolved` 30회) | 수정, 재설치 후 경고 **0회** |
| `menu_slot_assignments` 0행 | 헤더 메뉴 안 나옴 | 수정, Board/Notice/Q&A 렌더 확인 |
| 게시판 `<table>` CSS 전무 | 컬럼 붙어 판독 불가 | 수정 |

추가로 `admin_favorites` 시딩(REQ-AMP-006)도 재설치에서 처음 실제 검증됨(2행 정확).

## 환경 재현

- Node: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"`
- 컨테이너: `rhymix-app`(레거시 PHP :8080), `rhymix-db`(MariaDB :3307),
  `rhymix-ts-db`(Postgres :5444)
- 관리자 계정(양쪽 동일): `admin` / `Admin1234!` / comfit99@gmail.com
- DB 재설치: `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<사용자 동의 문구>" pnpm
  --filter @rhymix-ts/db exec prisma migrate reset --force --skip-generate` → `/install` 4단계
  (설치 마법사 마지막 버튼은 Playwright click이 안 먹으므로 `form.requestSubmit()` 사용)
- 레거시 재설치: 컨테이너 안에서 `files/config/{config,db.config,ftp.config}.php` 비활성화
  (config.php만 지우면 구버전 마이그레이션 경로를 잘못 타서 Fatal error) + DB drop/create
- `.git/index.lock`이 살아있는 프로세스 없이 자주 남음 → `ps aux | grep git` 확인 후 `rm -f`

## 남은 격차 (후속 SPEC 후보)

`SPEC-FRONT-PARITY-001` Out of Scope로 분리된 항목 — 디자인 자산 제작 영역:
히어로 캐러셀(레거시 슬라이드 6개, swiper), 메인 섹션(intro/가이드 6카드/커뮤니티 4카드),
웹폰트(`webfont.css`), 모듈별 스킨 CSS 계층. 그리고 `/admin`·`/install`·`(member)` 라우트의
`<main>` 중첩 전역 정리(22개 파일).
