# SPEC-LEGACY-PARITY-006 고급 영역 판정표 (초안)

- 작성: moai2 (읽기 전용 조사, 저장소 파일 무수정)
- 입력: `.moai/reports/legacy-admin-map/coverage.md` 그룹 '고급' 23 act + 보충 중 addon·autoinstall·layout·module·page·widget 14행 + 공통(헤더/푸터) 3행. `pages/*.json` 폼 필드
- 대상: `apps/web/app/admin/{site,modules,pages,widgets,addons,system,logs,stats,settings}`, `apps/web/server/api/routers/admin/*`, `packages/{admin,page,core}`
- 판정 기준 (003·005 초안과 동일)
  - **대응 있음**: 같은 목적의 화면·동작이 있고 핵심 폼 필드가 대부분 있음 (누락은 비고)
  - **격차**: 화면이 없거나, 있어도 레거시 폼 필드 대부분이 없거나 쓰기 경로가 없음
  - **의도적 제외 후보**: 레거시 자체 결함·폐기, 또는 구조 차이로 구현 대상에서 뺄 근거가 있음 (최종 결정은 moai)
- 근거 파일은 `.moai/reports/legacy-admin-map/pages/` 아래 파일명. 판정 빈칸 0.
- 다른 영역 소관 행은 판정표 밖 §1.2 에 "참조"로만 적었다 (`dispTagAdminConfig`→003, `dispAdminCleanupList`·`dispAdminViewServerEnv`→005, `dispMemberAdminInfo`→회원 영역).

## 1. 판정표

| 레거시 act | 화면 제목 | 근거 파일 | rhymix-ts 대응 | 판정 | 비고 (레거시 폼 필드 중 rhymix-ts 에 없는 것 / 레거시 오류) |
|---|---|---|---|---|---|
| `dispAddonAdminIndex` | 애드온 목록 | dispAddonAdminIndex-hka27r.json | `apps/web/app/admin/addons/page.tsx` + `AddonsClient.tsx` + `actions.ts` (`toggleAddonAction`, `reorderAddonAction`) | 대응 있음 | 레거시 필드 `pc_on[]`/`mobile_on[]`(PC·모바일 따로 켜기). rhymix-ts 는 `enabled` 하나뿐이라 PC/모바일 분리 없음 |
| `dispAddonAdminSetup` | 애드온 개별 설정 | dispAddonAdminSetup-1vdpgel.json | 없음 (`addons/actions.ts` export 는 토글·정렬 2개뿐) | 격차 | `addon_name`, `xe_run_method`(실행 방식), `mid_list[]`(적용 대상 게시판 선택) |
| `dispAddonAdminInfo` (보충) | 애드온 정보 | dispAddonAdminInfo-1luvukt.json | 없음 (목록 화면에 상세 정보 화면 없음) | 격차 | 레거시는 제작자·버전·설명 표시. 폼 필드 없음 |
| `dispAutoinstallAdminIndex` | 쉬운 설치 | dispAutoinstallAdminIndex-1h156rn.json | 없음 (`grep -rliE "autoinstall/marketplace"` 결과 0건) | 의도적 제외 후보 | 레거시 외부 패키지 서버에서 모듈·레이아웃·위젯을 내려받는 기능. rhymix-ts 는 코드 배포 방식이라 대응 개념이 없음. **제외를 확정한 문서는 찾지 못함 — moai 확인 필요** |
| `dispAutoinstallAdminPackageDetail` (보충) | 패키지 상세 | dispAutoinstallAdminPackageDetail-1g5p1ig.json | 없음 | 의도적 제외 후보 | 위와 동일. 레거시도 파라미터 없이 열면 "잘못된 요청입니다. modules/autoinstall/autoinstall.admin.view.php:80" |
| `dispCommunicationAdminConfig` | 커뮤니케이션 설정 | dispCommunicationAdminConfig-u8v0dj.json | `apps/web/app/admin/settings/communication/page.tsx` + `CommunicationSettingsForm.tsx` + `admin.settings.getCommunication/updateCommunication` (`routers/admin/settings.ts:1294/1301`) | 격차 | 있는 필드: `enabled`, `inboxLimit`. 없는 필드: `enable_friend`, `enable_attachment`, `attachment_size_limit`, `editor_skin`, `sel_editor_colorset`, `layout_srl`, `skin`, `mlayout_srl`, `mskin`, `grant_send_default`, `grant_send_group[]` |
| `dispCounterAdminIndex` | 접속통계 | dispCounterAdminIndex-1ibam0k.json | `apps/web/app/admin/stats/page.tsx` + `admin.stats.getDetailedStats/getVisitStats/getSummaryCounts` (`routers/admin/stats.ts:127/30/46`) + 집계 `packages/admin/src/stats/*` | 대응 있음 | 레거시 필드 `selected_date`(날짜 선택). 날짜 선택 UI 여부는 확인하지 않음 |
| `dispExtravarAdminConfig` | 확장 변수 설정 | dispExtravarAdminConfig-keo2ge.json | 확장 변수 자체는 `boards/[mid]/extra-keys` 에 있으나(`admin.contentExtraKey.*`) 전역 설정 화면은 없음 | 격차 | 필드 `skin`(확장 변수 입력 스킨) 하나. 스킨 개념의 대응이 없음 |
| `dispImporterAdminImportForm` | 데이터 들여오기 | dispImporterAdminImportForm-r7ci56.json | `apps/web/app/admin/settings/import/page.tsx` + `ImportForm.tsx` (rhymix-ts 자체 번들 형식, 스키마 `packages/admin/src/export/bundle-schema.ts`) | 격차 | 레거시는 XE/XML 파일 가져오기: `type`, `unit_count`, `xml_file`, `target_module`, `guestbook_target_module`, `user_id`, `isSync`(회원 동기화). rhymix-ts 는 자체 형식의 내보내기·가져오기라 XML 가져오기는 없음 (`ImportForm.tsx` 에 xml 언급 0건) |
| `dispIntegration_searchAdminContent` | 통합검색 설정 | dispIntegration_searchAdminContent-1bwyqzt.json | 관리자 화면 없음 (`grep -rliE "integration.?search"` 결과 0건) | 격차 | 필드 `skin`, `mskin`, `block_robots`, `target_types[]`, `target`, `target_module_srl`(검색 대상 모듈). 공개 검색 자체는 별도 존재하나 관리자 설정이 없음 |
| `dispIntegration_searchAdminSkinInfo` | 통합검색 스킨 설정 | dispIntegration_searchAdminSkinInfo-12kdi57.json | 없음 | 격차 | 스킨 변수 폼. 필드 없음(스킨 변수는 동적) |
| `dispKrzipAdminConfig` | 한국 우편번호 | dispKrzipAdminConfig-gf7lpf.json | 없음 (`grep -rliE "krzip/zipcode/postcode"` 결과 0건) | 격차 | `api_handler`, `epostapi_regkey`(우체국 API 키). 회원 가입 폼의 주소 검색 연동 설정 |
| `dispLayoutAdminInstalledList` | 설치된 레이아웃 | dispLayoutAdminInstalledList-1mi6uz5.json | `apps/web/app/admin/site/layouts/page.tsx` + `admin.layout.list` (`routers/admin/layout.ts:21`) | 대응 있음 | 폼 필드 없음(목록) |
| `dispLayoutAdminInstanceList` | 레이아웃 인스턴스 목록·생성 | dispLayoutAdminInstanceList-128ccn3.json | `apps/web/app/admin/site/layouts/instances/page.tsx` + `actions.ts:18` → `admin.layout.listInstances/createInstance` (`layout.ts:46/75`) | 대응 있음 | 레거시 필드 `layout`, `_layout_type`(PC/모바일), `title`. rhymix-ts 는 `themeId`, `scope`, `refId`, `layoutName` |
| `dispLayoutAdminAllInstanceList` | 전체 레이아웃 인스턴스 | dispLayoutAdminAllInstanceList-17sns8l.json | 위 인스턴스 목록과 동일 화면 | 대응 있음 | PC/모바일 구분 보기가 따로 있는지는 확인하지 않음 |
| `dispLayoutAdminCopyLayout` | 레이아웃 복사 | dispLayoutAdminCopyLayout-65o1jp.json | `instances/actions.ts:36` → `admin.layout.duplicateInstance` (`layout.ts:149`) | 대응 있음 | 레거시 필드 `layout`, `layout_srl`, `title[]`(다국어 제목). rhymix-ts 는 `instanceId`, `newRefId` |
| `dispLayoutAdminModify` | 레이아웃 설정 | dispLayoutAdminModify-16xs211.json | `apps/web/app/admin/site/layouts/[id]/page.tsx` + `_components/LayoutVariablesForm.tsx` + `admin.layout.getInstance/updateInstanceVariables/preview` (`layout.ts:59/100/119`) | 대응 있음 | 없는 필드: `name`(레이아웃 이름), `img`(배경 이미지), `is_sitemap`(메뉴 연결). 레이아웃 변수 편집은 있음 |
| `dispLayoutAdminInsert` (보충) | 레이아웃 인스턴스 추가 폼 | dispLayoutAdminInsert-19j9wb5.json | 인스턴스 생성(`createInstance`)과 동일 | 대응 있음 | 레거시 파라미터 `layout=default`, `type=P`. 폼 필드 없음 |
| `dispLayoutAdminEdit` (보충) | 레이아웃 코드 편집 | dispLayoutAdminEdit-16z4uyd.json | 없음 | 의도적 제외 후보 | **레거시가 폐기한 기능**. 화면 본문 "레이아웃 편집 기능은 더이상 제공하지 않습니다. 이미 편집된 레이아웃에 한하여 편집을 허용하나, 추후 완전히 제거될 수 있습니다." (`modules/layout/layout.admin.view.php:234`, 소스 `:232-235` 가 `layout_editing_deprecated_p1` 오류 반환) |
| `dispLayoutAdminLayoutModify` (보충) | 레이아웃 비주얼 편집(FaceOff) | dispLayoutAdminLayoutModify-4ildyz.json | 없음 | 의도적 제외 후보 | **레거시 결함**: "Template not found: modules/layout/tpl/about_faceoff.html". 소스 `layout.admin.view.php:390` 이 `about_faceoff` 템플릿을 컴파일하나 `modules/layout/tpl/about_faceoff.html` 파일이 없음(`ls` 로 확인). FaceOff 편집기 자체가 레거시에서 제거된 잔재 |
| `dispMessageAdminConfig` | 오류 메시지 화면 설정 | dispMessageAdminConfig-axx0wm.json | 없음 (`grep -rliE "message.?skin/errorSkin/messageConfig"` 결과 0건) | 격차 | 필드 `skin`, `mskin`(오류 표시 스킨). rhymix-ts 에 오류 화면 스킨 선택 개념 없음 |
| `dispModuleAdminContent` | 설치된 모듈 목록 | dispModuleAdminContent-17nb7he.json | `apps/web/app/admin/modules/page.tsx` + `admin.module.list` (`routers/admin/module.ts:66`) | 대응 있음 | 레거시는 설치된 모듈 종류 목록, rhymix-ts 는 모듈 인스턴스 목록. 모듈 종류(설치형) 목록 화면은 없음 |
| `dispModuleAdminLangcode` | 다국어 코드 관리 | dispModuleAdminLangcode-1l7e3ma.json | 없음 (`grep -rliE "langcode/lang_code"` 는 확장 변수 파일 2개만, 다국어 관리 화면 아님) | 격차 | `lang_code`, `search_keyword`(다국어 문자열 검색·수정) |
| `dispRssAdminIndex` | RSS 설정 | dispRssAdminIndex-1kgo56x.json | 게시판별: `apps/web/app/admin/boards/[mid]/feed/page.tsx` (`Board.feedConfig`, 항목 수·요약 길이·설명·이미지·저작권) | 대응 있음 | 없는 필드: 사이트 전체 피드 `use_total_feed`, `feed_title`, `feed_description`, `image`, `feed_copyright`, `feed_document_count`, 모듈별 `open_rss`/`open_total_feed` 공개 선택. 게시판 단위만 있음 |
| `dispSessionAdminIndex` | 세션 관리 | dispSessionAdminIndex-1mmaidp.json | 없음 (`grep -rliE session` 의 관리자 파일은 `layout.tsx`·`2fa/enroll` 뿐, 세션 목록·종료 화면 아님) | 격차 | 레거시 폼 필드 없음(세션 정리 버튼 계열). 설정 쪽 `sessionLifetime` 은 005 보안 설정 행 소관 |
| `dispWidgetAdminDownloadedList` | 설치된 위젯 | dispWidgetAdminDownloadedList-sthhl0.json | `apps/web/app/admin/widgets/page.tsx` (등록 위젯·프리셋 목록, `widget.listPresets` `routers/admin/widget.ts:66`) | 대응 있음 | 폼 필드 없음(목록) |
| `dispWidgetAdminGenerateCode` | 위젯 코드 생성 | dispWidgetAdminGenerateCode-14v46fj.json | `apps/web/app/admin/widgets/generator/page.tsx` (`generateToken` 이 `<rx-widget name="…" />` 생성, 프리셋 저장 `widget.savePreset` `widget.ts:25`) | 대응 있음 | 없는 필드: `skin`, `colorset`, `widget_cache`, `widget_cache_unit`(캐시 시간). rhymix-ts 는 속성을 JSON 으로 받음 |
| `dispWidgetAdminAddContent` (보충) | 내용 직접 추가 위젯 | dispWidgetAdminAddContent-1vitqex.json | `apps/web/app/admin/widgets/instances/new`, `instances/[id]/edit` (필드 `label`, `widgetName`, `propsJson`만 확인) | 격차 | 레거시 필드 `content`, `module_srl`, `document_srl`, `style`, `widget_padding_*`(4), `Filedata`(파일 업로드), `use_editor`, `use_html`. rhymix-ts 에 에디터·패딩·파일 첨부가 있는 직접 내용 위젯 폼은 확인되지 않음 |
| `dispModuleAdminInfo` (보충) | 모듈 정보 | dispModuleAdminInfo-1u1m4wo.json | `apps/web/app/admin/modules/[id]/page.tsx` (설정·권한·분류 상세, REQ-ADMIN2-146) | 대응 있음 | 레거시는 모듈 종류의 제작자·버전·등록일·설명 표시(예: board 설명 "게시판의 기능을 담당…"). rhymix-ts 는 인스턴스 설정 상세라 항목이 다름 |
| `dispModuleAdminModuleSetup` (보충) | 모듈 일괄 기본 설정 | dispModuleAdminModuleSetup-rl14bw.json | 없음. `admin.module.bulk` 는 `enable/disable/delete` 만 (`module.ts:239`) | 격차 | `module_srls`, `module_category_srl`, `layout_srl`, `skin`, `header_text`, `footer_text`, `description` 일괄 변경 |
| `dispModuleAdminModuleAdditionSetup` (보충) | 모듈 일괄 추가 설정 | dispModuleAdminModuleAdditionSetup-sstd1k.json | 없음 | 격차 | 레거시 본문은 "일괄 추가 설정" 제목뿐이고 폼 필드 없음(추가 설정을 제공하는 다른 모듈의 항목이 나타나는 자리) |
| `dispModuleAdminModuleGrantSetup` (보충) | 모듈 일괄 권한 설정 | dispModuleAdminModuleGrantSetup-ewqg8y.json | 단건 권한만: `admin.module.update` 의 `grant` (`module.ts:166`) + 게시판 `boards/[mid]/permissions` | 격차 | **레거시 결함**: TypeError `count(): Argument #1 ($value) must be of type Countable/array, stdClass given` (`modules/module/module.admin.view.php:234`, 소스 `if(count($source_grant_list))`). 기능 자체(여러 모듈에 권한 일괄 적용)는 유효하나 레거시 구현이 PHP 8 에서 깨져 있음. 일괄 적용은 rhymix-ts 에 없음. 레거시 소스 줄은 moai 메모의 233 이 아니라 234 |
| `dispPageAdminContentModify` (보충) | 페이지 내용 편집 | dispPageAdminContentModify-lby5pd.json | `apps/web/app/admin/pages/[instanceId]/edit/page.tsx` + `_components/PageEditForm.tsx` + `actions.ts` (PC 본문 `mcontent`, 저장 `savePageAction`) | 대응 있음 | 레거시는 위젯 배치형 편집기. 없는 필드: `widget_list`, `css_class`, `widget_align`, `width`, `height`, margin·padding·border 계열 약 24개 |
| `dispPageAdminMobileContent` (보충) | 모바일 페이지 보기 | dispPageAdminMobileContent-1cgmipx.json | 같은 편집 화면의 모바일 본문 (`mcontentMobile`, `saveMobilePageAction`) | 대응 있음 | 레거시 폼은 로그인 필드(`user_id`,`password`,`keep_signed`)만 노출되는 미리보기 |
| `dispPageAdminMobileContentModify` (보충) | 모바일 페이지 내용 편집 | dispPageAdminMobileContentModify-ycb04f.json | 위와 동일 | 대응 있음 | `dispPageAdminContentModify` 와 같은 위젯·스타일 필드 격차, 추가로 `type` |
| `dispPageAdminDelete` (보충) | 페이지 삭제 확인 | dispPageAdminDelete-1uf6h5t.json | `DeleteModuleButton`(`apps/web/components/admin/`) + `admin.module.delete` (`module.ts:209`) | 대응 있음 | 레거시는 "페이지를 삭제할 때 파일도 함께 삭제합니다" 안내와 모듈 이름 표시. 파일 동반 삭제 선택 옵션은 확인하지 못함 |

### 1.1 집계

| 판정 | 행 수 |
|---|---:|
| 대응 있음 | 17 |
| 격차 | 15 |
| 의도적 제외 후보 | 4 |
| 합계 | 36 |

(§3.2 `awk` 로 재집계한 값: 17 / 15 / 4, 합계 36 = 고급 22행(태그 제외) + 보충 14행, 빈 판정 0.)

### 1.2 참조 행 (판정표에 넣지 않음)

- `dispTagAdminConfig` (고급 그룹): 003 판정표 참조 (격차: 구분자 설정 화면 없음).
- `dispAdminCleanupList`, `dispAdminViewServerEnv` (공통 헤더/푸터): 005 판정표 참조 (둘 다 대응 있음).
- `dispMemberAdminInfo` (공통, 회원 목록): 회원 영역 소관.

### 1.3 rhymix-ts 에만 있는 화면 (참고)

- `/admin/logs` 관리자 로그 (`admin.log.list`, `routers/admin/log.ts:23`), `/admin/system`, `/admin/system/cache` — 레거시 '고급' 그룹에 대응 act 가 없음

## 2. 요약

- 17행 대응 있음, 15행 격차, 4행 의도적 제외 후보 (36행). 숫자는 §3.2 `awk` 재집계값.
- 레거시 결함 화면 2건은 모두 판정했다: `dispModuleAdminModuleGrantSetup`(레거시 TypeError, 단 기능 자체는 유효해 격차), `dispLayoutAdminLayoutModify`(템플릿 파일 없음, 제외 후보).
- 의도적 제외 후보: 쉬운 설치 2행(근거 문서 없음, moai 확인 필요), 레이아웃 코드 편집(레거시 폐기), 레이아웃 FaceOff(레거시 결함).
- 격차가 몰린 곳: 애드온 개별 설정·PC/모바일 분리, 모듈 일괄 설정·권한, 통합검색·우편번호·오류 화면 스킨·다국어 코드, 세션 관리, XML 가져오기, 커뮤니케이션 설정의 세부 필드.

## 3. 판정 근거 명령과 실제 출력 요약

모두 `/mnt/d/project/rhymix-ts` 에서 읽기 전용으로 실행. 레거시 소스는 `/mnt/d/project/rhymix` 의 파일 3개를 읽기만 했다.

1. 대상 행 추출: `awk -F'|' '$4 ~ /고급/ ...' coverage.md` → 고급 23행(addon 2, autoinstall 1, communication 1, counter 1, extravar 1, importer 1, integration_search 2, krzip 1, layout 5, message 1, module 2, rss 1, session 1, tag 1, widget 2). 보충 14행(addon 1, autoinstall 1, layout 3, module 4, page 4, widget 1), 공통 3행
2. 레거시 폼 필드: `pages/<act>-*.json` 의 `forms[].fields[].name` (즐겨찾기 토글 폼·csrf 제외)
3. 레거시 결함 확인
   - `sed -n 230,236p /mnt/d/project/rhymix/modules/module/module.admin.view.php` → 234행 `if(count($source_grant_list))`. `$source_grant_list` 가 `stdClass` 일 때 `count()` TypeError (coverage.md 207행의 오류 문구와 일치)
   - `ls modules/layout/tpl/about_faceoff.html` → `No such file or directory`. `grep -rn about_faceoff modules/layout/*.php` → `layout.admin.view.php:390` 가 컴파일 시도
   - `sed -n 232,236p modules/layout/layout.admin.view.php` → `layout_editing_deprecated_p1` 오류
4. rhymix-ts 화면·라우트: `find apps/web/app/admin/{addons,widgets,site/layouts,logs,stats,system} -name page.tsx`
5. 라우터 줄 번호: `grep -n "^  [a-zA-Z]*: \(protectedAdminProcedure/router\)" routers/admin/{widget,layout,log,stats,system,cache}.ts` → layout.ts 21/46/59/75/100/119/149, stats.ts 30/46/62/79/97/127, widget.ts 25/66/83
6. 애드온: `grep -n "export async function" addons/actions.ts` → `toggleAddonAction`(17), `reorderAddonAction`(43) 두 개뿐
7. 레이아웃 UI 호출 확인: `grep -rn "duplicateInstance/createInstance/updateInstanceVariables" apps/web/app` → `instances/actions.ts:18,36`, `LayoutVariablesForm.tsx:24`
8. 부재 확인(`grep -rliE`, apps/web/app/admin + routers/admin + packages/admin/src, 테스트 제외): `autoinstall|marketplace`, `krzip|zipcode|postcode`, `integration.?search|IntegrationSearch`, `message.?skin|errorSkin|messageConfig` 모두 출력 없음. `langcode|lang_code` 는 `extra-keys/page.tsx`, `content-extra-key.ts` 만(다국어 관리 아님). `session` 은 `layout.tsx`, `layout-actions.ts`, `2fa/enroll/*` 뿐
9. 위젯 폼: `grep -rhoE '(name|htmlFor)="..."' widgets/instances` → `label`, `propsJson`, `widgetName` 3개
10. 가져오기: `grep -n "xml/XE" -i settings/import/ImportForm.tsx` → 0건. `ls packages/admin/src/export` → `bundle-schema.ts`, `serializer.ts`
11. 레거시 화면은 열지 않았다. 레거시 화면 비교는 `pages/*.json` 과 `coverage.md` 보충 방문 결과만 사용했다.

### 3.1 한계 (미검증)

- 화면을 브라우저로 열어 확인하지 않았다. "대응 있음"은 소스의 파일·프로시저·폼 필드 존재 기준이다.
- 확인하지 않은 것: 접속통계의 날짜 선택 UI, 레이아웃 PC/모바일 구분 보기, 위젯 인스턴스 폼의 직접 내용(에디터) 입력 여부, 페이지 삭제 시 파일 동반 삭제 옵션, 애드온 목록의 상세 정보 표시.
- 세션 관리 레거시 화면은 폼 필드가 없어 기능(목록·종료 여부)을 JSON 만으로는 확정하지 못했다.
- 쉬운 설치 2행의 "의도적 제외 후보"는 근거 문서가 없는 추정이다.

### 3.2 재집계

```bash
awk -F'|' '/^/ `disp/{gsub(/^ +| +$/,"",$6); c[$6]++; n++} END{for(k in c) print k, c[k]; print "total", n}' .moai/state/collab/lgp-006-advanced-draft.md
```

## 방문자 쪽 잔여 화면 (규약 v0.2.0 배정)

- 규약 v0.2.0 이 006 에 배정한 방문자 쪽 잔여 15 act. 위 §1~§3 의 표·집계는 건드리지 않았고 이 절에 자체 집계를 둔다.
- 입력: `.moai/reports/legacy-front-map/pages/<act>-{guest,admin}.json` (`permission`, `excerpt`, `forms`). 레거시 화면은 열지 않았다.
- 판정 기준은 위와 같다. 비회원·관리자 두 신분의 본문 차이는 비고에 적었다.
- 읽는 법: 인자 없이 직접 호출된 act 는 레거시가 사이트 첫 화면(`CREATE A GOOD DESIGN…` 홈페이지 본문)을 그대로 보여 주는 경우가 많다. 이런 행은 근거 JSON 으로는 화면 내용을 확인할 수 없어 기능 이름과 소스로 판정했다.

| 레거시 act | 화면 제목 (권한) | 근거 파일 | rhymix-ts 대응 | 판정 | 비고 |
|---|---|---|---|---|---|
| `dispKrzipSearchForm` | 우편번호 검색 폼 (권한 없음) | dispKrzipSearchForm-{guest,admin}.json | 없음 (`grep -rliE "krzip/zipcode/postcode"` 결과 0건) | 의도적 제외 후보 | **레거시 결함**: 두 신분 모두 "Template not found: modules/krzip/tpl/searchForm.daumapi.html". 관리자 쪽 `dispKrzipAdminConfig` 는 위 §1 에서 격차로 판정 — 연동 설정이 없으므로 이 팝업도 없다. 제외 근거 문서는 찾지 못함 — moai 확인 필요 |
| `dispLayoutPreviewWithModule` | 모듈 포함 레이아웃 미리보기 (root) | dispLayoutPreviewWithModule-{guest,admin}.json | `admin.layout.preview` (`apps/web/server/api/routers/admin/layout.ts:119`) + `apps/web/app/admin/site/layouts/[id]/page.tsx` | 대응 있음 | 레거시는 두 신분 모두 홈 본문을 그대로 출력(미리보기 대상 파라미터 없이 열림). 관리자 신분 본문에만 관리자 메뉴 줄(관리·회원정보 보기 등)이 붙음. 방문자 화면이 아니라 관리자 미리보기라 rhymix-ts 도 관리자 쪽에 있음 |
| `dispMenuMenu` | 메뉴 조각 (권한 없음) | dispMenuMenu-{guest,admin}.json | `apps/web/components/layout/GlobalHeader.tsx`, `FooterMenuSlot.tsx` (사이트 메뉴 렌더링), 관리: `admin.menu.list` | 대응 있음 | 레거시는 `menu_srl` 없이 열려 홈 본문을 출력(폼 없음). 메뉴를 단독 화면으로 열 수는 없고 레이아웃 안에서 렌더링되는 구조 |
| `dispMessage` | 시스템 메시지 화면 (권한 없음) | dispMessage-{guest,admin}.json | 전용 화면 없음. 오류는 Next.js 기본 404/오류 화면(`apps/web/app` 아래 `not-found.tsx`·`error.tsx` 0개), 사이트 잠금은 `apps/web/proxy.ts` 의 503 처리 | 격차 | 레거시는 두 신분 모두 홈 본문(메시지 파라미터 없음). 이 화면은 사이트 잠금·오류 알림을 레거시 스킨으로 보여 주는 용도. 관리자 쪽 `dispMessageAdminConfig`(오류 표시 스킨)가 §1 에서 격차라 같은 맥락 |
| `dispModuleChangeLang` | 언어 변경 (권한 없음) | dispModuleChangeLang-{guest,admin}.json | 없음. 방문자 언어 전환 UI·액션 grep 0건(`changeLang/setLocale/LanguageSwitch/NEXT_LOCALE`). 관리자 설정에 지원 언어·기본 언어(`settings/advanced`)만 있음 | 격차 | 레거시는 두 신분 모두 홈 본문(언어 코드 파라미터 없이 열림). 방문자가 사이트 언어를 바꾸는 동작이 rhymix-ts 에 없음 |
| `dispModuleFileBox` | 파일박스 목록 (root) | dispModuleFileBox-{guest,admin}.json | 없음 (005 `dispModuleAdminFileBox` 와 같은 기능, `grep -rliE filebox` 0건) | 격차 | 두 신분 모두 홈 본문만 보임(root 권한이라 관리자 신분으로도 비로그인 상태에선 차단된 것으로 추정 — 로그인 상태로 수집된 `admin` 본문도 홈 화면이라 파일박스 목록 자체는 확인하지 못함) |
| `dispModuleFileBoxAdd` | 파일박스 파일 추가 (root) | dispModuleFileBoxAdd-{guest,admin}.json | 없음 | 격차 | 레거시 관리자 폼: `filter`, `input`, `comment`, `addfile`. 본문 "파일박스 설명 파일". 비회원은 홈 본문 |
| `dispModuleSelectList` | 모듈 선택 팝업 (all-managers) | dispModuleSelectList-{guest,admin}.json | 없음. rhymix-ts 는 모듈 선택을 관리자 폼의 select 로 처리(`apps/web/app/admin/modules`) | 의도적 제외 후보 | **레거시 결함**: 관리자 신분에서 TypeError `escape_js(): Argument #1 ($str) must be of type string, null given` (`modules/module/tpl/module_selector.html` 34행, `common/functions.php` 225행). 비회원은 홈 본문(권한 없음). 팝업 방식 선택기 자체가 레거시 결함이고 관리자 UI 가 다른 방식이라 제외 후보 |
| `dispModuleSkinInfo` | 모듈 스킨 정보 (all-managers) | dispModuleSkinInfo-{guest,admin}.json | 없음 (스킨 변수 화면 없음 — §1 `dispBoardAdminSkinInfo`·`dispPageAdminSkinInfo` 와 같은 격차) | 격차 | 두 신분 모두 홈 본문(스킨 파라미터 없이 열림). 스킨별 변수 폼을 띄우는 화면 |
| `dispPageIndex` | 페이지 모듈 보기 (권한 없음) | dispPageIndex-{guest,admin}.json | `apps/web/app/[mid]/page.tsx` 가 모듈 정의(`getModuleDefinition(...).routes.index`, `:96-101`)로 위임 → `packages/page/src/module.ts` + `components/PageBody.tsx` | 대응 있음 | 레거시는 두 신분 모두 홈 본문(대상 mid 없이 열려 사이트 첫 화면). 페이지 본문 출력 기능은 rhymix-ts 에 있음 |
| `dispPageNotFound` | 페이지 없음 (권한 없음) | dispPageNotFound-{guest,admin}.json | `notFound()` 호출(`apps/web/app/[mid]/page.tsx:92-94` 등) → Next.js 기본 404 | 대응 있음 | 레거시는 두 신분 모두 홈 본문(별도 오류 문구 없음). rhymix-ts 는 커스텀 404 화면(`not-found.tsx`)이 없어 기본 404 가 나옴 |
| `dispWidgetGenerateCode` | 위젯 코드 생성 (root) | dispWidgetGenerateCode-{guest,admin}.json | `apps/web/app/admin/widgets/generator/page.tsx` (`generateToken` 이 `<rx-widget name="…" />` 생성) + `apps/web/lib/widgets/renderer.tsx`(렌더러) | 대응 있음 | 레거시 관리자 폼(Content 위젯): `selected_widget`, `skin`, `colorset`, `widget_cache`, `widget_cache_unit`, `content_type`, `module_srls`, `list_type`, `tab_type`, `markup_type`, `list_count`, `cols_list_count`, `page_count`, `subject_cut_size`, `content_cut_size` 등. 없는 것: 스킨·컬러셋·캐시·추출 대상 등 위젯별 폼 필드(rhymix-ts 는 JSON 속성). 내장 위젯은 `apps/web/lib/widgets/builtins/hello-widget.tsx` 하나만 확인했고 Content 위젯 대응은 확인하지 못함. 비회원은 홈 본문 |
| `dispWidgetGenerateCodeInPage` | 페이지에 위젯 추가 (all-managers) | dispWidgetGenerateCodeInPage-{guest,admin}.json | 없음. 페이지 편집 폼(`pages/[instanceId]/edit/_components/PageEditForm.tsx`)에 위젯 삽입 UI 없음 | 격차 | 레거시 관리자 폼: `module_srl`, `widget_sequence`, `style`, `widget_padding_left/right/top/bottom`, `selected_widget`, `skin`, `colorset`, `widget_cache(_unit)`, `content_type`, `module_srls`. 본문 "Content 위젯 코드생성 … 추가 버튼을 누르면 페이지 내에 위젯이 삽입됩니다." 위젯 생성기는 별도 화면으로만 있음. 비회원은 홈 본문 |
| `dispWidgetInfo` | 위젯 정보 (all-managers) | dispWidgetInfo-{guest,admin}.json | 없음 (`apps/web/app/admin/widgets/page.tsx` 는 레이블·등록 상태·작업 열만 표시) | 격차 | 레거시 관리자 본문: "위젯 / 위젯 제작자 / 제목 / ver / 작성자 / 등록일"(위젯 메타 정보). 비회원은 홈 본문 |
| `dispWidgetStyleGenerateCodeInPage` | 위젯 스타일 선택 (all-managers) | dispWidgetStyleGenerateCodeInPage-{guest,admin}.json | 스타일 정의만 `packages/core/src/theme/widget-style.ts` 에 있고 선택 UI 없음 | 격차 | 레거시 관리자 폼: `module_srl`, `widget_sequence`, `style`, `widget_padding_*`, `widgetstyle`(심플/스트롱), `selected_widget`. 본문 "위젯스타일 심플 스트롱". 비회원은 홈 본문 |

### 방문자 쪽 잔여 15행 집계

| 판정 | 행 수 |
|---|---:|
| 대응 있음 | 5 |
| 격차 | 8 |
| 의도적 제외 후보 | 2 |
| 합계 | 15 |

재집계 명령 (이 절만 센다):

```bash
sed -n '/^## 방문자 쪽 잔여 화면/,$p' .moai/state/collab/lgp-006-advanced-draft.md | awk -F'|' '/^\| `disp/{gsub(/^ +| +$/,"",$6); c[$6]++; n++} END{for(k in c) print k, c[k]; print "total", n}'
```

### 방문자 쪽 잔여 화면 근거 명령과 한계

1. 근거 JSON: `python3 -I` 로 `pages/<act>-{guest,admin}.json` 의 `permission`, `excerpt`, `forms[].fields[].name` 읽기(공통 로그인·검색 필드 제외). 15 act 모두 두 신분 파일이 있음
2. 부재 확인 (`grep -rliE`, 테스트 제외): 언어 전환 `changeLang|setLocale|LanguageSwitch|LocaleSwitch|NEXT_LOCALE` → 출력 없음, `filebox` → 출력 없음(005 와 동일), `krzip|zipcode|postcode` → 출력 없음
3. 404·오류 화면: `find apps/web/app -name not-found.tsx -o -name error.tsx -o -name global-error.tsx` → 출력 없음. `[mid]/page.tsx:92-101` 에서 `notFound()` 호출과 모듈 정의 위임 확인
4. 위젯: `grep -rliE "rx-widget" apps/web/lib apps/web/components apps/web/app` → `lib/widgets/render.tsx`, `sanitize.ts`, `renderer.tsx`, `app/page.tsx`. `ls apps/web/lib/widgets/builtins` → `hello-widget.tsx`. `grep -rliE "widgetstyle|widget.?style"` → `packages/core/src/theme/{index,widget-style,types}.ts`
5. 한계: 15 act 중 11개는 인자 없이 열려 홈 본문만 수집돼 화면 내용 자체를 근거 JSON 으로 확인하지 못했다. 그 행의 판정은 기능 이름과 rhymix-ts 소스 존재 여부 기준이며, 레거시 기능의 세부 동작은 미확인이다. 화면을 브라우저로 열어 확인하지 않았다
6. 위 §3.2 의 전체 재집계 `awk` 는 이 절의 15행까지 함께 세어 36 → 51 행으로 나온다(기존 표 수치는 변경 없음). 기존 표만 세려면 `sed -n '1,/^## 방문자 쪽 잔여 화면/p'` 로 범위를 제한할 것
