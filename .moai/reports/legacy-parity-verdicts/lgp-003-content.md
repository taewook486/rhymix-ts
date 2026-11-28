# SPEC-LEGACY-PARITY-003 콘텐츠 영역 판정표 (초안)

- 작성: moai2 (읽기 전용 조사, 저장소 파일 무수정)
- 입력: `.moai/reports/legacy-admin-map/coverage.md` 그룹 '콘텐츠' 34 act + 보충 중 board·comment·document·file·poll·trash 10행 + 고급 그룹의 `dispTagAdminConfig` 1행(태그), 같은 폴더 `pages/*.json` 폼 필드
- 대상: `apps/web/app/admin/*`, `apps/web/server/api/routers/admin/*`, `packages/*`
- 판정 기준
  - **대응 있음**: 같은 목적의 화면·동작이 있고, 핵심 폼 필드가 대부분 있음 (필드 누락은 비고에 적음)
  - **격차**: 화면 자체가 없거나, 있어도 레거시 폼 필드 대부분이 없거나 쓰기 경로가 없음
  - **의도적 제외 후보**: 이전 SPEC 결정 또는 레거시 자체 결함으로 구현 대상에서 뺄 근거가 있음 (최종 결정은 moai)
- 행 수: 콘텐츠 34 + 보충 10 + 태그 1 = 45행. 판정 빈칸 0.
- 근거 파일 열은 `pages/` 아래 파일명만 적었다. 경로는 `.moai/reports/legacy-admin-map/pages/`.

## 1. 판정표

| 레거시 act | 화면 제목 | 근거 파일 | rhymix-ts 대응 | 판정 | 비고 (레거시 폼 필드 중 rhymix-ts 에 없는 것) |
|---|---|---|---|---|---|
| `dispBoardAdminContent` | 게시판 목록 + 일괄 설정 | dispBoardAdminContent-1aflwat.json | 목록: `apps/web/app/admin/modules/page.tsx` + `admin.module.list` (`routers/admin/module.ts:66`). 일괄: `admin.module.bulk` (`module.ts:239`, enable/disable/delete 3종만) | 격차 | 목록은 있으나 일괄 설정이 없음. 없는 필드: `module_category_srl`, `layout_srl`, `skin`, `mlayout_srl`, `mskin`, `description`, `header_text`, `footer_text`, 권한 일괄(`list/view/write_document/...`), `search_target`/`search_keyword` 검색 |
| `dispBoardAdminBoardInfo` | 게시판 기본 설정 | dispBoardAdminBoardInfo-1w21m54.json | `apps/web/app/admin/modules/[id]/edit/_components/ModuleEditForm.tsx` (제목·브라우저 제목·설명 3필드). `admin.module.update` (`module.ts:166`)는 layoutId·skin·mobileSkin·menuId 를 받지만 폼이 보내지 않음 | 격차 | 없는 필드: `domain_srl`, `robots_tag`, `meta_keywords`, `meta_description`, `layout_srl`, `skin`, `list_count`, `search_list_count`, `page_count`, `header_text`, `footer_text`, `use_mobile`, `mlayout_srl`, `mskin`, `mobile_*`(5), `list`, `order_target`, `except_notice`, `use_bottom_list`, `skip_bottom`. `Board` 모델에 `listCount`·`pageCount`·`orderTarget`·`exceptNotice` 컬럼이 있으나 `prisma.board.update` 호출처가 feed·permissions 두 곳뿐이라 관리자가 바꿀 경로가 없음 |
| `dispBoardAdminInsertBoard` (보충) | 게시판 생성/수정 폼 | dispBoardAdminInsertBoard-1fhenrl.json | 생성: `apps/web/app/admin/modules/new/page.tsx` + `CreateModuleForm.tsx` + `admin.module.create` (`module.ts:28`; moduleCode·mid·name) | 대응 있음 | 생성 폼 필드는 mid·이름뿐. 수정 필드 격차는 `dispBoardAdminBoardInfo` 행과 동일 |
| `dispBoardAdminDeleteBoard` (보충) | 게시판 삭제 확인 | dispBoardAdminDeleteBoard-1jgtp5r.json | `modules/DeleteModuleButton.tsx` (`apps/web/components/admin/`) + `admin.module.delete` (`module.ts:209`) | 대응 있음 | 레거시는 글 수 표시 후 삭제. rhymix-ts 는 확인 대화상자. 인덱스 모듈 삭제 거부 로직 있음(`module.ts` bulk delete 분기) |
| `dispBoardAdminCategoryInfo` | 게시판 분류 관리 | dispBoardAdminCategoryInfo-1fb73sq.json | `apps/web/app/admin/boards/[mid]/categories/page.tsx` (Server Action 추가·삭제) + `admin.category.create/update/delete` (`routers/admin/category.ts:32/52/73`) | 대응 있음 | 화면은 추가·삭제만 배선(update 는 라우터에만). 없는 필드: `group_srls[]`(그룹 제한), `expand`, `is_default`, `category_color` 외 수정 UI, `hide_category`, `allow_no_category`, 순서 변경 |
| `dispBoardAdminExtraVars` | 게시판 확장 변수 | dispBoardAdminExtraVars-1v4y1hc.json | `apps/web/app/admin/boards/[mid]/extra-keys/page.tsx` + `admin.contentExtraKey.create/update/delete/reorder` (`routers/admin/content-extra-key.ts:73/95/117/130`) | 대응 있음 | 레거시 `var_idx` 기반 편집 폼은 화면에서 추가·삭제만 확인(수정 UI 미확인). 형식·옵션·필수 등은 라우터 스키마(`content-extra-key.ts:44-54`)에 있음 |
| `dispBoardAdminGrantInfo` | 게시판 권한 관리 | dispBoardAdminGrantInfo-fiqnta.json | `apps/web/app/admin/boards/[mid]/permissions/page.tsx` (BOARD_ACTIONS 7종 × 그룹 체크박스, `:19-27`) | 대응 있음 | 없는 항목: `access`(접근), `manager`(관리), `admin_member`/`admin_id`/`admin_scopes[]`(게시판 관리자 지정), 각 항목의 `_default`(로그인/회원/관리자 등 단계 선택). rhymix-ts 는 그룹 id 목록 방식만 지원 |
| `dispBoardAdminSkinInfo` | 게시판 스킨 설정 | dispBoardAdminSkinInfo-1x4wp4p.json | 없음. `module.update` 가 `skin` 문자열만 받고 스킨 변수 저장·화면 없음 | 격차 | 스킨별 변수 폼(`_mode`) 전체 없음 |
| `dispBoardAdminMobileSkinInfo` | 게시판 모바일 스킨 설정 | dispBoardAdminMobileSkinInfo-15ig81n.json | 없음 (`mobileSkin` 문자열 필드만 `module.ts:166` 입력에 존재) | 격차 | `dispBoardAdminSkinInfo` 와 동일 |
| `dispBoardAdminBoardAdditionSetup` | 게시판 추가 설정 | dispBoardAdminBoardAdditionSetup-1nr41qh.json | 없음 | 격차 | `include_modules[]`, `include_days`, `include_notice`(다른 모듈 글을 목록에 포함). 사용 빈도가 낮아 의도적 제외로 돌릴 여지는 있으나 근거 문서가 없어 격차로 둠 |
| `dispCommentAdminList` | 댓글 목록 | dispCommentAdminList-24m8yi.json | `apps/web/app/admin/comments/page.tsx` + `CommentTableClient.tsx` + `admin.comment.listAcrossAllBoards/bulkDelete` (`routers/admin/comment.ts:34/55`) | 대응 있음 | 있는 필터: 게시판·공개/비밀·작성자 ID·검색어. 없는 것: `search_target` 선택(내용/작성자/IP 등), `will_publish`(승인), `is_trash`, 신고 알림 `message_content`, `deny_authors`/`deny_ips`(작성자·IP 차단) |
| `dispCommentAdminDeclared` | 신고된 댓글 | dispCommentAdminDeclared-16cef2e.json | `apps/web/app/admin/comments/declared/page.tsx` + `ReportedCommentsTable.tsx` + `admin.moderation.reports` (`routers/admin/moderation.ts:29`) | 대응 있음 | 없는 것: `is_trash` 필터, 신고 취소·`message_content` 알림. 신고 사유 열은 있음(`ReportedCommentsTable.tsx:94`) |
| `dispCommentAdminDeclaredLogByCommentSrl` (보충) | 댓글 신고 로그 | dispCommentAdminDeclaredLogByCommentSrl-z5yhf.json | 신고 목록에서 최신 신고 사유 1건만 표시 (`ReportedCommentsTable.tsx:94`). 댓글별 신고자·사유·날짜 전체 로그 화면 없음 | 격차 | 레거시 열: 신고자·신고 이유·날짜. `moderation.reports` 가 최신 1건만 노출 |
| `dispDocumentAdminList` | 문서 목록 | dispDocumentAdminList-1nfy2rd.json | `apps/web/app/admin/documents/page.tsx` + `DocumentTableClient.tsx` + `admin.document.listAcrossAllBoards/bulkUpdate/recoverTemp/deleteTemp` (`routers/admin/document.ts:150/172/210/260`) | 대응 있음 | 있는 것: 게시판·작성자 ID·상태·검색·IP 필터, 일괄 휴지통/삭제/이동/상태, TEMP 복구·삭제, cursor 페이징. 없는 것: `search_target` 선택, `send_message`/`message_content`(작성자 통지), `deny_authors`/`deny_ips` |
| `dispDocumentAdminConfig` | 문서 기본 설정 | dispDocumentAdminConfig-hf4g6i.json | `apps/web/app/admin/documents/config/page.tsx` + `DocumentConfigForm.tsx` + `admin.document.getConfig/updateConfig` (`document.ts:309/326`) | 격차 | 화면은 있으나 필드가 서로 겹치지 않음. 레거시: `view_count_option`, `icons`, `micons`, `search_division`. rhymix-ts: `allowGuestWrite`, `pageSize`, `sortOrder`(레거시에 없는 필드) |
| `dispDocumentAdminDeclared` | 신고된 문서 | dispDocumentAdminDeclared-1vfuw2q.json | `apps/web/app/admin/documents/declared/page.tsx` + `ReportedDocumentsTable.tsx` + `admin.moderation.reports` | 대응 있음 | 없는 것: `cart`(일괄), `type`, `prevent_redeclare`(신고 초기화), `message_content` |
| `dispDocumentAdminAlias` (보충) | 문서 별칭 | dispDocumentAdminAlias-1fkritz.json | 라우터만: `admin.document.listAliases/setAlias` (`document.ts:351/392`). 호출하는 화면 없음 (`grep listAliases apps packages` 결과 router 와 테스트 파일뿐) | 격차 | `alias_title` 입력 화면 없음. 백엔드는 준비됨 |
| `dispDocumentAdminDeclaredLogByDocumentSrl` (보충) | 문서 신고 로그 | dispDocumentAdminDeclaredLogByDocumentSrl-1tdq51u.json | 댓글과 동일: 최신 신고 사유 1건만 표시 (`ReportedDocumentsTable.tsx:92`) | 격차 | 신고자·사유·날짜 전체 로그 화면 없음 |
| `dispDocumentAdminTrashList` (보충) | 문서 휴지통 | dispDocumentAdminTrashList-17al4jy.json | `apps/web/app/admin/trash/page.tsx` + `TrashClient.tsx` (문서/댓글 탭) + `admin.trash.list/restore/purge/empty` (`routers/admin/trash.ts:50/68/90/166`) | 대응 있음 | 레거시 열(옮긴 사람·삭제 날짜·IP·설명)과 복원은 있음. 레거시 `target_srl` 일괄 처리는 확인 못함 |
| `dispTrashAdminList` | 휴지통 목록 | dispTrashAdminList-n5hstd.json | 위와 동일 (`/admin/trash`, 문서 + 댓글 `listComments/restoreComment/purgeComment` `trash.ts:106/123/142`) | 대응 있음 | 없는 필드: `is_all`, `is_type`, `module_srl`(게시판 필터), `search_target`/`search_keyword`, `origin_module`. 타입 탭(전체/문서/댓글)만 있음 |
| `dispTrashAdminView` (보충) | 휴지통 항목 보기 | dispTrashAdminView-n5o6co.json | 없음 | 의도적 제외 후보 | 레거시 자체가 서버 오류(`trash.admin.view.php:106` `getTrashSrl() on null`)를 내는 화면. 파라미터 없이는 열리지 않음 |
| `dispEditorAdminIndex` | 에디터 기본 설정 | dispEditorAdminIndex-g3jlo.json | 없음. 본문 에디터는 Tiptap (`packages/board/src/components/TiptapEditor.tsx`) | 의도적 제외 후보 | 근거: `.moai/specs/SPEC-CONTENT-PARITY-001/spec.md:71-73,126` — SPEC-MODULE-BACKLOG-001 triage 에서 레거시 editor 모듈 DROP 판정(Tiptap 대체). 필드(`editor_skin`, `editor_colorset`, `editor_height`, `editor_toolbar` 등)는 대응 개념 없음 |
| `dispEditorAdminSetupComponent` | 에디터 컴포넌트 설정 | dispEditorAdminSetupComponent-122cq8u.json | 없음 | 의도적 제외 후보 | 위와 동일 사유. `component_name`, `target_group[]` |
| `dispFileAdminList` | 파일 목록 | dispFileAdminList-xn826d.json | `apps/web/app/admin/files/page.tsx` + `FileManagementClient.tsx` + `admin.file.list/bulkDelete` (`routers/admin/file.ts:33/71`) | 대응 있음 | 있는 것: 검색·타입 필터·정렬·일괄 삭제. 없는 것: `module_srl` 필터, `search_target` 선택. 열은 파일명·크기·업로더·첨부 문서·다운로드·등록일 |
| `dispFileAdminEdit` (보충) | 파일 정보 수정 | dispFileAdminEdit-xn3hbl.json | 없음 | 격차 | 레거시는 파라미터 없이 열면 "잘못된 요청입니다"(`file.admin.view.php:212`)라 폼 필드 조사 불가. 개별 파일 편집 화면 자체는 rhymix-ts 에 없음 |
| `dispFileAdminUploadConfig` | 파일 업로드 설정 | dispFileAdminUploadConfig-1ivspvu.json | `apps/web/app/admin/files/settings/page.tsx` + `FileSettingsForm.tsx` + `admin.file.getUploadSettings/updateUploadSettings` (`file.ts:143/151`) | 대응 있음 | 있는 필드: 허용 확장자·최대 크기·글당 첨부 수·리사이즈 너비/높이. 없는 필드: `allowed_attach_size`(글당 총 용량), `pre_conversion_filesize`, `image_autoconv[bmp/jpg/png/webp/avif/heic]`, `max_image_size_action`, `max_image_size_same_format`, `max_image_size_admin`, `image_quality_adjustment`, `image_autorotate`, `image_remove_exif_data` |
| `dispFileAdminDownloadConfig` | 파일 다운로드 설정 | dispFileAdminDownloadConfig-1nbdrpt.json | 같은 폼 + `admin.file.getDownloadSettings/updateDownloadSettings` (`file.ts:166/174`) | 대응 있음 | 있는 필드: 다운로드 권한·핫링크 차단·포인트 차감. 없는 필드: `allow_outlink_format`, `allow_outlink_site`, `allow_multimedia_direct_download`, `download_short_url`, `inline_download_format[]`, `allow_indexing_format` |
| `dispFileAdminOtherConfig` | 파일 기타 설정 | dispFileAdminOtherConfig-fb7k8b.json | 같은 폼 + `admin.file.getOtherSettings/updateOtherSettings` (`file.ts:188/197`) | 격차 | 레거시 필드는 `save_changelog` 하나. rhymix-ts 의 기타 설정은 `thumbnailGenerationStrategy`·`storagePathStrategy`로 의미가 다름 |
| `dispPollAdminList` | 설문 목록 | dispPollAdminList-1a7m1pe.json | `apps/web/app/admin/polls/page.tsx` + `polls/new`, `polls/[id]/edit`, `admin.poll.list/create/update/delete` (`routers/admin/poll.ts:47/94/148/200`) | 대응 있음 | 없는 것: `search_target`/`search_keyword` 검색 (`polls/page.tsx:32` 는 `list()` 전체 조회) |
| `dispPollAdminConfig` (보충) | 설문 기본 설정 | dispPollAdminConfig-apxzgm.json | `apps/web/app/admin/polls/config/page.tsx` + `PollConfigForm.tsx` + `admin.poll.config` (`poll.ts:259`) | 격차 | 필드가 겹치지 않음. 레거시: `skin`, `colorset`. rhymix-ts: `allowGuestVote`, `duplicateVotePolicy` |
| `dispPollAdminResult` (보충) | 설문 결과 | dispPollAdminResult-ho7vkx.json | `apps/web/app/admin/polls/[id]/results/page.tsx` + `admin.poll.results` (`poll.ts:230`) | 대응 있음 | 레거시는 파라미터 없이 "선택한 설문이 존재하지 않습니다"만 출력되어 필드 비교 불가 |
| `dispSpamfilterAdminDeniedIPList` | 스팸필터 차단 IP | dispSpamfilterAdminDeniedIPList-fogite.json | `apps/web/app/admin/settings/spamfilter/ip/page.tsx` + `DeniedIpForm.tsx` + `admin.spamfilter.deniedIps` (`routers/admin/spamfilter.ts:196`) | 대응 있음 | 없는 필드: `active`(사용 토글), `ipaddress_list`(여러 줄 일괄 등록), 설명 |
| `dispSpamfilterAdminDeniedWordList` | 스팸필터 금지어 | dispSpamfilterAdminDeniedWordList-132sbza.json | `apps/web/app/admin/settings/spamfilter/words/page.tsx` + `DeniedWordsForm.tsx` + `admin.spamfilter.deniedWords` (`spamfilter.ts:110`) | 대응 있음 | 없는 필드: `active`, `word_list`(일괄 등록), `enable_description` |
| `dispSpamfilterAdminConfigBlock` | 스팸필터 차단 설정 | dispSpamfilterAdminConfigBlock-zg8re1.json | `apps/web/app/admin/settings/spamfilter/block/page.tsx` + `RateLimitForm.tsx` + `admin.spamfilter.rateLimit` (`spamfilter.ts:292`) | 대응 있음 | 있는 필드: 동작별 사용·횟수·시간창. 없는 필드: `blocked_actions[]` 다중 선택, `custom_message`, `ipv4_block_range`, `ipv6_block_range`, `except_ip` |
| `dispSpamfilterAdminConfigCaptcha` | 스팸필터 캡차 설정 | dispSpamfilterAdminConfigCaptcha-1ianv6e.json | `apps/web/app/admin/settings/spamfilter/captcha/page.tsx` + `CaptchaForm.tsx` + `admin.spamfilter.captcha` (`spamfilter.ts:33`) | 대응 있음 | 있는 필드: 제공자·사이트 키·시크릿·임계값·트리거. 없는 필드: `captcha_theme`, `captcha_size`, `target_devices[]`, `target_users`, `target_frequency` (`target_actions[]` 는 트리거로 대체 추정) |
| `dispSpamfilterAdminConfigCaptchaTest` | 캡차 동작 테스트 | dispSpamfilterAdminConfigCaptchaTest-198uwqw.json | 없음 (`grep -il captchaTest apps/web/app/admin apps/web/server` 는 `public/captcha.test.ts` 하나, 관리자 화면 아님) | 격차 | 폼 필드는 숨은 필드뿐. 키 설정 후 위젯을 직접 띄워 확인하는 화면 |
| `dispPageAdminContent` | 페이지 목록 + 일괄 설정 | dispPageAdminContent-13j7t44.json | `apps/web/app/admin/pages/page.tsx` (`admin.module.list` 로 페이지 인스턴스 나열, `:20`) | 대응 있음 | 목록은 있음. 없는 것: 일괄 설정(`module_category_srl`, `layout_srl`, `skin`, `use_mobile`, `mlayout_srl`, `mskin`, `description`, `header_text`, `footer_text`, 권한 `modify/access/manager`), 검색 |
| `dispPageAdminInfo` | 페이지 기본 설정 | dispPageAdminInfo-9tonj8.json | `apps/web/app/admin/pages/[instanceId]/edit/page.tsx` + `_components/PageEditForm.tsx` + `actions.ts` (제목·브라우저 제목·레이아웃·PC/모바일 본문) | 대응 있음 | 없는 필드: `domain_srl`, `robots_tag`, `meta_keywords`, `meta_description`, `module_category_srl`, `use_mobile`, `mlayout_srl`, `page_caching_interval` |
| `dispPageAdminGrantInfo` | 페이지 권한 | dispPageAdminGrantInfo-1poko6w.json | 페이지 편집 폼의 `grant` 입력 (`PageEditForm.tsx:39` 주석 REQ-ADMIN2-027, `module.update` 의 `grant`) | 대응 있음 | 없는 것: 항목별 `_default` 단계 선택, `admin_member`/`admin_scopes[]`, `manager` |
| `dispPageAdminSkinInfo` | 페이지 스킨 설정 | dispPageAdminSkinInfo-19f5inr.json | 없음 | 격차 | `display_title` 등 스킨 변수 |
| `dispPageAdminMobileSkinInfo` | 페이지 모바일 스킨 설정 | dispPageAdminMobileSkinInfo-1dap4hl.json | 없음 | 격차 | `display_mobile_title` 등 |
| `dispPageAdminPageAdditionSetup` | 페이지 추가 설정 | dispPageAdminPageAdditionSetup-j4xmhs.json | 없음 | 의도적 제외 후보 | 필드가 에디터 설정(`editor_skin`, `editor_height`, `editor_toolbar`, `comment_editor_*`, `mobile_editor_*`)이라 에디터 DROP 결정(`spec.md:71-73`)에 종속 |
| `dispModuleAdminCategory` | 모듈 분류 관리 | dispModuleAdminCategory-jt4scl.json | 없음 (`moduleCategory`·`ModuleCategory`·`copyModule` 문자열을 apps·packages 에서 grep 한 결과 0건, 스키마에 `ModuleCategory` 모델 없음) | 격차 | `module_category_srl`, `title`. 게시판·페이지 일괄 설정의 분류 선택도 이에 종속 |
| `dispModuleAdminCopyModule` | 모듈 복사 | dispModuleAdminCopyModule-19j439a.json | 없음 (위 grep 결과 동일) | 격차 | `module_srl`, `mid_1..10`, `browser_title_1..10` (한 번에 10개까지 복사) |
| `dispTagAdminConfig` (고급 그룹, 요청 범위 확장) | 태그 설정 | dispTagAdminConfig-grj4gz.json | `apps/web/app/admin/tags/page.tsx` + `admin.tag.list/merge/rename/delete` (`routers/admin/tag.ts:41/68/93/116`) | 격차 | 레거시는 구분자 설정(`separators[]` 3개) 화면. rhymix-ts 는 태그 목록·병합·이름 변경·삭제 화면이라 기능 방향이 다름. 구분자 설정 화면 없음 |

### 1.1 판정 집계

| 판정 | 행 수 |
|---|---:|
| 대응 있음 | 23 |
| 격차 | 18 |
| 의도적 제외 후보 | 4 |
| 합계 | 45 |

(집계는 §4 끝의 `awk` 명령으로 재확인한 값: 23 / 18 / 4, 합계 45.)

### 1.2 이번 범위에서 제외한 행

- 보충 그룹의 page(`dispPageAdminContentModify` 등 5행)·module(`dispModuleAdminInfo` 등 4행)·widget·layout 행은 요청 범위(board·comment·document·file·poll·trash·editor·spamfilter·tag) 밖이라 넣지 않았다. 필요하면 추가 조사.
- `dispPageAdminContent*`·`dispModuleAdmin*` 중 '콘텐츠' 그룹 act 는 요청의 "34 act 전부" 때문에 포함했다.

### 1.3 rhymix-ts 에만 있는 화면 (레거시 대응 act 없음, 참고)

- `/admin/settings/spamfilter/url` (URL 차단 목록, `admin.spamfilter.urlBlacklist` `spamfilter.ts:354`)
- `/admin/spam-review` (스팸 검토 큐, `admin.spamfilter.reviewQueue` `spamfilter.ts:448`)
- `/admin/boards/[mid]/feed` (게시판별 RSS/Atom 설정)

## 2. SPEC-CONTENT-PARITY-001 미완 AC (흡수 대상)

출처: `.moai/specs/SPEC-CONTENT-PARITY-001/progress.md` §E.2·§E.3·§E.4, `acceptance.md`.

### 2.1 PASS-WITH-DEBT 7건 (런타임 재현 미실시)

| AC (progress 표기) | 내용 | 남은 일 |
|---|---|---|
| AC-CPAR-005 (M2) | 휴지통 복원 영속 | dev DB 에서 실제 클릭 → 새로고침 영속 재현. mock 기반 테스트만 통과 |
| AC-CPAR-006 (M2) | 개별 영구 삭제 + 비우기 | 격리 임시 DB 에서 FK cascade 실제 실행 검증(`design.md`/`plan.md` §3 리스크 항목) |
| AC-CPAR-007 (M3) | 문서 일괄 작업 영속 | 브라우저에서 일괄 작업 후 새로고침 영속 재현 |
| AC-CPAR-008 (M3) | TEMP 복구/삭제·페이지네이션·IP 필터·신고 링크 | TEMP 복구 후 목록 반영, IP 클릭 필터 결과를 브라우저로 재현 |
| AC-CPAR-010 (M3) | 댓글 일괄 삭제 영속 | 브라우저 재현 |
| AC-CPAR-011 (M4) | 파일 검색·필터·정렬 | 브라우저 재현(검색·정렬 결과 갱신) |
| AC-CPAR-012 (M4) | 파일 일괄 삭제 | 삭제 후 새로고침 영속, 연관 문서 첨부 목록 반영 재현 |

### 2.2 기록 자체의 불일치와 누락

- **AC 번호 충돌**: `progress.md` 는 AC-CPAR-006 을 두 번 쓴다(M2 영구 삭제, M3 필터 배선). `acceptance.md` 기준으로는 복원 영속=004, 영구 삭제=005, 필터 배선=006 이다. 판정표에서 인용할 때 `acceptance.md` 번호를 기준으로 삼아야 한다.
- **AC-CPAR-014 단독 행 없음**: `acceptance.md:118` 에 'per-board 링크'로 정의되어 있으나 `progress.md` M5 는 AC-CPAR-013 행 안에 같이 적어 두었다.
- **§E.3 집계 신뢰도**: `ac_pass_count: 11` 의 나열(001,002,003,004,006,009,013,015,016)은 9개 항목뿐이다. 재집계 필요.
- **§E.4 Sync-phase Audit-Ready Signal 이 `_<pending sync-phase>_`**: sync 단계가 마감되지 않았다.

### 2.3 progress 본문에 적힌 잔여 항목

- `purgeDocument`(TEMP 영구 삭제·휴지통 purge 공용, `packages/document/src/trash.ts`)가 AdminLog 를 기록하지 않음. 범위 규율로 수정하지 않았고 잔여로 남김.
- 문서·댓글 작성자 필터가 닉네임 텍스트 검색이 아니라 "작성자 ID" 숫자 입력(백엔드가 닉네임 검색을 제공하지 않음). 레거시 UX 와 다름.
- M7 메일 로그 테스트: WSL2 에서 `await import('@rhymix-ts/admin/security')` cold-start 12-15초 이상으로 `testTimeout 30000` 으로 우회. 커밋 목록에 `[staged]` 표기가 남아 있어 마지막 조정이 커밋되었는지 별도 확인 필요.

### 2.4 판정표와 겹치는 항목 (이 SPEC 이 닫았다고 한 것이 실제로는 부분 대응)

- 문서 목록의 작성자·IP 필터, 댓글 목록 isSecret 필터는 구현됐으나 표 §1 의 `search_target`·`deny_authors`·`deny_ips`·알림 메시지 필드는 이 SPEC 범위 밖이라 여전히 격차.
- 사이드바에 스팸필터 링크는 `/admin/settings/spamfilter/ip` 하나만 노출(`apps/web/components/admin/AdminSidebar.tsx:120`), 나머지는 `spamfilter/layout.tsx` 탭으로 접근.

## 3. 요약

- 대응 있음 23 / 격차 18 / 의도적 제외 후보 4 (45행).
- 격차가 몰린 곳: 게시판 기본 설정·스킨(쓰기 경로 자체가 없음), 모듈 분류·복사, 문서 설정·별칭 UI, 신고 로그 전체 화면, 파일 설정의 세부 필드, 스팸필터 캡차 테스트.
- 가장 큰 단일 격차는 `dispBoardAdminBoardInfo`: `Board.listCount` 등 컬럼은 있는데 관리자가 바꿀 UI·API 가 없다.
- 의도적 제외 후보 4건: 에디터 2 + 페이지 추가 설정(에디터 종속) 1 + 휴지통 항목 보기(레거시 서버 오류) 1.

## 4. 판정 근거 명령과 실제 출력 요약

모두 `/mnt/d/project/rhymix-ts` 에서 읽기 전용으로 실행했다.

1. 입력 범위 확인
   - `grep -n -i -E '^#|콘텐츠|보충' coverage.md` → 그룹 표에서 `콘텐츠 | 34 | 67`, `보충(파라미터 화면) | 30 | 30` 확인
   - `awk -F'|' '/\| 콘텐츠 \|/{...}' coverage.md` → 콘텐츠 act 34개 목록(board 8, comment 2, document 3, editor 2, file 4, module 2, page 6, poll 1, spamfilter 5, trash 1)
2. 레거시 폼 필드 추출 (`pages/*.json` 의 `forms[].fields[].name`, 즐겨찾기 토글 폼·csrf 등 숨은 필드 제외)
   - 위 §1 비고의 "없는 필드" 목록은 이 출력과 rhymix-ts 폼 필드의 차집합
3. rhymix-ts 라우터 프로시저 목록
   - `grep -n "protectedAdminProcedure" routers/admin/{board,category,content-extra-key,poll,trash,tag,spamfilter,file,comment,document,moderation,module}.ts` → 각 파일의 프로시저와 줄 번호(§1 의 `파일:줄` 출처)
   - 예: `module.ts` 는 create 28 / list 66 / get 95 / getById 112 / update 166 / delete 209 / bulk 239. `board.ts` 는 list·get 두 개뿐(read-only)
4. 폼 필드 대조
   - `grep -no 'name="..."\|htmlFor="..."' files/settings/FileSettingsForm.tsx documents/config/DocumentConfigForm.tsx polls/config/PollConfigForm.tsx spamfilter/{captcha,block,ip,words}/*Form.tsx` → §1 각 행의 "있는 필드"
   - `ModuleEditForm.tsx` → `name="title"`, `"browserTitle"`, `"description"` 3개만
5. Board 설정 쓰기 경로 확인
   - `grep -rn "board.update" apps packages` (테스트 제외) → `boards/[mid]/feed/page.tsx:70`, `boards/[mid]/permissions/page.tsx:93` 두 곳뿐 → 기본 설정(목록 수·정렬 등) 쓰기 경로 없음 판단의 근거
6. 별칭 UI 부재 확인
   - `grep -rn "listAliases\|setAlias" apps packages -l` → `routers/admin/document.ts`, `document.test.ts` 두 파일뿐 → 화면에서 호출하지 않음
7. 모듈 분류·복사 부재 확인
   - `grep -rln "copyModule\|copy-module\|CopyModule\|moduleCategory\|ModuleCategory" apps/web packages ...` → 출력 없음, `grep -n "model ModuleCategory" schema.prisma` → 없음
8. 에디터 부재·제외 근거
   - `grep -n -i "에디터\|editor" SPEC-CONTENT-PARITY-001/spec.md` → 71-73행(Tiptap 대체, DROP), 126행(Out of Scope)
   - `grep -rIl "editor_skin\|editorSkin" apps/web packages` → 출력 없음
9. 신고 로그 범위
   - `grep -n "reason" Reported{Comments,Documents}Table.tsx` → 열 1개(최신 신고 사유, 각 94/92행)뿐
10. 캡차 테스트 화면 부재
    - `grep -rn -il "captchaTest\|CaptchaTest" apps/web/app/admin apps/web/server` → `public/captcha.test.ts` 한 파일(테스트)
11. 태그 레거시 폼
    - `dispTagAdminConfig-grj4gz.json` 의 필드 → `separators[]` 3개 (구분자 설정)
12. 사이드바 링크
    - `grep -n "href" components/admin/AdminSidebar.tsx` → 콘텐츠 섹션 112-121행 (`/admin/modules`, `/widgets`, `/pages`, `/documents`, `/comments`, `/files`, `/polls`, `/settings/spamfilter/ip`, `/trash`)
13. 레거시 화면 직접 조회는 하지 않았다. 레거시 비교는 이미 수집된 `pages/*.json` 과 `coverage.md` 본문 요약(보충 방문 결과)만 사용했다.

### 4.1 한계 (미검증)

- 화면을 브라우저로 열어 확인하지 않았다. rhymix-ts 쪽 "대응 있음"은 소스의 라우트·폼 필드·프로시저 존재를 근거로 한 판정이고, 동작 확인이 아니다.
- `dispBoardAdminExtraVars` 의 수정 UI, `dispTrashAdminList` 의 일괄 처리, 파일 설정의 `target_actions` 대응은 소스에서 끝까지 따라가지 않았다.
- §1.1 집계는 아래 명령 출력(23 / 18 / 4, total 45)으로 확인했다. 모듈 분류 행의 셀 안 `|` 문자가 열을 깨뜨려 한 번 18 대신 17 로 나왔고, 그 문자를 제거한 뒤 맞췄다.

```bash
# 판정 열 재집계 (표의 5번째 열)
awk -F'|' '/^\| `disp/{gsub(/^ +| +$/,"",$6); c[$6]++} END{for(k in c) print k, c[k]}' .moai/state/collab/lgp-003-content-draft.md
```

## 5. 미검증 항목 확정 (moai3, 2026-11-28, moai 재확인)

원본: `.moai/state/collab/lgp-003-unverified-check.md`. 판정표 §1 해당 행은 아래가 우선한다.


| # | 항목 | 결론 | 한 줄 근거 |
|---|---|---|---|
| 1 | `dispBoardAdminExtraVars` 확장 변수 **수정** UI | **없음** | 페이지는 추가·삭제 Server Action 만 있고, `contentExtraKey.update` 호출처 0건 |
| 2 | `dispTrashAdminList` 휴지통 **일괄** 처리 | **없음 (행 단위 복원·삭제와 전체 비우기만 있음)** | 체크박스·선택 상태 코드 0건. 행 단위 `handleRestore`·`handlePurge`, 전체 `handleEmpty` 만 있음 |
| 3 | `dispFileAdminUploadConfig` 의 `target_actions` 대응 | **레거시 파일 모듈에는 `target_actions` 가 없음 — 판정표의 전제가 잘못됨** | `target_actions` 는 스팸필터(captcha) 모듈 용어. rhymix-ts 트리거 대응 코드도 없음 |
| 4 | `dispBoardAdminCategoryInfo` 분류 **수정** UI | **없음** | 페이지는 추가·삭제 Server Action 만 있음. `admin.category.update` 는 라우터에만 있고 UI 호출처 0건 |
| 5 | `progress.md` M7 의 `[staged]` 표기 | **변경 자체는 커밋됨 (`baf71b3`). 다만 progress.md 의 `[staged]` 자리표시자는 SHA 로 바뀌지 않은 채 남음** | `baf71b3` 가 `mail-log.test.ts` 의 `timeout: 30000` 을 추가. `[staged]` 문자열은 `baf71b3` 에서 들어와 지금도 1건 남아 있음 |

---


- 정정 결과: `dispBoardAdminExtraVars`·`dispBoardAdminCategoryInfo` 는 "대응 있음"을 유지하되 수정 UI 부재를 격차 요구사항으로 넣는다(라우터 `update` 는 있고 화면 호출처 0). `dispTrashAdminList` 는 선택 일괄 복원·삭제 부재를 비고에 추가. 파일 설정 `target_actions` 는 잘못된 전제 — 레거시 file 모듈에 없음(스팸필터 캡차 설정의 필드). CONTENT-PARITY-001 M7 은 `baf71b3` 로 커밋됨, `progress.md` 의 `[staged]` 표기만 정정 대상.
