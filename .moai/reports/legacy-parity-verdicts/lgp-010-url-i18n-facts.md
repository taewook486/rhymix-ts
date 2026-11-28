# LGP-010 사전 조사: 옛 URL 호환 + 화면 문구 다국어 (사실만, 설계 전 단계)

- 작성: moai3 (보조 세션), 읽기 전용 조사
- 배경: 사용자 결정으로 SPEC-LEGACY-PARITY-010 범위에 옛 URL 호환과 화면 문구 다국어가 들어갔다. 이 문서는 설계 전에 필요한 사실만 모은다. 설계·판정은 하지 않는다.
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 레거시 DB 변경, 전체 테스트·빌드. 레거시는 소스 읽기만 했다.

---

## 작업 1 — 옛 URL 형태 목록

### 1-A. 레거시 URL 생성·해석 규칙의 출처

| 구분 | 근거 (파일:줄) | 내용 |
|---|---|---|
| 규칙 표 (XE 호환 전역 라우트) | `/mnt/d/project/rhymix/common/framework/Router.php:14-66` | `$document_srl`(:14), `$act`(:19), `$mid`(:24), `$mid/$document_srl`(:29, priority 30), `$mid/category/$category`(:34, priority 10), `$mid/entry/$entry`(:39), `$mid/$act`(:44, rss·atom·api 만), `files/download/link/…`(:49), `files/download/…`(:55), `common/rewrite/test/…`(:61) |
| 수준 결정 | `Router.php:94-107` | `url.rewrite` 값을 읽고, 없으면 `use_rewrite` 가 참이면 1, 아니면 0 |
| 수준 의미 주석 | `Router.php:97-98` | `1 = XE-compatible rewrite rules only`, `2 = Full rewrite support` (수준 0 = 쿼리 문자열만) |
| 기본값 | `common/defaults/config.php:58` (`'url' => … 'rewrite' => 1`), `:154` (`'use_rewrite' => true`) | 기본 수준 1 |
| URL 생성 | `Router.php:308-` `getURL(array $args, int $rewrite_level)` | 수준 0: `index.php?` + 쿼리 (`:311-313`). 인자 1개가 `mid` 또는 `document_srl` 이면 값만 (`:327-329`, 수준 ≥1). 수준 ≥2: 모듈 라우트 (`:344-`), 전역 라우트 역방향 (`:411-`), 일반 `$mid/$act` 패턴 (`:402-405`) |
| 해석 | `Router.php:120-` `parseURL()` | 수준 ≥2 에서 접두사 `mid` 또는 `module` 판정 (`:148-`), 전역 라우트 (`:248-`), XE 호환 전역 라우트 (`:267-`) |
| 웹서버 규칙 | `/mnt/d/project/rhymix/.htaccess` | 파일 직접 접근 차단 규칙(:4-8), 나머지는 `index.php` 로 넘김 (`:17-19`: `!-f`, `!-d` 조건 후 `RewriteRule . index.php [L]`) |
| 실제 운영 수준 | 확인 불가 | 설정 파일 실값은 이 저장소에 없다. 아래 1-C 의 링크 관측으로 추정만 가능 |

### 1-B. 레거시 URL 형태 목록 (규칙 표 기준 + 관측)

예시 값은 레거시 링크 관측 (`legacy-front-map/pages/*.json` 의 `links[].href`) 또는 규칙 표에서 만든 형태다. "관측" 열은 실제로 링크에 나타난 횟수다.

| 레거시 형태 | rewrite 수준 | 예시 | 관측 (`links[].href`) | rhymix-ts 대응 주소 (파일:줄) |
|---|---|---|---|---|
| `/` | 모든 수준 | `http://localhost:8080/` | 159건 | `apps/web/app/page.tsx` (메인) |
| `/{document_srl}` (전역 라우트) | ≥0 (XE 호환 규칙) | `/114` | 0건 (관측 없음) | 대응 없음. `app/` 에 mid 없는 문서 단독 라우트 없음 |
| `/{mid}` | ≥1 (단일 인자 mid) | `/board` | 131건 (`board`), `index`·`qna`·`notice`·`terms`·`privacy` 각 125건 | `apps/web/app/[mid]/page.tsx:80` (`MidPage`) |
| `/{mid}/{document_srl}` | ≥2 (라우트 `$mid/$document_srl`) | `/board/114` | 35건 (`board/114`, 프래그먼트·쿼리 변형 포함) | `apps/web/app/[mid]/[id]/page.tsx:136-138` (`ViewPage`, `id` 정수 검사 `:141-142`) |
| `/{mid}/category/{category}` | ≥2 (priority 10) | `/board/category/12` | 0건 | 대응 없음. `app/[mid]/page.tsx` 에서 category 처리 흔적 grep 0건 |
| `/{mid}/entry/{entry}` | ≥2 | `/board/entry/abc` | 0건 | 대응 없음 |
| `/{mid}/rss`, `/{mid}/atom` | ≥2 (`$mid/$act` 중 rss·atom) | `/board/rss` | 0건 | `apps/web/app/[mid]/rss/route.ts:27` (`GET`), `apps/web/app/[mid]/atom/route.ts:27` (`GET`) |
| `/{mid}/api` | ≥2 (`$mid/$act` 중 api) | `/board/api` | 0건 | 대응 없음. `app/[mid]/` 하위 `api` 없음 |
| `/rss`, `/atom` (mid 없는 전역) | ≥2 (`$act` 규칙) | `/rss` | 0건 | 대응 없음. rhymix-ts 피드는 게시판별만 있음 |
| `/{mid}/{act}` (일반 패턴, act 가 라우트 없을 때) | ≥2 (`getURL` 일반 분기, `Router.php:402-405`) | `/board/dispBoardWrite` | 0건 | 대응 없음 (아래 1-B-2 참고) |
| `/{mid}?page=N` | 모든 수준 (쿼리 유지) | `board?page=1` | 10건 (`board?page=1`) | `apps/web/app/[mid]/page.tsx:26,82,104` (`searchParams` 를 전달). `page` 해석 방식은 미확인 |
| `/{mid}/{document_srl}?sort_index=…&order_type=…` | ≥2 + 쿼리 | `board/114?sort_index=readed_count&order_type=desc` | 1건 | `app/[mid]/page.tsx` 의 `searchParams` 처리 세부 미확인 |
| `index.php?mid=…&act=…&document_srl=…` | 0 (쿼리 문자열) | `index.php?mid=board&act=dispBoardContentView&document_srl=114` | 10건 (`dispBoardContentView`) | 대응 없음. rhymix-ts 는 `index.php` 를 해석하지 않음 |
| `index.php?act=dispMemberLoginForm&mid=index` | 0 | (회원 act 전반) | 82건 (`dispMemberLoginForm`) | `apps/web/app/(auth)/login/page.tsx` (`/login`) |
| `index.php?act=dispMemberSignUpForm` | 0 | | 99건 | `apps/web/app/(auth)/signup/page.tsx` (`/signup`) |
| `index.php?act=dispMemberFindAccount` | 0 | | 58건 | `apps/web/app/(auth)/password-reset/page.tsx` (`/password-reset`) — 아이디 찾기 없음 (LGP-008) |
| `index.php?act=dispMemberResendAuthMail` | 0 | | 5건 | 대응 없음 (LGP-008) |
| `index.php?act=dispMemberLogout` | 0 | | 23건 | `apps/web/app/auth/signout/route.ts` (POST) |
| `index.php?act=dispMemberInfo` 및 회원 본인 act (ModifyInfo, ModifyPassword, Leave, ActiveLogins, AuthLog, OwnDocument, OwnComment, Scrapped, Saved) | 0 | | 각 다수 | 대응 없음 (LGP-008) |
| `index.php?module=admin&act=…` | 0 | `index.php?module=admin&act=dispAdminConfigGeneral` | 72건 | 관리자 경로 `apps/web/app/admin/` 로 대응 (act 이름 매핑은 LGP 판정표 참고) |
| `files/download/link/{file_srl}/{sid}/{filename}` (`procFileDownload`) | ≥0 | `/files/download/link/5/ab12/x.pdf` | 0건 | `apps/web/app/api/files/[id]/download/route.ts:10-14` (`id` 단일 파라미터). 형태 다름 |
| `files/download/{file_srl}/{file_key}/{filename}` (`procFileOutput`) | ≥0 | `/files/download/5/key/x.pdf` | 0건 | `apps/web/app/api/files/by-key/[key]/download/route.ts:10-14` (`key` 단일). 형태 다름 |
| `common/rewrite/test/{n}` | ≥0 | `/common/rewrite/test/1` | 0건 | `apps/web/app/api/install/rewrite-test/*` (`apps/web/proxy.ts:5,48,72`, REQ-INSTALL-012). 진단용, 형태 다름 |
| 태그 목록 | 쿼리 | `index.php?mid=board&act=dispBoardTagList` | 14건 | `apps/web/app/tags/page.tsx:16` (`TagsPage`) — 레거시 act 와 경로 다름 |
| 태그 상세 | 미관측 | 레거시 태그 검색 링크 형태 미관측 | 0건 | `apps/web/app/tag/[tagName]/page.tsx:22` (`TagPage`, `params.tagName`) |
| 검색 | 미관측 | 레거시 검색 링크 형태 미관측 | 0건 | `apps/web/app/search/page.tsx:42` (`SearchPage`, `searchParams.q` `:20`) |
| 글쓰기 | 쿼리 | `index.php?mid=board&act=dispBoardWrite` | 4건 | `apps/web/app/[mid]/write/page.tsx:23` (`WritePage`) |
| 글 수정 | 쿼리 | `index.php?mid=board&act=dispBoardWrite&document_srl=114` | 11건 | `apps/web/app/[mid]/[id]/edit/page.tsx:25` (`EditPage`) |

### 1-B-2. 레거시 URL 생성 규칙이 만드는 실제 형태 (`getURL` 분기 기준)

| 조건 | 생성 형태 | 근거 |
|---|---|---|
| 수준 0 | `index.php?<쿼리>` | `Router.php:311-313` |
| 수준 1, 인자가 `mid` 또는 `document_srl` 하나 | 값 그대로 (`/board`, `/114`) | `Router.php:327-329` |
| 수준 2, 모듈 라우트 존재 (`$mid/…`) | `<mid>/<route 결과>` (예: `board/114`) | `Router.php:344-365` 부근 (`_getBestMatchingRoute`) |
| 수준 2, 라우트 없음, `act` 있음 (일반 분기) | `<mid>/<act>` + 남은 인자 쿼리 (예: `board/dispBoardWrite?…`) | `Router.php:402-405` (`'$' . $prefix_type . '/$act'`) |
| 수준 2, 전역 라우트 역방향 | `<route 결과>` (mid 없음) | `Router.php:411-` |

사실: 수준 1 에서 `board/114` 는 만들 수 없다 (두 인자이기 때문). 관측된 `board/114` 는 수준 2 이상의 생성 결과다. 다만 관측 링크가 `index.php?` 형태와 섞여 있어, 실제 운영 수준은 혼합이거나 콘텐츠 본문 링크 생성 경로가 다를 수 있다. **운영 수준은 미확정**이다.

### 1-C. 관측 근거 보강

| 항목 | 명령 | 출력 요지 |
|---|---|---|
| 링크 형태 집계 | `python3` 으로 `legacy-front-map/pages/*.json` 의 `links[].href` 를 `http://localhost:8080/` 기준으로 정규화해 집계 | 최다 형태 `index.php?module=admin&act=dispMenuAdminSiteMap`(144), `board`(131), `index`(125), `qna`(125), `notice`(125), `terms`(125), `privacy`(125), `board/N`(35), `index.php?mid=index&act=dispMemberSignUpForm`(99), `board?page=1`(관측), `board/114?sort_index=readed_count&order_type=desc`(1) |
| 짧은 형태 검색 | 같은 방식으로 `^board/\d+`, `category`, `tag`, `files/`, `entry`, `rss\|atom`, `/page/` 패턴 검색 | `board/N` 계열 7건, `category` 0, `tag` 0, `files/` 0, `entry` 0, `rss\|atom` 0, `/page/` 0 |
| 루트 문서 링크 | 같은 방식으로 `^\?document_srl=` 검색 | 0건 |
| `board/114` 에 달린 `#content` 등 프래그먼트 | 위와 같음 | `board/114#content`, `board/114#comment`, `board/114#popup_menu_area` 관측 |

미관측 항목 (실제 링크가 크롤에서 안 나옴): 카테고리, entry, 파일 다운로드, 태그 상세, 검색, rss·atom, api. 이 형태들은 **규칙 표(Router.php)와 레거시 getURL 분기에서만 확인**했다. 실제 운영에서 쓰이는지는 미검증이다.

### 1-D. 1-B 에서 "대응 없음" 항목 요약 (사실)

- 문서 단독 주소(`/114`), 카테고리 주소(`/board/category/12`), entry, mid 없는 rss·atom, api, `common/rewrite/test`: rhymix-ts 에 같은 주소가 없다.
- 레거시 `index.php?` 쿼리 주소 전반: rhymix-ts 는 `index.php` 를 해석하지 않는다. 같은 쿼리 주소를 받는 경로가 없다.
- 레거시 파일 다운로드 주소 2종: rhymix-ts 는 `api/files/[id]/download`, `api/files/by-key/[key]/download` 로 주소 형태가 다르다.

---

## 작업 2 — 다국어 현황 (규모 측정)

### 2-A. 한글 문자열 리터럴이 있는 파일 수와 줄 수

명령 (그대로):

```
grep -rl --include=*.tsx -P "[\x{AC00}-\x{D7A3}]" apps/web/app | grep -v -E "node_modules|\.next|\.test\.|\.spec\.|__tests__|/dist/" | wc -l
grep -rn --include=*.tsx -P "[\x{AC00}-\x{D7A3}]" apps/web/app | grep -v -E "…" | wc -l
```

(components, packages 도 같은 방식)

| 위치 | 한글 포함 .tsx 파일 수 | 한글 포함 줄 수 (주석 포함) |
|---|---:|---:|
| `apps/web/app` | 174 | 2820 |
| `apps/web/components` | 40 | 588 |
| `packages/` (전체) | 25 | 525 |
| 합계 (중복 없음) | 239 | 3933 |

(주석 제외 집계) 주석 줄을 뺀 한글 줄 수: 2473 (`grep -v -P "^[^:]+:[0-9]+:\s*(//|\*|/\*)"` 적용). 이 수치는 한글 줄 전체를 세므로 JSX 문구와 문자열 리터럴이 섞여 있다. 문구만 따로 세지는 않았다.

분모: 검사 대상 `.tsx` (테스트 제외) 246개 (`find apps/web/app apps/web/components packages -name "*.tsx"` 후 제외). 즉 한글 포함 파일은 약 97%다 (239/246). 분모는 근사치다. `packages` 는 같은 조건으로 따로 세지 않고 전체 .tsx 수 246 에 포함해 셌다.

### 2-B. next-intl 설정 파일 유무

| 항목 | 명령 | 출력 |
|---|---|---|
| 의존성 선언 | `grep -n "next-intl" apps/web/package.json` | `51:    "next-intl": "^3.26.0",` |
| import 사용처 | `grep -rln "from 'next-intl'\|from \"next-intl\"\|next-intl/" apps packages --include=*.ts --include=*.tsx` | 0건 |
| 설정 플러그인·요청 설정 | `grep -rn -E "createNextIntlPlugin\|getRequestConfig" apps/web --include=*.ts --include=*.mjs --include=*.js` | 0건 |
| 메시지 디렉터리 | `find apps packages -type d \( -name messages -o -name locales -o -name i18n \)` | `packages/core/src/i18n`, `apps/web/app/(member)/messages`, `apps/web/app/(member)/settings/messages` (이 중 번역용은 `packages/core/src/i18n` 하나뿐 — 실제 내용은 `languages.ts` 한 파일) |

사실: `next-intl` 은 의존성에만 있다. 설정 파일, 메시지 파일, import 가 없다 (LGP-010 보강 의견과 일치).

### 2-C. 언어 목록 정의와 사용처 (언어 선택 저장 위치)

| 정의 위치 | 목록 (개수) | 용도 | 근거 |
|---|---|---|---|
| `packages/core/src/i18n/languages.ts:7` | `ko, en, ja, zh-CN, zh-TW, de, es, fr, mn, ru, tr, vi, id` (13) | 설치 마법사 언어 | 파일 주석: "Supported wizard languages (SPEC-INSTALL-001 i18n)" |
| `packages/admin/src/settings.ts:560` | `ko, en, ja, zh-CN, zh-TW, es, fr, de, ru, pt, vi, th, id` (13) | 관리자 사이트 기본 언어 스키마 (`defaultLanguage` `:578,588`, `supportedLanguages` `:587`) | 같은 파일 |
| `apps/web/app/admin/settings/advanced/AdvancedSettingsForm.tsx:56` | 위와 같은 13개를 이름과 함께 (`{code, name}`) | 관리자 고급 설정 화면의 선택 목록 (`:153,250,263`에서 map) | 같은 파일. 표시 이름: 한국어, English, 日本語 등 |

차이 (사실): 세 목록의 개수는 같지만 구성이 다르다. `mn`·`tr` 은 core 에만, `pt`·`th` 는 admin·고급 설정에만 있다. 세 곳이 한 상수를 공유하지 않는다.

저장 위치 (언어 선택이 어디에 저장되는가):

| 경로 | 저장 대상 | 근거 |
|---|---|---|
| 설치 마법사 | 설치 세션의 `session.language` → `seedInstall` 의 `site.defaultLanguage` (기본 `'en'`) | `apps/web/app/install/actions.ts:259`. 입력 스키마 `packages/core/src/install/schemas.ts:99` (`language: z.enum(SUPPORTED_LANGUAGES)`, core 목록 사용) |
| 관리자 사이트 기본 언어 | `site` 설정 `defaultLanguage` | `apps/web/server/api/routers/admin/site.ts:16,23` (`z.string()`, 목록 강제 없음), `apps/web/server/api/routers/admin/settings.ts:1036,1069` (`z.string()`) |
| 사이트 기본 언어 (스키마) | 관리자 스키마 | `packages/admin/src/settings.ts:578,588` (`z.enum`, admin 목록) |
| 게시판·메뉴의 다국어 콘텐츠 | DB 컬럼 `langCode` (기본 `"ko"`) | `packages/db/prisma/schema.prisma:827`, `:935`, `:939` (`@@unique([boardId, varIdx, langCode])`) |

주의: `site.ts` 와 `settings.ts` 의 `defaultLanguage` 는 목록 검증이 없다 (`z.string()`). 설치 쪽은 `z.enum(core 목록)` 으로 검증한다. 검증 방식이 경로마다 다르다.

사용자 언어 선택 (쿠키·URL 접두사·사용자 설정 등): 이번 조사에서 `Accept-Language`, `locale`, `lang` 쿠키 처리를 찾지 못했다. 세부 미확인 (아래 미검증).

### 2-D. 레거시 다국어 대비 (참고 숫자만)

| 구분 | 레거시 | 근거 |
|---|---|---|
| 공통 언어 파일 | 12종 (de, en, es, fr, ja, ko, mn, ru, tr, vi, zh-CN, zh-TW) | `common/lang/` `ls` 결과 |
| 모듈 `lang/` 디렉터리 | 30개 | `ls -d /mnt/d/project/rhymix/modules/*/lang` 개수 |
| 사용 방식 | `$lang->…` 변수로 `lang/*.php` 를 읽는다 | 레거시 구조 (세부 미확인) |

---

## 미검증 (Gaps)

- 레거시 실제 운영 rewrite 수준 (설정 실값). 1-C 의 관측으로는 2 이상으로 보이나 확정 아님.
- 레거시 카테고리·entry·파일 다운로드·태그 상세·검색 링크의 실제 운영 형태 (크롤에서 관측되지 않음).
- rhymix-ts `[mid]/page.tsx` 의 `page`, `sort_index`, `order_type` 파라미터 해석 방식.
- rhymix-ts 사용자 언어 선택의 저장 위치 (쿠키·헤더 처리 여부). 이번 조사에서 찾지 못함.
- 한글 줄 2473 (주석 제외) 중 UI 문구와 로그·에러 메시지·내부 식별자의 비율. 세부 분류는 하지 않음.
- 레거시 `lang/*.php` 의 키 개수와 rhymix-ts 화면 문구 키의 대응 (키 단위 비교 미수행).

## 잔여 위험 (Residual-risk)

- 2-A 의 줄 수는 grep 기준 근사치다. JSX 문구, 로그, 주석, 식별자가 섞여 있다.
- 1-B 의 "대응 없음" 판정은 정적 검색 기준이다. 실제 라우트 동작은 런타임에서 확인하지 않았다.
- 언어 목록 3종 불일치는 설계 전에 정본을 정해야 하는 사실이다. 이 문서는 정본을 제안하지 않는다.
