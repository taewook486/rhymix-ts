# SPEC-LEGACY-PARITY-005 설정 영역 판정표 (초안)

- 작성: moai2 (읽기 전용 조사, 저장소 파일 무수정)
- 입력: `.moai/reports/legacy-admin-map/coverage.md` 의 모듈 `admin` 행 16개(32~47행) + `dispModuleAdminFileBox` 1행(119행) = 17행. `pages/*.json` 폼 필드
- 대상: `apps/web/app/admin/{settings,domains,system,page.tsx}`, `apps/web/server/api/routers/admin/*`, `packages/admin`
- 판정 기준 (LGP-003 초안과 동일)
  - **대응 있음**: 같은 목적의 화면·동작이 있고 핵심 폼 필드가 대부분 있음 (누락은 비고)
  - **격차**: 화면이 없거나, 있어도 레거시 폼 필드 대부분이 없거나 쓰기 경로가 없음
  - **의도적 제외 후보**: 레거시 자체 폐기 또는 구조 차이로 구현 대상에서 뺄 근거가 있음 (최종 결정은 moai)
- 근거 파일은 `.moai/reports/legacy-admin-map/pages/` 아래 파일명. 판정 빈칸 0.

## 1. 판정표

| 레거시 act | 화면 제목 | 근거 파일 | rhymix-ts 대응 | 판정 | 비고 (레거시 폼 필드 중 rhymix-ts 에 없는 것) |
|---|---|---|---|---|---|
| `dispAdminIndex` (보충) | 대시보드 | dispAdminIndex-tcwzvz.json | `apps/web/app/admin/page.tsx` (`dashboard.getVisitStats/getRecentDocuments/getRecentComments`, `stats.getSummaryCounts/getNewContent/getDayOverDay`, `getWidgetPrefs`; 경로 `routers/admin/dashboard.ts:27/66/115/176`) | 대응 있음 | 레거시의 "설치 마무리 작업" 안내(모듈 DB 테이블 생성)는 없음. rhymix-ts 는 Prisma 마이그레이션 방식이라 해당 개념이 없다. 폼 필드 `cart[]` 는 일괄 선택용 |
| `dispAdminConfigGeneral` | 시스템 설정(일반) | dispAdminConfigGeneral-20sd52.json | `apps/web/app/admin/settings/site/page.tsx` (사이트 기본 언어 + 도메인 표, 읽기 전용) + `admin.site.get`, `admin.site.domain.list` | 격차 | 레거시 폼 필드: `unregistered_domain_action`(미등록 도메인 접속 시 동작). `grep unregisteredDomain\|unregistered_domain` 결과 0건. 화면은 조회만 하고 저장 폼이 없음 |
| `dispAdminInsertDomain` (보충) | 도메인 추가/수정 | dispAdminInsertDomain-cw2j4w.json | 생성: 없음. 수정: `admin.site.domain.update` (`routers/admin/site.ts:66`; `forceHttps`, `defaultLanguage`, `defaultTimezone`, `isDefault`) — 이 프로시저를 호출하는 관리자 화면은 확인되지 않음. 인덱스 모듈 지정: `apps/web/app/admin/domains/page.tsx` + `IndexModuleForm.tsx` + `admin.domain.setIndexModule` (`routers/admin/domain.ts:127`) | 격차 | 없는 필드: `title`, `subtitle`, `domain`(호스트 입력), `http_port`, `https_port`, `domain_security`, `index_document_srl`, `force_lang`, `meta_keywords`, `meta_description`, `html_header`, `html_footer`, `favicon`, `dark_favicon`, `mobicon`, `default_image`, `color_scheme`. 있는 것: 기본 도메인·기본 언어·시간대(라우터만), 인덱스 모듈(화면). `admin/site/design/actions.ts:257` 에서 `prisma.domain.update` 를 직접 호출하는 디자인 설정이 일부 필드를 다루나 이번 조사에서는 필드 대조하지 않음 |
| `dispAdminCopyDomain` | 도메인 복사 | dispAdminCopyDomain-6r0erz.json | 없음 | 격차 | `copy_domain_srl` 포함 위 도메인 폼 필드 전체. 도메인 복사 동작 없음 |
| `dispAdminConfigSecurity` | 보안 설정 | dispAdminConfigSecurity-mbkm79.json | `apps/web/app/admin/settings/security/page.tsx` + `SecuritySettingsForm.tsx` + `admin.settings.getSecurity/updateSecurity` (`routers/admin/settings.ts:799/806`), `getIpControl/updateIpControl` (`:1219/1227`) | 격차 | 겹치는 것: 관리자 IP 허용·차단(`admin_allowed_ip`/`admin_denied_ip` ≈ `ipControlAllowList`/`ipControlDenyList`). 없는 필드: `mediafilter_whitelist`, `mediafilter_classes`, `robot_user_agents`, `admin_url_prefix`, `autologin_lifetime`, `autologin_refresh`, `use_session_refresh`, `use_session_ssl`, `use_cookies_ssl`, `check_csrf_token`, `use_nofollow`, `use_httponly`, `use_samesite`, `x_frame_options`, `x_content_type_options`. rhymix-ts 쪽은 캡차·로그인 잠금·비밀번호 규칙·세션 수명 등 레거시에 없는 필드가 주 |
| `dispAdminConfigSEO` | SEO 설정 | dispAdminConfigSEO-16d7riw.json | `apps/web/app/admin/settings/seo/page.tsx` + `SeoSettingsForm.tsx` + `admin.settings.getSeo/updateSeo` (`settings.ts:984/991`) | 격차 | 겹치는 것: 기본 메타 설명(`site_meta_description` ≈ `defaultMetaDescription`), OG 기본값. 없는 필드: `seo_main_title`, `seo_subpage_title`, `seo_document_title`(제목 템플릿 3종), `site_meta_keywords`, `og_enabled`, `twitter_enabled`, `og_extract_description`, `og_extract_images`, `og_extract_hashtags`, `og_use_nick_name`, `og_use_timestamps`. rhymix-ts 는 canonical 정책·사이트맵·robots.txt·애널리틱스 ID 등 레거시에 없는 필드 포함 |
| `dispAdminConfigSitelock` | 사이트 잠금 | dispAdminConfigSitelock-hswufr.json | `apps/web/app/admin/settings/sitelock/page.tsx` + `SitelockSettingsForm.tsx` + `admin.settings.getSitelock/updateSitelock` (`settings.ts:1168/1175`) | 대응 있음 | 있는 필드: `locked`, `allowedIpList`, `message`. 없는 필드: `sitelock_title`(잠금 화면 제목) |
| `dispAdminConfigQueue` | 비동기 작업 | dispAdminConfigQueue-e2hwr0.json | `apps/web/app/admin/settings/async/page.tsx` + `AsyncSettingsForm.tsx` + `admin.settings.getAsync/updateAsync` (`settings.ts:1132/1139`) | 대응 있음 | 6필드 모두 대응(`enabled`, `driver`, `webcronKey`, `webcronShowError`, `intervalMinutes`, `processCount`). 드라이버 선택지가 레거시와 같은지는 확인하지 않음 |
| `dispAdminConfigDebug` | 디버그 설정 | dispAdminConfigDebug-dv2b0u.json | `apps/web/app/admin/settings/debug/page.tsx` + `DebugSettingsForm.tsx` (`actions.ts` 서버 액션) | 대응 있음 | 대응: `enabled`, 느린 쿼리/트리거/위젯/외부요청 임계값 4종, `displayMethods`, `contentTypes`, `logFilePath`, `displayTarget`, `allowedIps`, `addQueryComment`, `showFullCallStack`, `deduplicateErrors`, `errorLogLevel`. 레거시 `debug_log_*` 4개 체크박스는 임계값 입력으로 바뀌어 의미가 다름(사용 여부 토글 없음) |
| `dispAdminConfigAdvanced` | 고급 설정 | dispAdminConfigAdvanced-1trmhjb.json | `apps/web/app/admin/settings/advanced/page.tsx` + `AdvancedSettingsForm.tsx` + `admin.settings.getAdvancedRouting/Localization/Performance` (`settings.ts:1025/1054/1087`) | 대응 있음 | 대응: 모바일 보기·태블릿·뷰포트, 자동 언어 선택·지원 언어·기본 언어·시간대, DB 세션·세션 지연 시작, 템플릿 컴파일 지연, 썸네일 대상·방식, 캐시 드라이버·TTL·삭제 방식·Cache-Control, 관리자 레이아웃, JS/CSS 압축·병합, jQuery 버전, 짧은 URL 정책(`use_rewrite`). 없는 필드: `thumbnail_quality`, `object_cache_host/port/user/pass/dbnum`(캐시 접속 정보), `outgoing_proxy`, `partial_page_rendering`, `make_sourcemap` |
| `dispAdminConfigNotification` | 알림 설정(메일·SMS·푸시) | dispAdminConfigNotification-v8ys9c.json | `apps/web/app/admin/settings/notification/page.tsx` + `NotificationSettingsForm.tsx` + `admin.settings.getNotification/updateNotification` (`settings.ts:768/775`), 메일 내역 `apps/web/app/admin/site/mail/logs/page.tsx` | 격차 | 있는 것: 발신자 이름·주소, SMTP(호스트·포트·보안·계정), 이벤트별 알림 토글(댓글·답글·멘션·쪽지). 없는 필드: `mail_default_reply_to`, `mail_force_default_sender`, `mail_driver` 선택과 SES·Brevo·Mailgun·Mandrill·NCloud·Postmark·SendGrid·SparkPost·Woorimail 설정 전부, `sms_*` 전부(CoolSMS 등), 푸시 설정(필드 목록 뒤쪽은 JSON 에서 잘려 이름 미확인) |
| `dispAdminConfigFtp` (보충) | FTP 설정 | dispAdminConfigFtp-16d7j19.json | 없음. `grep -rliE "\bftp\b" apps/web/app packages/admin/src` 결과 0건 | 의도적 제외 후보 | **레거시 2.1.41 에서 폐기**. `/mnt/d/project/rhymix/modules/admin/admin.admin.view.php:23-28` — `@deprecated` 주석 + `public function dispAdminConfigFtp() { throw new Rhymix\Framework\Exceptions\FeatureDisabled; }`. 화면 본문도 "사용할 수 없는 기능입니다. modules/admin/admin.admin.view.php:27" (coverage.md 보충 방문 결과). 폼 필드 없음 |
| `dispAdminRewriteTest` (보충) | 짧은 주소 동작 테스트 | dispAdminRewriteTest-138noez.json | 화면 없음. `apps/web/proxy.ts:48,72` 에 설치 진단용 `/api/install/rewrite-test/` 통과 규칙(REQ-INSTALL-012)만 있음 | 의도적 제외 후보 | 레거시 응답은 HTML 이 아닌 JSON `{"result":0,"error":0,"message":"success"}` 한 줄로 관리자 화면이 아니다. Next.js 는 URL 재작성 서버 설정에 의존하지 않아 같은 목적의 사용자 기능이 불필요. 설치 단계 진단은 이미 별도로 존재 |
| `dispAdminSetup` | 관리자 화면 설정(관리자 메뉴 편집) | dispAdminSetup-ti9j6i.json | 관리자 메뉴 편집 없음. 사이드바는 `apps/web/components/admin/AdminSidebar.tsx` 의 고정 NAV + 즐겨찾기(`admin.favorite.list/add/remove/reorder`, `routers/admin/favorite.ts:20/35/90/101`). `apps/web/app/admin/menu/` 는 사이트 메뉴 편집(`admin.menu.list`)으로 성격이 다름 | 격차 | 레거시 필드: `menu_srl`, `title`, `menu_item_srl`, `parent_key[]`, `item_key[]`, `parent_srl`, `menu_name`(관리자 메뉴 트리 편집). 즐겨찾기 정렬 기능은 대응하나 메뉴 트리 자체를 바꿀 수 없음 |
| `dispAdminCleanupList` | 코어 파일 정리 | dispAdminCleanupList-g3z4hr.json | `apps/web/app/admin/system/cleanup/page.tsx` + `admin.cache.listCleanupCandidates/cleanupFiles` (`routers/admin/cache.ts:86/126`) | 대응 있음 | 레거시 폼 필드 없음(목록·버튼 화면). 대응하는 정리 대상 목록은 있으나 정리 대상의 종류는 서로 다른 구현이라 항목 단위 대조는 하지 않음 |
| `dispAdminViewServerEnv` | 서버 환경 표시 | dispAdminViewServerEnv-9ao86a.json | `apps/web/app/admin/system/server-env/page.tsx` + `admin.system.health` (`routers/admin/system.ts:49`; Node.js·Next.js·데이터베이스 섹션) | 대응 있음 | 레거시는 PHP·확장 모듈·서버 정보 표. rhymix-ts 는 Node/Next/DB 정보라 항목이 다름(런타임 차이) |
| `dispModuleAdminFileBox` | 파일박스 | dispModuleAdminFileBox-drqdw8.json | 없음. `grep -rliE filebox apps packages` (ts·tsx·prisma) 결과 0건 | 격차 | 레거시 필드: `filter`, `input`, `attribute_name[]`, `attribute_value[]`, `addfile`(관리자가 파일을 올려 재사용하는 보관함). 파일 관리(`/admin/files`)와 목적이 다름 |

### 1.1 집계

| 판정 | 행 수 |
|---|---:|
| 대응 있음 | 7 |
| 격차 | 8 |
| 의도적 제외 후보 | 2 |
| 합계 | 17 |

(§3 말미 `awk` 로 재집계한 값: 7 / 8 / 2, 합계 17, 빈 판정 0.)

### 1.2 rhymix-ts 에만 있는 설정 화면 (레거시 admin 행에 대응 act 없음, 참고)

- `/admin/settings/communication` (쪽지함 한도 `inboxLimit` 등, `admin.settings.getCommunication`)
- `/admin/settings/social` (소셜 로그인), `/admin/settings/import`, `/admin/settings/export`
- `/admin/system` (시스템 헬스), `/admin/system/cache` (캐시 비우기, `admin.cache.purge` `cache.ts:54`)

## 2. 요약

- 대응 있음 7 / 격차 8 / 의도적 제외 후보 2 (17행).
- 구조 차이가 큰 격차: **도메인**(생성·복사·세부 필드 전부 없음, 수정 프로시저만 있고 호출 화면 미확인), **알림**(메일 드라이버 10종·SMS 없음), **보안**·**SEO**(필드가 서로 다른 방향), **일반 설정**(미등록 도메인 동작).
- `dispAdminConfigFtp` 는 레거시 소스 `admin.admin.view.php:23-28` 에서 `FeatureDisabled` 를 던지는 폐기 화면이라 제외 후보.
- `dispAdminRewriteTest` 는 관리자 UI 가 아니라 JSON 진단 응답이라 제외 후보로 올렸다. 확정은 moai 판단.

## 3. 판정 근거 명령과 실제 출력 요약

모두 `/mnt/d/project/rhymix-ts` 에서 읽기 전용으로 실행. 레거시 소스 한 파일은 읽기만 했다.

1. 대상 행 추출: `grep -n '^| admin \|dispModuleAdminFileBox' coverage.md` → admin 모듈 16행(32-47행)과 `dispModuleAdminFileBox` 119행
2. 레거시 폼 필드 추출: `pages/<act>-*.json` 의 `forms[].fields[].name` (즐겨찾기 토글 폼·csrf·`xe_validator_id` 등 숨은 필드 제외) → §1 비고의 레거시 필드. `dispAdminConfigFtp`·`dispAdminRewriteTest`·`dispAdminViewServerEnv`·`dispAdminCleanupList` 는 필드 0
3. FTP 폐기 근거: `grep -n "FeatureDisabled\|@deprecated" /mnt/d/project/rhymix/modules/admin/admin.admin.view.php` → 6·13·23·27행. 23-28행이 `dispAdminConfigFtp` 의 `@deprecated` + `throw FeatureDisabled`
4. rhymix-ts 폼 필드: `grep -rhoE "(name|htmlFor|id)=\"...\"" apps/web/app/admin/settings/{security,seo,sitelock,notification,advanced,debug,async,communication} --include=*Form.tsx` → §1 각 행의 "있는 필드"
   - security: captcha* 5, ipControl* 3, loginLockoutTime, loginMaxAttempts, passwordMinLength, passwordRequireComplex, sessionLifetime
   - notification: senderName/Email, smtp* 6, comment/reply/mention/message
5. 라우터 프로시저·줄 번호: `grep -n "^  [a-zA-Z]*: protectedAdminProcedure" routers/admin/settings.ts` → getSecurity 799, getSeo 984, getAsync 1132, getSitelock 1168, getIpControl 1219 등. `domain.ts` 는 list 20 / getById 69 / setIndexModule 127 뿐. `site.ts` 는 `domain: router` 50, `update` 66
6. 도메인 수정 호출 화면: `grep -rn "domain.update" apps/web/app --include=*.ts*` (테스트 제외) → `admin/site/design/actions.ts:257`, `api/admin/import/route.ts:174`. `admin.site.domain.update` 를 호출하는 화면은 없음
7. 부재 확인 (모두 출력 없음): `grep -rliE "filebox"`, `grep -rliE "unregisteredDomain|unregistered_domain"`, `grep -rliE "\bftp\b" apps/web/app packages/admin/src`
8. 리라이트 테스트: `grep -n "REWRITE_TEST_PREFIX" apps/web/proxy.ts` → 48, 72행
9. 관리자 메뉴: `grep -n "favorite" components/admin/AdminSidebar.tsx`, `grep -n "^  [a-zA-Z]*:" routers/admin/favorite.ts` → list·add·remove·reorder. `apps/web/app/admin/menu/page.tsx:24` 는 `admin.menu.list` (사이트 메뉴)
10. 레거시 화면은 열지 않았다. 레거시 비교는 `pages/*.json` 과 `coverage.md` 의 보충 방문 결과만 사용했다.

### 3.1 한계 (미검증)

- 화면을 브라우저로 열어 확인하지 않았다. "대응 있음"은 소스의 폼 필드·프로시저 존재 기준이다.
- 알림 설정 행은 `pages` JSON 필드 목록이 중간에서 잘려 푸시 관련 레거시 필드 이름을 확인하지 못했다.
- `admin/site/design/actions.ts:257` 의 도메인 필드 범위, 비동기 작업 드라이버 선택지 일치 여부, 코어 파일 정리 항목 일치 여부는 대조하지 않았다.
- 판정 경계(필드 절반 이상 부재면 격차)는 이 초안의 기준이며, 보안·SEO·알림처럼 경계에 가까운 행은 moai 가 다시 볼 만하다.

```bash
# 판정 열 재집계
awk -F'|' '/^\| `disp/{gsub(/^ +| +$/,"",$6); c[$6]++; n++} END{for(k in c) print k, c[k]; print "total", n}' .moai/state/collab/lgp-005-settings-draft.md
```

## 미검증 확정 (moai3, 2026-11-28, moai 재확인) — 상세: `lgp-005-006-unverified-check.md`

- `dispAdminConfigGeneral` 다름(읽기 전용, `unregistered_domain_action` 없음), SEO 레거시 12필드 중 제목 규칙·OG·트위터 계열 없음, 고급 설정의 객체 캐시 접속·외부 프록시·썸네일 품질 등 없음.
- **보안 설정 화면의 CAPTCHA 저장이 목업이다**(moai 스캔): `apps/web/app/admin/settings/security/actions.ts:137-141` `console.log('[Mock] Update CAPTCHA settings:', …)`. 폼(`SecuritySettingsForm.tsx:44`)에 연결돼 있어 저장한 것처럼 보이지만 DB 에 남지 않는다. 같은 기능의 정상 화면은 `settings/spamfilter/captcha`(`admin.spamfilter.captcha`) → 중복 화면 정리 + 버그 수리 대상.
- 라우터 mutation 115개 중 화면 호출처 0 인 것 20개(목록은 상세 파일 §F). 다수는 Server Action 이 Prisma 를 직접 쓰는 우회라 기능은 동작하나, 같은 규칙(권한·감사 로그)이 두 경로로 갈라져 있다.
