# LGP-010 비-UI 영역 사실 조사 (레거시 제공 기능 vs rhymix-ts 현재 상태)

- 작성: moai3 (보조 세션), 읽기 전용 조사
- 성격: 사실과 근거만 모은다. 판정·채택은 사용자 결정이다.
- 레거시 `/mnt/d/project/rhymix` 는 소스 읽기만 했다. 레거시 DB, 화면은 열지 않았다.
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 레거시 DB 변경, 전체 테스트·빌드.

## 요약

| 항목 | 레거시 | rhymix-ts | 한 줄 사실 |
|---|---|---|---|
| (1) DB 지원 범위 | MySQL(PDO mysql DSN) 1종 | PostgreSQL 1종 (Prisma) | 드라이버 종류가 다르다. 레거시 설치기도 `mysql` 문자열 기준이다. |
| (2) 데이터 이전 | XML 기반 6종 입력 (member, ttxml, module, message, sync, index) | JSON 번들 export/import (dry-run 후 적용) | 입력 형식이 서로 호환되지 않는다. 레거시 XML 을 읽는 경로는 없다. |
| (3) 모바일 | `m.layouts/` 디렉터리 + 모듈별 `m.skins/` 6개 | 별도 모바일 스킨 없음, 반응형 클래스만 | 모바일 전용 분기가 없다. 반응형 Tailwind 클래스 사용 파일 14개. |
| (4) 다국어 | 공통 언어 파일 12종 + 모듈별 `lang/` 30개 디렉터리 | 설치 마법사 언어 목록 13종, 메시지 카탈로그 파일 없음 | rhymix-ts 는 설치 마법사 언어 선택만 확인된다. 화면 문구 번역 파일은 발견 안 됐다. |
| (5) 쉬운 설치 (autoinstall) | 있음: 패키지 다운로드·설치·삭제 13개 act | 없음 (grep 0건) | rhymix-ts 에 패키지 설치 기능이 없다. |
| (6) 우편번호 (krzip) | 있음: 우편번호 검색 (외부 우정사업본부 API) + 입력 확장 변수 `kr_zip` | 없음 (grep 0건) | 외부 API 의존이다. rhymix-ts 에는 대응 코드가 없다. |
| (7) 설치 마법사 | 4개 화면 (`dispInstall*`) + 처리 act 5개 | 4단계 + 완료 화면 (`app/install/`) | 단계 수는 같다. 화면 내용 대응은 확인이 더 필요하다. |
| (8) 짧은 주소 | 3단계 rewrite 수준 (`url.rewrite` 0/1/2), 기본 1 | Next.js 동적 라우트 `[mid]`, `[mid]/[id]` | 방식이 다르다. rhymix-ts 는 별도 rewrite 계층이 없다. |

## 상세 근거

### (1) DB 지원 범위

| 구분 | 내용 | 근거 |
|---|---|---|
| 레거시 | DB 연결은 PDO `mysql:` DSN 하나만 조립한다 | `/mnt/d/project/rhymix/common/framework/DB.php` `connect()` (DSN `'mysql:host=' …`, `:122-135` 부근). `pgsql`, `sqlite` 문자열 없음 (framework DB.php 검색 0건) |
| 레거시 | 기본 설정 DB type 은 `mysql` | `common/defaults/config.php:12` (`'type' => 'mysql'`) |
| 레거시 | 설치기는 DB type 을 `db_type` 으로 받고 `stripos(…,'mysql')` 로 분기한다 | `modules/install/install.controller.php:33,43,61` |
| 레거시 | sqlite 는 캐시 드라이버에만 있다 | `common/framework/drivers/cache/sqlite.php`. 설치 언어 문자열 `modules/install/lang/ko.php:85` 에 "Sqlite는 파일에 데이터를 저장합니다" 문구가 남아 있다. 설치 폼에서 sqlite 를 고르는 UI 는 tpl 검색에서 찾지 못했다 |
| rhymix-ts | Prisma datasource provider 는 `postgresql` | `packages/db/prisma/schema.prisma:17-18` (`provider = "postgresql"`, `url = env("DATABASE_URL")`). generator 는 `prisma-client-js` (`:12`) |
| rhymix-ts | 모델 수 67개 | `grep -c "^model "` 결과 67 |

사실: 레거시는 MySQL 계열 단일 드라이버, rhymix-ts 는 PostgreSQL 단일 드라이버다. 레거시 DB 를 직접 옮기려면 엔진 차이 (스키마·타입·쿼리)가 걸린다.

### (2) 데이터 이전

| 구분 | 내용 | 근거 |
|---|---|---|
| 레거시 | 관리자 가져오기 화면은 `source_type` 으로 6종을 고른다: `member`, `ttxml`, `module`, `message`, `sync`, `index` | `modules/importer/importer.admin.view.php:30-57` (case 목록) |
| 레거시 | 파싱은 XML 전용이다: 대용량 XML 을 쪼개 캐시하는 `extract.class.php`, XE 형식 tt XML 처리 `ttimport.class.php` (`importModule`, category.xml 처리) | `modules/importer/extract.class.php:97,120,193`, `ttimport.class.php:28,37,40` |
| 레거시 | 가져오기 대상 파일은 `xml_file` / `filename` 로 받는다 | `modules/importer/importer.admin.controller.php` (`Context::get('xml_file')` `:151`) |
| rhymix-ts | 가져오기 입력은 JSON 파일만 받는다 (`accept=".json"`) | `apps/web/app/admin/settings/import/ImportForm.tsx:210-211` |
| rhymix-ts | tRPC: `dryRun` (`import.ts:44`), `applyImport` (`:68`), 충돌 정책 `overwrite \| skipConflict \| abort` (`:37`) | `apps/web/server/api/routers/admin/import.ts` |
| rhymix-ts | 번들 검증은 `adminExportBundleSchema` 로 한다 | `packages/admin/src/import/deserializer.ts:114` |
| rhymix-ts | 내보내기는 JSON 번들을 만들고 `rhymix-export-<siteId>-<timestamp>.json` 으로 내려받는다 | `apps/web/app/admin/settings/export/ExportForm.tsx:47,53`, tRPC `apps/web/server/api/routers/admin/export.ts:22`, 직렬화 `packages/admin/src/export/serializer.ts` (`menu.findMany` `:108`, `moduleInstance.findMany` `:181`) |

사실: 레거시는 XML 6종을 읽고 rhymix-ts 는 자기 JSON 번들만 읽는다. 레거시 데이터를 넣는 경로는 현재 없다. 엔티티 커버리지 전체는 `serializer.ts` 의 `findMany` 호출을 전수 대조하지 않아 미확인이다.

### (3) 모바일 레이아웃·스킨

| 구분 | 내용 | 근거 |
|---|---|---|
| 레거시 | 전역 모바일 레이아웃 디렉터리 `m.layouts/` 존재 | `/mnt/d/project/rhymix/m.layouts` (디렉터리 확인) |
| 레거시 | 모듈별 모바일 스킨 `m.skins/` 는 6개 모듈에 있다: board, communication, member, message, ncenterlite, page | `find modules -maxdepth 2 -type d -name m.skins` 결과 6건 |
| 레거시 | 모듈 설정에 mskin, mlayout_srl 필드가 있다 (예: ncenterlite skinsetting 폼 `mlayout_srl`, `mskin`, `mcolorset`) | `pages/dispNcenterliteAdminSkinsetting-*.json` 폼 필드 (LGP-007 조사 근거) |
| rhymix-ts | 별도 모바일 스킨·레이아웃 체계 없음 | 모바일 전용 분기 검색 (`useMediaQuery|isMobile|matchMedia|m.layouts`) 결과는 `PageEditForm.tsx`, `AdvancedSettingsForm.tsx`, `ColorSchemeProvider.tsx`, `bot-detector.ts` 등 무관한 매치 위주. 모바일 전용 컴포넌트 발견 안 됨 |
| rhymix-ts | 반응형 Tailwind 브레이크포인트 사용 파일 14개 | `grep -rl -E "\b(md|lg|sm):" apps/web/app apps/web/components` 결과 14 |

사실: 레거시는 모듈마다 모바일 스킨을 따로 두는 구조다. rhymix-ts 는 한 벌의 반응형 레이아웃이다.

### (4) 다국어

| 구분 | 내용 | 근거 |
|---|---|---|
| 레거시 | 공통 언어 파일 12종 | `common/lang/`: de, en, es, fr, ja, ko, mn, ru, tr, vi, zh-CN, zh-TW (`ls`) |
| 레거시 | 모듈별 `lang/` 디렉터리 30개 | `ls -d modules/*/lang` 결과 30 |
| rhymix-ts | 지원 언어 목록 13종 (설치 마법사용으로 명시) | `packages/core/src/i18n/languages.ts` `SUPPORTED_LANGUAGES`: ko, en, ja, zh-CN, zh-TW, de, es, fr, mn, ru, tr, vi, id. 주석은 "Supported wizard languages (SPEC-INSTALL-001 i18n)" |
| rhymix-ts | 화면 문구 번역 카탈로그 파일 없음 | `find` 로 `*ko*.json`, `*en*.json`, `*.po`, `messages*` 검색 시 해당 파일 0건 (`(member)/messages` 디렉터리 이름만 매치) |

사실: 언어 목록이 두 쪽에서 다르다 (rhymix-ts 에 `id` 추가, 레거시에 `id` 없음). rhymix-ts 는 설치 마법사에만 언어 선택이 있는 것으로 보이며, 화면 문구 번역 방식은 이번 조사에서 확인되지 않았다.

### (5) 쉬운 설치 (autoinstall)

| 구분 | 내용 | 근거 |
|---|---|---|
| 레거시 | autoinstall 모듈: 관리자 설치 목록, 패키지 상세, 다운로드, 설치, 설치 후 처리, 삭제, 무시, 목록 갱신 등 act 13개 | `modules/autoinstall/conf/module.xml` (`dispAutoinstallAdminIndex`, `dispAutoinstallAdminPackageDetail`, `procAutoinstallAdminDownloadPackage`, `…InstallPackage`, `…PostInstallPackage`, `…UninstallPackage`, `…IgnorePackage`, `…UpdatePackageList`, `getAutoinstall*` 목록 3종 등) |
| 레거시 | 컨트롤러 구현 위치 | `modules/autoinstall/autoinstall.admin.controller.php:10,33,71,124,167,203`, 뷰 `autoinstall.admin.view.php:44,75` |
| rhymix-ts | 대응 코드 없음 | `grep -rln -i autoinstall apps/web packages` 결과 0건 |

### (6) 우편번호 (krzip)

| 구분 | 내용 | 근거 |
|---|---|---|
| 레거시 | 우편번호 검색 모듈: 검색 폼 `dispKrzipSearchForm`, 코드 목록 모델 `getKrzipCodeList`, 관리 설정 `dispKrzipAdminConfig`, 설정 저장 `procKrzipAdminInsertConfig` | `modules/krzip/conf/module.xml:5-9` |
| 레거시 | 조회는 외부 우정사업본부 API 를 호출한다. 호스트는 `http://biz.epost.go.kr/KpostPortal/openapi2`, 인증키는 모듈 설정 `epostapi_regkey` | `modules/krzip/krzip.class.php:25`, `modules/krzip/krzip.model.php:150,159` (`getEpostapiSearch`, 쿼리 `:123`) |
| 레거시 | 입력 확장 변수 `kr_zip` 폼 타입 | `modules/extravar/skins/default/form_types/kr_zip.blade.php` |
| rhymix-ts | 대응 코드 없음 | 검색 `우편|zipcode|postal|postcode|kr_zip|krzip` 결과 0건 (`apps`, `packages`) |

### (7) 설치 마법사

| 구분 | 내용 | 근거 |
|---|---|---|
| 레거시 | 표시 act 4개: `dispInstallIndex`, `dispInstallCheckEnv`, `dispInstallDBConfig`, `dispInstallOtherConfig` | `modules/install/conf/module.xml:5-8` |
| 레거시 | 처리 act 5개: `procInstallLicenseAgreement`, `procDBConfig`, `procInstall`, `procInstallAdminInstall`, `procInstallAdminUpdate` | 같은 파일 |
| 레거시 | DB 설정 처리 | `modules/install/install.controller.php:33` (`db_type`, `db_host`, `db_port`, `db_user`, `db_pass`, `db_database`, `db_prefix`) |
| rhymix-ts | 1단계 라이선스 동의 | `apps/web/app/install/page.tsx` (파일 상단 주석 "Step 1: 라이선스 동의 — REQ-INSTALL-011", 세션 플래그 후 리다이렉트) |
| rhymix-ts | 2단계 환경 자가진단 | `apps/web/app/install/check-env/page.tsx:95` (h1 "설치 2단계 — 환경 자가진단") |
| rhymix-ts | 3단계 데이터베이스 설정 | `apps/web/app/install/db-config/page.tsx:20` (h1 "설치 3단계 — 데이터베이스 설정") |
| rhymix-ts | 4단계 관리자 계정 | `apps/web/app/install/admin-config/page.tsx:34` (h1 "설치 4단계 — 관리자 계정") |
| rhymix-ts | 완료 화면 | `apps/web/app/install/complete/page.tsx` |
| rhymix-ts | 처리 함수 | `apps/web/app/install/actions.ts` |

사실: 단계 수는 같다 (레거시 4 표시 act ↔ rhymix-ts 4단계 + 완료). 대응 관계는 레거시 `dispInstallOtherConfig` 가 rhymix-ts 4단계(관리자 계정)와 같은 범위인지 확인이 필요하다. 레거시 `dispInstallOtherConfig` 의 화면 내용은 이번 조사에서 읽지 않았다.

### (8) 짧은 주소 (rewrite)

| 구분 | 내용 | 근거 |
|---|---|---|
| 레거시 | 기본 rewrite 수준 1 | `common/defaults/config.php:58` (`'url' => … 'rewrite' => 1`), 레거시 키 `use_rewrite` `:154` |
| 레거시 | rewrite 수준 의미: 1 = XE 호환 규칙만, 2 = 완전 rewrite | `common/framework/Router.php:94-107` (수준 조회), `:97-98` (주석) |
| 레거시 | 수준 2 에서만 `모듈 없는 짧은 경로` 를 파싱 (`^([a-zA-Z0-9_-]+)(?:/(.*))?$`) | `common/framework/Router.php:148`, 분기 `:248` |
| 레거시 | 루트에 `.htaccess` 존재 (웹서버 rewrite 규칙) | `/mnt/d/project/rhymix/.htaccess` (`ls -a` 확인) |
| 레거시 | rewrite 테스트 act `dispAdminRewriteTest` | `common/framework/Router.php:61-64` |
| rhymix-ts | 짧은 주소는 Next.js 동적 라우트로 처리 | `apps/web/app/[mid]/page.tsx`, `apps/web/app/[mid]/[id]/page.tsx` (`app/[mid]/` 하위 `atom`, `rss`, `write`, `[id]`) |
| rhymix-ts | 별도 rewrite 계층 없음 (next.config 에 `rewrites`, `redirects` 항목 없음) | `grep -n -i -E "rewrites|redirects" apps/web/next.config.*` 결과 0건 |
| rhymix-ts | rewrite 진단용 엔드포인트 | `apps/web/proxy.ts:5,48,72` (`/api/install/rewrite-test/*`, REQ-INSTALL-012, 진단 echo) |
| rhymix-ts | 설치 진단에 rewrite 관련 키워드 존재 (세부 미확인) | `packages/core/src/install/diagnostics.ts` (검색 매치) |

사실: 레거시는 웹서버 `.htaccess` 와 프레임워크 수준 1·2 로 짧은 주소를 만든다. rhymix-ts 는 라우트 구조 자체가 `/{mid}/{id}` 형태라 짧은 주소를 별도 계층 없이 낸다. 레거시 `/{모듈 없는 경로}` 형태와 같은 URL 을 쓰는지 미확인.

## 미검증 (Gaps)

- (1) 레거시 DB 설치 화면에서 sqlite 선택 UI 존재 여부 (tpl 검색에서 찾지 못함, 완전 부재 단정은 보류).
- (2) `serializer.ts` 가 직렬화하는 엔티티 목록 전수 대조. 레거시 XML 6종의 각 데이터 범위 대조.
- (3) rhymix-ts 반응형 레이아웃의 실제 모바일 렌더 확인 (브라우저 미실행).
- (4) rhymix-ts 화면 문구 다국어 방식 (별도 i18n 라이브러리 존재 여부는 이번 조사에서 확인하지 않음).
- (5) 레거시 autoinstall 이 외부 저장소에 접속하는 대상과 방식의 세부.
- (6) rhymix-ts 에 주소 검색 대체 수단 (우편번호 없이 입력하는 방식)의 존재 여부.
- (7) 레거시 `dispInstallOtherConfig` 화면 내용과 rhymix-ts 4단계의 범위 대응.
- (8) 레거시 수준 2 짧은 경로와 rhymix-ts `/{mid}` 형태의 URL 호환 여부.

## 잔여 위험 (Residual-risk)

- 이 문서는 사실 모음이다. 각 항목을 "필요한가, 제외할 것인가"로 판정하는 것은 사용자 몫이다.
- 레거시 소스 읽기 기준이다. 레거시 설치본의 실제 동작(설정 파일, 플러그인 구성)은 반영하지 않았다.
- rhymix-ts 쪽은 정적 검색 기준이다. 런타임 동작은 확인하지 않았다.
