# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-13 밤 (관리자 레거시 parity 시리즈 착수 — 기준선 재구축 + 크롤 + 우산 SPEC)
> source_session_id: 5313b428-0cd6-496f-88a7-b3528c5435a7

## 붙여넣을 메시지

```text
ultrathink. SPEC-LEGACY-PARITY 시리즈 이어서 진행.
applied lessons: feedback-verify-typecheck-claims-broadly,
feedback-stale-git-index-lock, feedback-mocks-and-casts-hide-real-shape

전제 검증:
1) docker.exe ps → rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444) 3개 Up
2) git log --oneline -1 → b9fe856 이후 SHA, main == origin/main, 작업트리 clean
3) curl -s -o /dev/null -w "%{http_code}" localhost:8080/ → 200 (레거시 재설치 완료 상태)
4) .moai/reports/legacy-admin-map/index.json 존재 → 크롤 결과 있음

실행: 아래 "다음 작업" 1번(재크롤)부터. 그 다음 SPEC-LEGACY-PARITY-001 작성.

후속: 001 → 002 → 003 → 004 → 005 → 006 순서로 영역별 SPEC + 구현
```

## 오늘 한 일 (2026-08-13)

커밋 4건, main == origin/main, 작업트리 clean.

```
(이번 커밋) fix(e2e): 크롤러 공통 껍데기 링크 그룹 오귀속 수정 — 미실행
b9fe856 docs(spec): SPEC-LEGACY-PARITY-000 시리즈 공통 규약 + INDEX 등록
8476774 docs(report): 레거시 관리자 화면 지도 164개 + 이벤트 대응표
3a9411c feat(e2e): 레거시 관리자 화면 분석 도구 + 양 버전 재설치 스크립트
```

### 1. 양쪽 DB 초기화 + 첫 setup 재실행 (완료)

백업 → 초기화 → 재설치를 양쪽에 수행했다. **두 사이트의 관리자 계정·사이트명이 동일**하므로
이제 화면 차이는 설정 차이가 아니라 구현 차이다.

| | 레거시 | 뉴버전 |
|---|---|---|
| 백업 | `/mnt/d/project/_db-backups/20260813-2004/legacy-rhymix.sql` (145KB/94표) | 같은 폴더 `rhymix_ts.sql` (175KB/68표) |
| 초기화 | DROP/CREATE + `config.php`·`db.config.php`·`ftp.config.php` 를 `.reset-20260813` 로 이동 | `prisma migrate reset --force` |
| 재설치 | `install-legacy.ts` | `install-new.ts` |
| 관리자 | `admin` / `admin@example.com` / `Rhymix!2026` | 동일 |

**막혔던 것 2가지 (다음에도 똑같이 막힌다)**
- `.claude/settings.json:429-438` deny 목록이 `DROP DATABASE` 를 차단한다. 우회하지 말고
  사용자에게 `!` 접두 실행을 요청할 것. `rm -rf /경로` 도 같은 목록에 걸린다.
- Prisma 는 Claude Code 실행을 감지하면 `migrate reset` 을 거부한다. 사용자 동의 문구를
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` 환경변수에 그대로 넣어야 통과한다.

**레거시 재설치의 함정**: `config.php` 만 치우면 `ConfigParser::convert()` 가 XE 호환 경로로
들어가 `db.config.php`(주석만 든 껍데기)를 읽다 죽는다(`ConfigParser.php:22-31`).
`db.config.php` 도 같이 치워야 설치 마법사가 뜬다.

### 2. 레거시 관리자 화면 크롤 (완료, 단 결함 있음 — 아래 3번)

`.moai/reports/legacy-admin-map/` — 화면 164개, 이벤트 2,386건, 커밋됨.

- GNB 가 그룹별 `<li>` + 중첩 `<ul>` 구조(`modules/admin/tpl/_header.html:53-69`)라
  화면의 그룹 귀속을 추론 없이 확정할 수 있었다. 즐겨찾기도 GNB 안의 `<li>` 다.
- 이벤트 2,386건 = 폼 제출 버튼 1,585(대상은 폼의 `module`/`act`, 수집됨) + onclick 801.
  onclick 은 21종 함수를 부르며 그중 10종의 서버 호출을 `events.md` 에 확정했다.
  나머지 10종은 DOM 만 조작하는 UI 전용임을 소스로 확인(`deleteImage`, `doDeleteAdmin` 등).
- 호출 헬퍼는 레거시 실측 기준 4종: `exec_json`(103) / `exec_xml`(67) / `Rhymix.ajax`(10) /
  `doCallModuleAction`(2). 처음에 `Rhymix.ajax` 를 빠뜨려 `doCancelDeclare` 를 놓쳤었다.
- 레거시 DB 무손상 확인: 크롤러 클릭 호출 0건, 변경성 act 방문 0건, 크롤 후 테이블 94개 유지.

### 3. ⚠️ 발견한 결함 — 크롤 결과의 그룹 귀속이 틀렸다 (수정했으나 **미실행**)

`사이트 제작/편집` 6개 화면 중 실제로 그 그룹인 것은 2개뿐이었다.

| 화면 | 정체 |
|---|---|
| `dispMenuAdminSiteMap`, `dispMenuAdminSiteDesign` | ✅ 이 그룹 맞음 |
| `(act 없음)` Dashboard | ❌ 대시보드 |
| `dispMemberAdminInfo` | ❌ 헤더의 "내 계정" 링크 |
| `dispAdminCleanupList`, `dispAdminViewServerEnv` | ❌ 푸터의 "시스템 설정" 링크 |

헤더·푸터 공통 링크가 GNB 하위 메뉴에 없어서 **가장 먼저 순회한 그룹이 채간다.**
`crawl-admin.ts` 에 `detectChrome()`(모든 그룹 랜딩에 공통으로 등장하는 링크를 껍데기로
판정 → 그룹 귀속 제외 → 마지막에 `공통(헤더/푸터)` 그룹으로 따로 수집)을 추가했다.

**타입 검사만 통과했고 아직 실행하지 않았다.** 다음 세션 첫 작업이 재크롤이다.

### 4. SPEC-LEGACY-PARITY-000 (우산 SPEC, draft)

6개 영역 SPEC 이 공유할 규약. 제품 코드 변경 없음. REQ 8개 / AC 8개.
검증 가능한 AC 4건(004, 008a/b/c)은 실행해 통과 확인함.

**핵심 발견**: "메뉴 순서를 레거시와 동일하게" 는 **이미 충족돼 있다.**
`AdminSidebar.tsx:88-142` 가 이미 `사이트 제작/편집 → 회원 → 콘텐츠 → (즐겨찾기 조건부) →
설정 → 고급` 순서다(`SPEC-ADMIN-MENU-PARITY-001` 결과, completed). 그래서 새로 만들 일감이
아니라 **깨뜨리면 안 되는 불변식**으로 규정했다(REQ-LGP-004).

`INDEX.md` 가 2026-07-18 이후 갱신이 멈춰 Phase 11~14 SPEC 4개가 미등록 상태였다 — 함께 반영.

## 다음 작업

1. **재크롤** (첫 작업, 필수)
   ```bash
   cd /mnt/d/project/rhymix-ts/apps/web
   rm -rf ../../.moai/reports/legacy-admin-map
   LEGACY_ADMIN_ID=admin LEGACY_ADMIN_PW='Rhymix!2026' LEGACY_CRAWL_MAX_PAGES=400 \
     pnpm dlx tsx e2e/legacy-crawl/crawl-admin.ts
   pnpm dlx tsx /mnt/d/project/rhymix-ts/apps/web/e2e/legacy-crawl/resolve-events.ts
   ```
   확인 기준: `사이트 제작/편집` 그룹에서 `dispMemberAdminInfo`·`dispAdminCleanupList`·
   `dispAdminViewServerEnv`·Dashboard 가 빠지고 `공통(헤더/푸터)` 그룹이 새로 생겨야 한다.
   약 20분 소요. (`tsx` 는 설치돼 있지 않아 `pnpm dlx` 로 받아 쓴다 — 루트 `seed:default-theme`
   스크립트가 `tsx` 를 참조하지만 실제로는 미설치인 별개 결함이 있다.)

2. **SPEC-LEGACY-PARITY-001 (사이트 제작/편집) 작성**
   - 규약 REQ-LGP-003 대로 그룹 화면 전건을 대응있음/격차/의도적제외로 판정한 표를
     `research.md` 에 먼저 만들 것.
   - 뉴버전 대응 라우트: `/admin/menu`(메뉴 편집), `/admin/site/design`(디자인).
   - 흡수 대상: `SPEC-MENU-001` Slice D 잔여분 — Footer/Utility 슬롯 배정, groupIds ACL 렌더,
     중첩 트리(관리자 로그인이 필요해 미검증으로 남아 있음).

3. 이후 002 회원 → 003 콘텐츠(CONTENT-PARITY-001 흡수, Tier L 최대) → 004 즐겨찾기 →
   005 설정 → 006 고급.

## 환경 메모

- 레거시 DB 접속(컨테이너 내부 기준): host `db`, port 3306, `rhymix`/`rhymixpass`, prefix `rx_`
- 뉴버전 DB: `127.0.0.1:5444`, `rhymix`/`rhymix`, DB `rhymix_ts`
- 뉴버전 `users` 테이블 컬럼은 camelCase 인용 필요: `SELECT "userId", "emailAddress" FROM users;`
- dev 서버 첫 컴파일 약 204초
