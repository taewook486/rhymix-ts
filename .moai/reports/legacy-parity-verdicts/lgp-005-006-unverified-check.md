# LGP-005 · LGP-006 미검증 항목 소스 확정

- 작성: moai3 (보조 세션), 읽기 전용 확인
- 입력: `lgp-005-settings.md`, `lgp-006-advanced.md` 의 "한계 (미검증)" 절과 비고
- 판정표 자체는 수정하지 않았다.
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 레거시 DB 변경, 전체 테스트·빌드

## 요약

| # | 항목 | 결론 |
|---|---|---|
| A | `dispAdminConfigGeneral` (시스템 설정 일반) | **다름.** 화면은 읽기 전용이다(폼 없음). 레거시 폼 필드 `unregistered_domain_action` 은 rhymix-ts 에 없다. |
| B | `dispAdminConfigSEO` (SEO) | **없음 (부분 다름).** 레거시 12개 필드 중 `seo_main_title`, `seo_subpage_title`, `seo_document_title`, `site_meta_keywords`, `og_enabled`, `twitter_enabled`, `og_extract_*`, `og_use_*` 는 rhymix-ts 에 개념 자체가 없다. |
| C | `dispAdminConfigAdvanced` (고급 설정) | **없음 (부분 다름).** 레거시 30개 필드 중 `thumbnail_quality`, `object_cache_host/port/user/pass/dbnum`, `outgoing_proxy`, `partial_page_rendering`, `make_sourcemap` 는 rhymix-ts 에 없다. 캐시 드라이버 선택(`cacheDriver`)만 있고 접속 정보 입력은 없다. |
| D | `dispLayoutAdminInstanceList` 인스턴스 생성 | **다름.** 쓰기 경로(`createInstance`)는 화면에 연결돼 있다. 레거시 `_layout_type`(PC/모바일 구분)에 대응하는 입력은 없다. |
| E | `dispModuleAdminModuleSetup` 일괄 기본 설정 | **없음.** `module.bulk` 는 enable/disable/delete 만 있고, 화면 호출처가 0건이다. |
| F | 라우터는 있는데 화면 호출처가 0인 mutation 목록 | **20개.** 아래 표. 이 중 **정상 쓰기 경로를 가진 것은 적고**, 상당수는 화면이 Server Action 에서 Prisma 를 직접 쓰거나, Server Action 이 목업이다. |

**추가로 발견한 중요 사실 (LGP-002 판정 정정 대상):** 회원 약관 편집 화면의 저장·삭제 Server Action 은 **목업**이다. DB 에 쓰지 않는다. 이는 `lgp-002-member.md` 가 `dispMemberAdminAgreementsConfig` 행을 "대응 있음"으로 적은 근거(`terms/page.tsx`, `TermsEditor.tsx`, `terms/actions.ts`)를 무효화한다.

---

## A. `dispAdminConfigGeneral`

결론: **다름 (화면은 읽기 전용).**

```
$ python3 (dispAdminConfigGeneral-20sd52.json 의 폼 필드, 공통 제외)
  ['unregistered_domain_action']

$ grep -n -E "<form|action=|Form|<button|type=\"submit\"|<h2" apps/web/app/admin/settings/site/page.tsx
  27:        <h2 className="text-base font-semibold mb-4">기본 정보</h2>
  46:        <h2 className="text-base font-semibold mb-4">도메인 목록</h2>
  (<form>, 저장 버튼 없음)

$ grep -rn -i -E "unregistered|미등록" apps/web/app apps/web/server packages/admin/src --include=*.ts --include=*.tsx | grep -v test
  (미등록 도메인 접속 동작 설정 관련 항목 없음. 위젯 "미등록" 표시 2건만 무관)
```

해석: 레거시 일반 설정의 유일한 필드인 "미등록 도메인 접속 시 동작"은 rhymix-ts 에 설정으로 없다. 화면은 사이트 기본 언어와 도메인 목록을 보여줄 뿐 저장하지 않는다. 판정표의 "격차" 는 맞다.

## B. `dispAdminConfigSEO`

결론: **부분 다름.** 겹치는 항목은 기본 메타 설명·OG 기본값 수준이고, 레거시 제목 템플릿·키워드·OG/트위터 세부 옵션은 없다.

```
$ python3 (dispAdminConfigSEO-16d7riw.json)
  ['og_enabled','og_extract_description','og_extract_hashtags','og_extract_images','og_use_nick_name','og_use_timestamps','seo_document_title','seo_main_title','seo_subpage_title','site_meta_description','site_meta_keywords','twitter_enabled']

$ sed -n 984,1000p apps/web/server/api/routers/admin/settings.ts  (요지)
  getSeo / updateSeo 입력 키: defaultMetaTitle, defaultMetaDescription, ogTitle, ogDescription, ogImageUrl, canonicalUrlPolicy, sitemapEnabled

$ for k in mainTitle titleTemplate keywords ogEnabled twitter ogExtract useNick useTimestamp seoMain seo_main
  → 모든 키워드에서 app/admin/settings/seo, settings.ts, packages/admin/src 검색 결과 0건

$ grep -o -E "[가-힣][가-힣 ()/·0-9]{2,30}" apps/web/app/admin/settings/seo/SeoSettingsForm.tsx | sort -u
  (메타 제목·설명, 사이트 이름·설명, OG 제목·설명·이미지, 사이트 인증 코드, 사용 정책, 사이트맵 생성 등. 제목 템플릿·키워드·트위터·OG 세부 옵션 라벨 없음)
```

해석: rhymix-ts 는 canonical 정책·사이트맵·사이트 인증 코드 등 레거시에 없는 항목을 가진다. 레거시의 "제목 템플릿 3종(메인·하위·문서)", "키워드", "트위터 카드", "OG 추출 옵션 4종"은 없다. 판정표의 "격차"는 맞다.

## C. `dispAdminConfigAdvanced`

결론: **부분 다름.** 라우팅·언어·성능 대부분은 대응하지만 캐시 접속 정보, 썸네일 품질, 외부 프록시, 부분 렌더링, 소스맵 항목이 없다.

```
$ python3 (dispAdminConfigAdvanced-1trmhjb.json, 30개 필드)
  ['auto_select_lang','cache_control_header[]','cache_default_ttl','cache_truncate_method','concat_scripts','default_lang','default_timezone','delay_session','delay_template_compile','enabled_lang[]','jquery_version','make_sourcemap','manager_layout','minify_scripts','mobile_viewport','object_cache_dbnum','object_cache_host','object_cache_pass','object_cache_port','object_cache_type','object_cache_user','outgoing_proxy','partial_page_rendering','tablets_as_mobile','thumbnail_quality','thumbnail_target','thumbnail_type','use_db_session','use_mobile_view','use_rewrite']

$ grep -rn -i -E "cacheHost|redisHost|memcached|cacheServer|objectCache|cache.*host" apps/web/server/api/routers/admin/settings.ts apps/web/app/admin/settings/advanced
  apps/web/app/admin/settings/advanced/AdvancedSettingsForm.tsx:21  cacheDriver: 'file' | 'redis' | 'memcached'
  apps/web/app/admin/settings/advanced/AdvancedSettingsForm.tsx:173  <option value="memcached">Memcached</option>
  apps/web/server/api/routers/admin/settings.ts:1037  cacheDriver: z.enum(['file','redis','memcached'])
  (접속 호스트·포트·사용자·비밀번호·DB 번호 입력 없음)

$ for k in thumbnailQuality outgoingProxy partialPage makeSourcemap sourcemap
  → apps/web/app/admin/settings/advanced, settings.ts, packages/admin/src 검색 0건
```

해석: `cacheDriver` 선택은 있으나 레거시 `object_cache_*` 접속 정보는 없다. 썸네일 품질, 외부 프록시, 부분 페이지 렌더링, 소스맵은 없다. 판정표 비고 "없는 필드" 목록은 맞다.

## D. `dispLayoutAdminInstanceList` 인스턴스 생성 쓰기 경로

결론: **쓰기 경로는 화면에 연결돼 있다. 입력 개념은 다르다.**

```
$ sed -n 14,20p apps/web/app/admin/site/layouts/instances/actions.ts  (요지)
  await caller.admin.layout.createInstance({ themeId, scope, refId, layoutName });
  revalidatePath('/admin/site/layouts/instances');

$ sed -n 76,82p apps/web/server/api/routers/admin/layout.ts  (createInstance 입력)
  themeId: z.string().min(1), scope: z.enum(['SITE','DOMAIN','MODULE_INSTANCE']), refId: z.string().min(1), layoutName: z.string().min(1)
```

해석: 레거시 입력 `layout`, `title`, `_layout_type`(PC/모바일) 에 대응하는 것은 `layoutName`, `scope`, `refId` 다. PC/모바일 구분 개념은 입력에 없다(`scope` 는 적용 범위다). 판정표 비고 "레거시 필드 `_layout_type` ↔ rhymix-ts 는 `themeId`, `scope`, `refId`, `layoutName`"은 개념 대응이 아니라 필드명 나열이다. 정정 여부는 판정표 소관이다.

## E. `dispModuleAdminModuleSetup` 일괄 기본 설정

결론: **없음.** 쓰기 프로시저와 화면 호출처가 모두 없다.

```
$ sed -n 241,243p apps/web/server/api/routers/admin/module.ts
  z.object({ action: z.enum(['enable', 'disable', 'delete']), ...
$ grep -rn -E "module\.bulk|moduleBulk|bulkModule" apps/web/app apps/web/components --include=*.tsx --include=*.ts | grep -v test
  (출력 없음)
```

해석: 레거시 일괄 설정 항목(`module_category_srl`, `layout_srl`, `skin`, `header_text`, `footer_text`, `description`)에 대응하는 프로시저가 없다. 판정표 "격차"는 맞다.

## F. 라우터 mutation 중 화면 호출처 0건 목록

### F-1. 방법

- 대상: `apps/web/server/api/routers/admin/*.ts` (테스트 제외), 루트 라우터 `index.ts` 의 키 매핑으로 `<키>.<프로시저>` 를 만들고, `.mutation` 이 있는 프로시저만 셌다.
- 호출처 검색: `apps/web/app`, `apps/web/components`, `apps/web/lib` 의 `.ts`·`.tsx` (테스트 제외)에서 `<키>.<프로시저>` 문자열 검색.
- 명령 요지 (python3, 읽기 전용): 프로시저 목록 추출 후 `re.search(r'\b<key>\.<name>\b')` 로 호출처 수 계산.
- 결과: mutation 115개 중 **호출처 0 인 것 20개**.

출력 (그대로):

```
mutations total 115  zero UI callers 20
module.bulk | server/api/routers/admin/module.ts
site.domain.update | server/api/routers/admin/site.ts
user.updateNickname | server/api/routers/admin/user.ts
cache.cleanupFiles | server/api/routers/admin/cache.ts
category.create | server/api/routers/admin/category.ts
category.update | server/api/routers/admin/category.ts
category.delete | server/api/routers/admin/category.ts
contentExtraKey.create | server/api/routers/admin/content-extra-key.ts
contentExtraKey.update | server/api/routers/admin/content-extra-key.ts
contentExtraKey.delete | server/api/routers/admin/content-extra-key.ts
contentExtraKey.reorder | server/api/routers/admin/content-extra-key.ts
document.setAlias | server/api/routers/admin/document.ts
settings.updateEmailQueue | server/api/routers/admin/settings.ts
settings.updateTags | server/api/routers/admin/settings.ts
stats.incrementVisitCounters | server/api/routers/admin/stats.ts
terms.create | server/api/routers/admin/terms.ts
terms.update | server/api/routers/admin/terms.ts
tag.merge | server/api/routers/admin/tag.ts
tag.rename | server/api/routers/admin/tag.ts
tag.delete | server/api/routers/admin/tag.ts
```

### F-2. 호출처가 0 인 이유별 분류 (2차 확인)

위 20개가 모두 "쓰기 경로 없음"은 아니다. 화면이 **Server Action 이나 Prisma 를 직접 호출**해 라우터를 우회하는 경우가 있다. 2차 확인 결과:

| 분류 | 프로시저 | 실제 쓰기 경로 | 근거 |
|---|---|---|---|
| **Server Action 이 Prisma 직접 쓰기 (라우터 우회)** | `category.create`, `category.delete` | 게시판 분류 페이지 `apps/web/app/admin/boards/[mid]/categories/page.tsx:60`(`prisma.documentCategory.create`), `:83`(`delete`) | 라우터 `category.update` 는 어디서도 안 씀 (`:52`) |
| **Server Action 이 Prisma 직접 쓰기 (라우터 우회)** | `contentExtraKey.create`, `contentExtraKey.delete` | 확장 변수 페이지 `apps/web/app/admin/boards/[mid]/extra-keys/page.tsx:67`(`prisma.documentExtraKey.create`), `:93`(`deleteMany`) | 라우터 `update`(`:95`), `reorder`(`:130`) 호출처 없음 |
| **Server Action 목업 (DB 쓰기 없음)** | `terms.create`, `terms.update`, `terms.delete` (화면 호출은 `terms` 가 아닌 Action) | 약관 편집 `apps/web/app/admin/members/terms/actions.ts:50`(`// await caller.admin.terms.upsert` 주석, `console.log('[Mock] Upsert term:')`), `:79`(`// await caller.admin.terms.delete` 주석, `console.log('[Mock] Delete term:')`) | 라우터 `terms.ts:53`, `:111`, `:150` 은 `prisma.terms.create/update/delete` 를 실행하나 화면이 연결돼 있지 않다 |
| **화면 호출처 없음 (쓰기 경로 자체가 화면에 없음)** | `module.bulk`, `user.updateNickname`, `cache.cleanupFiles`, `document.setAlias`, `settings.updateEmailQueue`, `settings.updateTags`, `stats.incrementVisitCounters`, `tag.merge`, `tag.rename`, `tag.delete`, `site.domain.update` | 없음 | 각 행 F-1 목록과 동일 |

추가 참고:
- `site.domain.update` 의 쓰기는 `apps/web/app/admin/site/design/actions.ts:257` 에서 `prisma.domain.update` 를 직접 실행한다(라우터 우회). 따라서 "호출처 없음"을 "쓰기 불가"로 읽으면 틀린다.
- `updateEmailQueue` 는 LGP-007 확인대로 UI 가 없다(`settings.ts:962-971`).
- `stats.incrementVisitCounters`, `cache.cleanupFiles`, `document.setAlias` 는 화면이 없다. 다른 경로(스케줄러·CLI 등)에서 호출될 수 있으나 이번 조사에서 확인하지 않았다.

### F-3. 판단 근거 요약

- 라우터 존재 ≠ 기능 대응. 판정표는 호출처를 함께 봐야 한다.
- 가장 중요한 것은 **약관 편집기**다. 화면은 있으나 저장·삭제가 목업이라 실제로는 아무것도 저장되지 않는다. LGP-002 의 `dispMemberAdminAgreementsConfig` 행과 `lgp-002-member.md` 의 "대응 있음"을 "목업 — 저장 안 됨"으로 정정해야 한다.
- 게시판 분류·확장 변수는 화면이 쓰기를 하지만 라우터를 우회한다. 기능은 있으나 권한 가드(`assertAdminServerAction`)를 거치는지는 분리해서 봐야 한다. 이번 조사에서는 가드 호출만 확인했다(`categories/page.tsx` 의 Server Action 에서 `assertAdminServerAction` 사용).

---

## 미검증 (Gaps)

- 레거시 화면을 브라우저로 열어 필드 동작을 확인하지 않았다. 레거시 필드는 `pages/*.json` 기준이다.
- F-1 의 호출처 검색은 문자열 `<키>.<프로시저>` 기준이다. 변수에 담아 간접 호출하거나 다른 키 이름을 쓰면 놓친다.
- `stats.incrementVisitCounters`, `cache.cleanupFiles` 등의 호출 주체(크론, 미들웨어, CLI 등)는 이번 조사에서 확인하지 않았다.
- 라우터 우회 쓰기(Prisma 직접 호출)에 대한 권한 가드 적용 범위는 `assertAdminServerAction` 호출 여부만 확인했고, 각 Action 의 전체 흐름은 읽지 않았다.

## 잔여 위험 (Residual-risk)

- 정적 소스 기준이다. 런타임에서만 실행되는 경로를 놓칠 수 있다.
- 약관 목업 판정은 `actions.ts` 의 `console.log('[Mock] …')` 와 주석 처리된 호출을 근거로 한다. 실제 저장 여부는 런타임에서 확인하지 않았다.
