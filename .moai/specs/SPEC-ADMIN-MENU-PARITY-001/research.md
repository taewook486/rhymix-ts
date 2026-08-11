# SPEC-ADMIN-MENU-PARITY-001 — 레거시 관리자 메뉴 구조 + '즐겨찾기' 기능 전수 분석 (research)

- 조사일: 2026-08-11
- 조사 방법: 양쪽 DB 초기화 → 첫 설치 재실행 → Playwright로 레거시 admin(:8080) 전체 GNB(상단
  내비게이션) 구조를 실측, 소스 코드(PHP 컨트롤러/모델/템플릿/쿼리 XML)와 대조 검증.
- 레거시: Rhymix 2.1.33 (Docker `rhymix-app`, http://localhost:8080/, MariaDB `rhymix-db`)
- 뉴버전: rhymix-ts (http://localhost:3000/, Postgres `rhymix-ts-db`:5444)
- 관리자 계정(양쪽 동일): admin / Admin1234! / comfit99@gmail.com

## 0. 재설치 상태 요약

- 레거시: 컨테이너 `rhymix-app`의 `/var/www/html` 바인드 마운트가 tmpfs로 떠 있던 인프라 버그
  발견 → `docker compose up -d --force-recreate app`로 해결. `files/config/{config,db.config,
  ftp.config}.php` 백업 후 비활성화(구버전 마이그레이션 경로 오작동 방지 위해 db.config.php/
  ftp.config.php도 함께 비활성화 필요 — 단독 config.php 제거만으로는 `ConfigParser::convert()`가
  구버전 XE 설정 마이그레이션 경로를 잘못 타서 Fatal error 발생) + DB drop/recreate → 설치
  마법사 4단계 완료. 기본 메뉴(Welcome/Free Board/Q&A/Notice), 샘플 문서 2건, **즐겨찾기 기본
  항목 2건이 설치 시 자동 시딩됨**("메일, SMS 및 푸시 알림 관리", "알림 센터").
- 뉴버전: `prisma migrate reset`(마이그레이션 32개 적용, 테이블 68개) → `/install` 진행.
  - **발견된 버그 1**: 최신 마이그레이션(`20260810025305_spec_content_parity_001_m7_mail_log`)의
    `ALTER TABLE "documents" ALTER COLUMN "searchVector" DROP DEFAULT;` 문이 실패
    (`searchVector`는 `20260517100000_add_content_foundation_models`에서 이미
    `GENERATED ALWAYS AS (...) STORED` 컬럼으로 정의됨 — Prisma auto-diff가 생성한 의미 없는
    잔여 구문). 마이그레이션 파일에서 해당 줄 제거로 해결.
  - **발견된 버그 2**: `packages/db/src/index.ts`가 M7에서 추가된 `MailLogStatus` enum을
    re-export하지 않아 `packages/auth/src/mail/smtp-dispatcher.ts`의
    `import { MailLogStatus } from '@rhymix-ts/db'`가 빌드 실패(미들웨어 경유,
    `/install` 접근 자체가 막힘). `export { MailLogStatus } from '@prisma/client';` 추가로 해결.
  - 두 버그 모두 기존 DB를 계속 사용했다면 발견되지 않았을 것 — "처음부터 재설치" 검증의 실질적
    가치를 보여주는 사례.

## 1. 레거시 관리자 GNB(상단 내비게이션) 전체 구조 — 6그룹 확정

소스: `modules/admin/models/AdminMenu.php` `DEFAULT_MENU_STRUCTURE` (실제 화면 렌더 결과와
1:1 일치 확인, Playwright로 재검증 완료).

| # | 그룹 키 | 그룹명(사용자 확인) | 하위 항목 (leaf act) |
|---|---------|---------------------|----------------------|
| 0 | `dashboard` | 대시보드 | (하위 없음, 랜딩) |
| 1 | `menu` | **사이트 제작/편집** | 사이트 메뉴 편집(dispMenuAdminSiteMap), 사이트 디자인 설정(dispMenuAdminSiteDesign) |
| 2 | `user` | **회원** | 회원 목록(dispMemberAdminList), 회원 설정(dispMemberAdminConfig), 회원 그룹(dispMemberAdminGroupList), 포인트(dispPointAdminConfig) |
| 3 | `content` | **콘텐츠** | 게시판/페이지/문서/댓글/파일/설문/에디터/스팸필터/휴지통 (SPEC-CONTENT-PARITY-001에서 이미 격차분석 완료) |
| — | *(동적 삽입)* | **즐겨찾기** | *(§2 참고 — configuration 그룹 바로 앞에 삽입됨, `_header.html` L59: `if (strstr($value['menu_name_key'], 'configuration'))`)* |
| 4 | `configuration` | **설정** | 시스템 설정(dispAdminConfigGeneral), 관리자 화면 설정(dispAdminSetup), 파일박스(dispModuleAdminFileBox) |
| 5 | `advanced` | **고급** | 쉬운 설치(dispAutoinstallAdminIndex), 설치된 레이아웃(dispLayoutAdminInstalledList), 설치된 모듈(dispModuleAdminContent), 설치된 애드온(dispAddonAdminIndex), 설치된 위젯(dispWidgetAdminDownloadedList), 다국어(dispModuleAdminLangcode), 데이터 들여오기(dispImporterAdminImportForm), RSS(dispRssAdminIndex) |

사용자가 명시한 순서(사이트 제작/편집, 회원, 콘텐츠, 즐겨찾기, 설정, 고급)와 정확히 일치.

## 2. '즐겨찾기' 기능 상세 분석

### 2.1 데이터 모델 (레거시)

`modules/admin/schemas/admin_favorite.xml`:
```
admin_favorite_srl (PK), site_srl (default 0), module (varchar 80), type (varchar 30, default 'module')
```

쿼리(XML): `getFavoriteList`(site_srl+module 조건), `getFavorite`(favorite_srl+site_srl+module),
`insertFavorite`, `deleteFavorite`, `deleteAllFavorite`, `deleteFavorites`(복수 srl).

### 2.2 백엔드 로직

- `Rhymix\Modules\Admin\Models\Favorite` (`modules/admin/models/Favorite.php`):
  `getFavorites($add_module_info)`, `isFavorite($module)`, `insertFavorite($module, $type='module')`,
  `deleteFavorite($srl)`, `deleteAllFavorites()`, `deleteInvalidFavorites()`(모듈 디렉터리가 더 이상
  존재하지 않는 즐겨찾기를 정리 — 콜드 스타트/삭제된 모듈 대비 self-healing).
- `Rhymix\Modules\Admin\Controllers\AdminMenu::procAdminToggleFavorite()`
  (`modules/admin/controllers/AdminMenu.php` L62-95): `Context::get('module_name')` 기준 토글
  (존재하면 삭제 / 없으면 추가). **module_name 하나만 받음 — href나 label 지정 불가**, 즉 즐겨찾기
  대상은 항상 "모듈의 관리자 인덱스 화면"(`admin_index_act`) 단위이며 임의 URL을 저장할 수 없음.
- `Rhymix\Modules\Admin\Controllers\Base.php` L157-159: 모든 admin 화면 렌더 시
  `FavoriteModel::getFavorites(true)`(add_module_info=true)를 호출해 `favorite_list`를
  Context에 주입 — 이때 `module_info->admin_index_act`와 `title`을 모듈 XML에서 채워넣음
  (저장된 `module`명으로 표시 타이틀을 항상 최신 재조회 — 즐겨찾기 저장 시점의 라벨을 캐시하지
  않음. 모듈명이 바뀌어도 항상 최신 제목 표시).

### 2.3 UI (Playwright 실측)

- 상단 GNB `즐겨찾기` 드롭다운(`_header.html` L57-78): `configuration` 그룹 바로 앞에 삽입되는
  특수 항목. 각 즐겨찾기 행: 링크(제목 → `admin_index_act`) + `×` 삭제 버튼(개별 `<form>` POST,
  `act=procAdminToggleFavorite&module_name=...`).
- **"즐겨찾기 추가" UI가 어디에도 없음** — GNB 하위 메뉴 항목(`회원 목록`, `문서` 등)에도, 개별
  관리 화면 헤더/본문에도 별표·추가 버튼·아이콘이 전혀 없음(라이브 DOM 및 렌더된 HTML 전수
  검색으로 확인, `iconFavorite.gif`는 미사용 정적 자산으로 판단). `procAdminToggleFavorite`
  컨트롤러는 존재하지만 트리거하는 UI가 이 버전에는 없음 — **레거시는 사실상 "제거 전용" UI**이며,
  즐겨찾기 목록은 설치 시 시딩된 기본 2건 외에는 사용자가 추가할 방법이 없음(코드상 API는
  가능하나 UI 미노출).
- 신규 설치 직후 기본 즐겨찾기 2건: "메일, SMS 및 푸시 알림 관리"(`dispAdvanced_mailerAdminConfig`),
  "알림 센터"(`dispNcenterliteAdminConfig`) — 설치 스크립트가 심음(정확한 시딩 코드 위치는
  본 조사에서 미추적, 설치 완료 직후 화면에서 실측 확인만 수행).
- 드롭다운 펼침/접힘 상태는 쿠키(`__xe_admin_gnb_tx_favorite`)로 세션 간 유지.

## 3. 뉴버전(rhymix-ts) 현재 구현 상태

`SPEC-ADMIN-EXTRAS-001`(2026-06-14 completed, 아카이브)에서 이미 구현됨:

- `AdminFavorite` 모델(`packages/db/prisma/schema.prisma` L260): `id, memberId, label, href, icon,
  listOrder, createdAt, updatedAt` — **관리자별(memberId) 스코프**, 레거시의 `site_srl`
  다중 사이트 스코프에 대응하는 필드 없음(다중 사이트 환경 시 격차 후보 — REQ-ADMIN-EXTRAS-033은
  memberId 스코프만 명시, 사이트 스코프 언급 없음).
- `AddToFavoritesButton.tsx`(모든 `/admin/**` 화면에 노출) — **레거시에 없는 개선점**:
  `document.title` + `window.location.pathname`으로 임의 관리자 페이지를 즐겨찾기 추가 가능
  (레거시는 모듈 단위로만 가능). REQ-ADMIN-EXTRAS-034: `href`는 `/admin/`으로 시작해야 함(검증).
- `AdminSidebar.tsx` 즐겨찾기 섹션: 드래그앤드롭 순서 변경 지원(`listOrder`, dnd-kit) —
  **레거시에 없는 기능**(레거시는 삽입 순서 고정, 재정렬 불가).
- 신규 설치 시 기본 즐겨찾기 시딩 여부: `packages/db/src/install/seed.ts` 미검토(본 조사
  범위 — §4에서 확인 예정), 현재 스키마상 `AdminFavorite`는 seed 대상에 없을 가능성 높음
  (레거시처럼 설치 직후 2건이 채워지는지 확인 필요 — REQ 후보).
- 사이드바 그룹 순서(2026-08-11 실측, `AdminSidebar.tsx`): 대시보드 → 콘텐츠 → 사이트 설정 →
  회원 → 시스템. **레거시 순서(사이트 제작/편집 → 회원 → 콘텐츠 → 즐겨찾기 → 설정 → 고급)와
  전혀 다름** — 단순 순서 차이가 아니라 그룹 재분류가 필요:
  - "메뉴 편집"(`/admin/menu`), "디자인"(`/admin/site/design`)은 현재 "사이트 설정"에 있으나
    레거시 기준 **"사이트 제작/편집"**에 속함
  - "위젯 시스템"(`/admin/widgets`)은 현재 "콘텐츠"에 있으나 레거시 기준 **"고급"**(설치된 위젯)에
    속함
  - "알림 설정"(`/admin/settings/notification`)은 레거시 `configuration` 그룹의
    `admin.adminConfigurationGeneral`이 아니라 콘텐츠 그룹 근처(`ncenterliteAdminConfig`)에
    대응 — 정확한 귀속 그룹 재확인 필요
  - 현재 "시스템" 섹션(관리자 로그/시스템 헬스/캐시 관리)은 레거시 6그룹 어디에도 직접 대응하지
    않는 rhymix-ts 고유 추가 — "고급"에 편입하거나 별도 유지 결정 필요(REQ 후보)
  - "내보내기"/"가져오기"(`/admin/settings/{export,import}`)는 레거시 `advanced.importer`
    (데이터 들여오기)에 대응 — 현재 "사이트 설정"이 아니라 **"고급"**에 속해야 함
  - "보안 설정"(`/admin/settings/security`)은 레거시 6그룹에 직접 대응 항목 없음(레거시는 스팸
    필터/캡차 등이 콘텐츠 그룹에 분산) — 현행 유지 또는 "설정" 편입 검토

## 4. 격차 요약 (REQ 후보)

| # | 항목 | 레거시 | 뉴버전 현재 | 판정 |
|---|------|--------|-------------|------|
| G1 | 사이드바 6그룹 순서 | 사이트 제작/편집→회원→콘텐츠→즐겨찾기→설정→고급 | 대시보드→콘텐츠→사이트 설정→회원→시스템 | **격차 — 재배치 필요** |
| G2 | 메뉴 편집/디자인 그룹 귀속 | 사이트 제작/편집 | 사이트 설정 | **격차 — 재분류 필요** |
| G3 | 위젯 시스템 그룹 귀속 | 고급(설치된 위젯) | 콘텐츠 | **격차 — 재분류 필요**(단, SPEC-CONTENT-PARITY-001 M1 결정과 상충 여부 확인 필요) |
| G4 | 내보내기/가져오기 그룹 귀속 | 고급(데이터 들여오기) | 사이트 설정 | **격차 — 재분류 필요** |
| G5 | 시스템 섹션(로그/헬스/캐시) | 대응 그룹 없음(rhymix-ts 고유) | 별도 섹션 | 판단 필요 — 고급 편입 또는 현행 유지 |
| G6 | 즐겨찾기 추가 UI | 없음(제거 전용) | 모든 관리자 화면에 버튼 존재 | **개선점 — 유지(레거시로 퇴행 금지)** |
| G7 | 즐겨찾기 순서 변경 | 없음 | DnD 지원 | **개선점 — 유지** |
| G8 | 즐겨찾기 대상 단위 | 모듈(module_name) | 임의 URL(href) | **개선점 — 유지** |
| G9 | 설치 시 기본 즐겨찾기 시딩 | 2건 자동 시딩 | 확인 필요(seed.ts 미검토) | 조사 필요 → REQ 후보 |
| G10 | 다중 사이트 스코프 | site_srl 컬럼 존재 | memberId만 존재, site 스코프 없음 | 낮은 우선순위(rhymix-ts가 다중 사이트 지원 시나리오에서만 유효 — 현재 단일 사이트 운영 전제와 일관, SPEC-LSP-CORE-002 등 기존 관례 참고) |
| G11 | 무효 즐겨찾기 정리 | `deleteInvalidFavorites()`(모듈 삭제 시) | REQ-ADMIN-EXTRAS-037(404 시 유지, 자동 삭제 안 함 — 설계상 반대 정책) | 정책 차이 — 뉴버전 설계가 의도적 결정(사용자가 판단하게 함), 격차 아님 |

## 5. 다음 단계

- G9(설치 시 기본 즐겨찾기 시딩) 확인을 위해 `packages/db/src/install/seed.ts` 검토
- spec.md에 G1~G5(재배치/재분류), G9(시딩 여부)를 REQ로 작성
- G6~G8, G11은 "현행 유지"로 spec.md HISTORY/Out of Scope에 명시(레거시로의 퇴행 방지 목적)
