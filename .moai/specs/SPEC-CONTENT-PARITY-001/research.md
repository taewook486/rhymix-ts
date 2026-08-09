# SPEC-CONTENT-PARITY-001 — 레거시 '콘텐츠' 메뉴 전수 분석 (research)

- 조사일: 2026-08-09
- 조사 방법: 양쪽 DB 초기화 → 첫 설치 재실행 → Playwright로 레거시 admin(:8080) '콘텐츠' 메뉴
  전 화면 순회, DOM에서 링크(a[href])·폼(form/act/입력필드)·버튼(onclick)·테이블 헤더를 구조적으로 수집.
- 레거시: Rhymix 2.1.33 (Docker `rhymix-app`, http://localhost:8080/, MariaDB `rhymix-db`)
- 뉴버전: rhymix-ts (http://localhost:3000/, Postgres `rhymix-ts-db`:5444)
- 관리자 계정(양쪽 동일): admin / Admin1234! / comfit99@gmail.com

## 0. 재설치 상태 요약

- 레거시: `files/config/config.php` 제거 + DB drop/recreate → 설치 마법사 4단계 완료.
  XEDITION 테마, 기본 메뉴(Welcome/Free Board/Q&A/Notice), 샘플 문서 2건 생성됨.
- 뉴버전: `prisma migrate reset`(마이그레이션 31개 적용, 테이블 67개) → `/install` 4단계 완료.
  기본 모듈(board/notice/qna), 기본 메뉴, 샘플 문서 생성됨. `sites.scheme=http`,
  `domains.forceHttps=f` 확인(강제 HTTPS 리다이렉트 버그 재발 없음).
- 뉴버전 설치 마법사 admin-config 화면에서 **Playwright 신뢰성 이슈** 2건 관찰(코드 버그 아닌
  자동화 상호작용 문제로 보임): (a) SSL 라디오가 Playwright click으로 토글 안 됨(JS `el.click()`으로는
  정상), (b) '설치 완료' 버튼 click으로 server action POST가 발화하지 않음(`form.requestSubmit()`로
  정상 제출). E2E 스크립트 작성 시 참고.

## 1. 레거시 admin '콘텐츠' 메뉴 구조 (11개 항목)

| # | 메뉴 | 진입 act | 뉴버전 대응 라우트(현황) |
|---|------|----------|--------------------------|
| 1 | 게시판 | dispBoardAdminContent | /admin/modules (게시판(모듈)) |
| 2 | 페이지 | dispPageAdminContent | /admin/pages |
| 3 | 문서 | dispDocumentAdminList | /admin/documents |
| 4 | 댓글 | dispCommentAdminList | /admin/comments |
| 5 | 파일 | dispFileAdminList | /admin/files (라우트 존재, 사이드바 노출 여부 확인 필요) |
| 6 | 설문 | dispPollAdminList | /admin/polls |
| 7 | 에디터 | dispEditorAdminIndex | (대응 화면 불명 — gap 후보) |
| 8 | 스팸필터 | dispSpamfilterAdminDeniedIPList | /admin/spam-review + /admin/settings/security (부분) |
| 9 | 휴지통 | dispTrashAdminList | /admin/trash (라우트 존재) |
| 10 | 메일, SMS 및 푸시 알림 관리 | dispAdvanced_mailerAdminConfig | (대응 화면 불명 — gap 후보) |
| 11 | 알림 센터 | dispNcenterliteAdminConfig | /admin/settings/notification (부분) |

> 뉴버전 사이드바(2026-08-09 실측): 대시보드, 게시판(모듈), 위젯 시스템, 페이지, 전체 문서 관리,
> 전체 댓글 관리, 설문, 일반 설정, 메뉴 편집, 디자인, 알림 설정, 보안 설정, 내보내기, 가져오기,
> 회원 관리/그룹/등록/설정, 포인트, 관리자 로그, 시스템 헬스, 캐시 관리.
> **파일/휴지통/에디터/스팸필터가 사이드바에 없음** (파일·휴지통은 라우트 자체는 존재).

## 2. 화면별 상세 인벤토리

### 2.1 게시판 (dispBoardAdminContent)

- 목록 테이블: 번호 | 모듈 분류 | 도메인 | URL | 브라우저 제목 | 특이사항 | 등록일 | 편집
- 행별 액션: 설정(dispBoardAdminBoardInfo), 복사(dispModuleAdminCopyModule, 팝업), 삭제(dispBoardAdminDeleteBoard)
- 검색: search_target(select) + search_keyword
- 게시판 생성: "등록" 버튼
- **일괄 설정 탭 3종** (체크된 모듈 대상, module_srls hidden):
  - 일괄 기본 설정 `procModuleAdminModuleSetup`: module_category_srl, layout_srl, skin, use_mobile,
    mlayout_srl, mskin, description, header_text, footer_text (+각 delete 체크박스)
  - 일괄 추가 설정: `procDocumentInsertModuleConfig`(use_history, use_vote_up/down,
    allow_vote_from_same_ip/cancel/non_member, allow_declare_from_same_ip/cancel, declared_message[]),
    `procCommentInsertModuleConfig`(comment_count, comment_page_count, max_thread_depth, default_page,
    use_comment_validation, 투표/신고 동일 세트), `procEditorInsertModuleConfig`(에디터/댓글에디터/모바일
    스킨·컬러셋·높이·툴바 + content_font 19종 + autosave), `procRssAdminInsertModuleConfig`(open_rss,
    open_total_feed, feed_description, feed_copyright)
  - 일괄 권한 설정 `procModuleAdminModuleGrantSetup`: list/view/write_document/write_comment/
    vote_log_view/update_view/consultation_read/access/manager 각 default(select)+그룹 체크박스
- 모듈 분류 관리 링크: dispModuleAdminCategory

#### 개별 게시판 설정 (dispBoardAdminBoardInfo&module_srl=N) — 탭 8종

1. **게시판 정보** `procBoardAdminInsertBoard`: domain_srl, board_name, browser_title, robots_tag,
   meta_keywords, meta_description, layout_srl, skin, list_count, search_list_count, page_count,
   header_text, footer_text, use_mobile, mlayout_srl, mskin, mobile_list_count,
   mobile_search_list_count, mobile_page_count, mobile_header/footer_text, order_target, order_type,
   except_notice, use_bottom_list(+skip_bottom_list_for_olddoc/days/robot), consultation(상담기능),
   use_anonymous(+anonymous_except_admin, anonymous_name), document_length_limit,
   comment_length_limit, inline_data_url_limit, update_log, update_order_on_comment, trash_use,
   filter_specialchars — 그리고 문서 상태 사용 설정(use_status[]), 정렬용 목록(추가/위로/아래로/삭제)
2. **분류 관리** (dispBoardAdminCategoryInfo) `procDocumentInsertCategory`: category_title,
   category_color, category_description, group_srls[](그룹 제한), expand, is_default;
   `procBoardAdminSaveCategorySettings`: hide_category, allow_no_category. 트리 편집(선택/줄이기).
3. **확장 변수** (dispBoardAdminExtraVars): 테이블(번호|확장변수ID|입력항목이름|형식|기본값|필수항목|검색|정렬),
   "추가"(type=insertExtraForm) — 확장변수 CRUD + 정렬.
4. **권한 관리** (dispBoardAdminGrantInfo): 관리자 지정(admin_id 추가/삭제, admin_scopes[]) +
   access/list/view/write_document/write_comment/vote_log_view/update_view/consultation_read/manager
   권한별 default(select: 전체/회원/그룹지정 등) + 그룹 체크박스.
5. **추가 설정** (dispBoardAdminBoardAdditionSetup): `procBoardAdminInsertCombinedConfig`(통합 목록:
   include_modules[], include_days, include_notice), procDocument/Comment/Editor/RssInsertModuleConfig
   (일괄 설정과 동일 세트, 단일 모듈 대상), `procFileAdminInsertModuleConfig`(모듈별 파일 설정:
   use_default_file_config, allowed_filesize/attach_size, allowed_filetypes, 이미지 autoconv 6종·
   max width/height/action, 품질/자동회전/EXIF 제거, gif2mp4, 비디오 썸네일, download_grant[])
6. **스킨 설정** (dispBoardAdminSkinInfo) `procModuleAdminUpdateSkinInfo`
7. **모바일 스킨 설정** (dispBoardAdminMobileSkinInfo)
8. 삭제 (dispBoardAdminDeleteBoard)

### 2.2 페이지 (dispPageAdminContent)

- 목록: 번호 | 모듈 분류 | 페이지 타입 | 도메인 | URL | 브라우저 제목 | 등록일 | 편집
- 행별: 설정(dispPageAdminInfo), 복사(팝업), 삭제(dispPageAdminDelete)
- 검색(search_target/search_keyword), 장바구니(cart 체크박스) → 일괄 기본/권한 설정(게시판과 동일 폼)
- **다국어 텍스트 설정** 모달(#g11n): getModuleAdminMultilingualHtml, 추가/검색/해제, "저장 후 사용"
- 개별 페이지 설정(dispPageAdminInfo) `procPageAdminUpdate`: domain_srl, page_name,
  module_category_srl, browser_title, robots_tag, meta_keywords, meta_description, use_mobile,
  layout_srl, mlayout_srl, page_caching_interval. 탭: 모듈 정보 / 추가 설정(dispPageAdminPageAdditionSetup)
  / 권한 관리(dispPageAdminGrantInfo)
- 페이지 생성 폼(등록): WYSIWYG/외부HTML 등 페이지 타입 선택 포함(생성 화면)

### 2.3 문서 (dispDocumentAdminList)

- 탭: 문서 목록 / 기본 설정(dispDocumentAdminConfig) / 신고 목록(dispDocumentAdminDeclared)
- 상태 필터: 전체 / 공개(is_secret=N) / 비밀(is_secret=Y) / 임시(temp)
- 테이블: (체크박스) 제목 | 글쓴이 | 조회 수 | 추천(+/-) | 날짜 | IP 주소 | 상태. 간단보기/상세보기 토글.
- 검색: module_srl(모듈별 필터 select) + search_target + search_keyword. IP 클릭 시 해당 IP 검색.
- 일괄 작업 `procDocumentManageCheckedDocument` (type=submit로 분기): 이동/복사/휴지통/삭제 등 +
  쪽지 발송 옵션(send_message radio 3종 + message_content)
- 제목 클릭 → 팝업 메뉴(#popup_menu_area)로 문서별 액션
- 기본 설정 `procDocumentAdminInsertConfig`: view_count_option(조회수 증가 옵션), icons(New/Update
  아이콘 표시 시간), micons, search_division(검색 분할 수) + "분류별 문서 수 다시 계산",
  "섬네일 모두 삭제"(doDeleteAllThumbnail)
- 신고 목록: 정렬(신고 수/작성 날짜/최근 신고 날짜), 일괄 처리(procDocumentManageCheckedDocument,
  prevent_redeclare 체크박스 포함)

### 2.4 댓글 (dispCommentAdminList)

- 탭: 댓글 목록 / 신고 목록(dispCommentAdminDeclared)
- 상태 필터: 전체 / 공개 / 비밀 / 대기(is_published=N) / 발행(is_published=Y)
- 테이블: 댓글 | 글쓴이 | 추천/비추천 | 날짜 | IP 주소 | 상태 (+발행 상태). 간단/상세보기.
- 검색: module_srl + search_target + search_keyword
- 일괄 작업 `procCommentAdminDeleteChecked`: 휴지통(is_trash=true) / 삭제 / 발행(will_publish) +
  message_content(사유 통보)
- 신고 목록: 정렬 3종, 휴지통/삭제/신고 취소(doCancelDeclare)

### 2.5 파일 (dispFileAdminList)

- 탭 4종: 첨부 파일 목록 / 파일 업로드 설정 / 파일 다운로드 설정 / 기타 설정
- 목록: 파일 | 파일 크기 | 이미지 크기 | 다운로드 | 작성자 | 날짜 | IP 주소 | 상태 | 편집
- 필터: 전체/유효(isvalid=Y)/대기(isvalid=N), 정렬(파일 크기/다운로드/날짜), module_srl+검색
- 일괄 삭제 `procFileAdminDeleteChecked`
- 업로드 설정 `procFileAdminInsertUploadConfig`: allowed_filesize/attach_size,
  pre_conversion_filesize, allowed_filetypes, 이미지 자동변환(bmp/jpg/png/webp/avif/heic →),
  max_image_width/height(+action/same_format/admin 예외), image_quality_adjustment, autorotate,
  EXIF 제거, always_reencode, gif→mp4, 비디오 max width/height/size/duration(+action/admin 예외),
  any→mp4 변환, always_reencode, video_thumbnail, mp4 gif 시간, ffmpeg/ffprobe/magick 명령어·타임아웃
- 다운로드 설정 `procFileAdminInsertDownloadConfig`: allow_outlink(+format/site 예외),
  멀티미디어 직접 다운로드, download_short_url, inline_download_format[](5종), allow_indexing_format
- 기타 설정 `procFileAdminInsertOtherConfig`: save_changelog(파일 변경 로그)

### 2.6 설문 (dispPollAdminList)

- 목록: 제목 | 필수 항목 수 | 참가자 | 작성자 | 등록일 | 설문조사 종료일
- 검색(search_target/keyword), 일괄 삭제 `procPollAdminDeleteChecked`

### 2.7 에디터 (dispEditorAdminIndex)

- 기본 설정 `procEditorAdminGeneralConfig`: 본문/댓글/모바일별 editor_skin·colorset·height·
  toolbar(+hide), content_font 19종 라디오 + font_defined + content_font_defined, additional_css,
  additional_mobile_css, additional_plugins, remove_plugins
- 컴포넌트 목록 테이블: 이동(Move to, 순서 변경) | 컴포넌트 | 버전 | 작성자 | 설치경로 | 사용(enables[]) | 삭제
  → `procEditorAdminCheckUseListOrder`
- 컴포넌트별 설정(dispEditorAdminSetupComponent&component_name=...): 이모티콘/이미지 추가/
  이미지 갤러리/설문조사 등, `procEditorAdminSetupComponent`(target_group[] 등)

### 2.8 스팸필터 (dispSpamfilterAdmin*)

- 탭 5종: 스팸 IP 목록 / 스팸 키워드 목록 / 자동 차단 설정 / 캡챠 설정 / 캡챠 테스트
- IP 목록: IP | 설명 | 회원 제외 | 최근 히트 | 히트 | 등록일(정렬 3종),
  추가 `procSpamfilterAdminInsertDeniedIP`(ipaddress_list textarea), 삭제
- 키워드 목록: 키워드 | 설명 | 회원 제외 | HTML | 최근 히트 | 히트 | 등록일,
  추가 `procSpamfilterAdminInsertDeniedWord`(word_list, enable_description), 삭제
- 자동 차단 `procSpamfilterAdminInsertConfig`: limits(사용/안함), limits_interval/count,
  blocked_actions[](6종), custom_message, ipv4/ipv6_block_range, except_ip
- 캡챠 `procSpamfilterAdminInsertConfigCaptcha`: captcha_type, site_key/secret_key, theme, size,
  target_devices[], target_actions[](5종), target_users, target_frequency

### 2.9 휴지통 (dispTrashAdminList)

- 필터: 전체 / 문서(originModule=document) / 댓글(originModule=comment)
- 테이블: 타입 | 문서 | 작성자 | IP 주소 | 옮긴 사람 | 삭제 날짜 | 설명
- 검색(search_target/keyword), 휴지통 비우기 `procTrashAdminEmptyTrash`(is_type radio: 전체/타입별,
  is_all), 개별/선택 복원·삭제(목록 행 액션)

### 2.10 메일, SMS 및 푸시 알림 관리 (advanced_mailer)

- 탭 9종: 기본 설정 / 예외 도메인 / SPF/DKIM 설정 안내 / 메일 테스트 / 메일 발송 내역 /
  SMS 테스트 / SMS 발송 내역 / 푸시 알림 테스트 / 푸시 알림 발송 내역 (+ 알림 설정 링크 →
  dispAdminConfigNotification)
- 기본 설정 `procAdvanced_mailerAdminInsertConfig`: log_sent_mail/errors, log_sent_sms/sms_errors,
  log_sent_push/push_errors (발송 로그 6종 select)
- 예외 도메인 `procAdvanced_mailerAdminInsertExceptions`: exception_1~3_method(select)+domains(textarea)

### 2.11 알림 센터 (ncenterlite)

- 탭 8종: 기본 설정 / 고급 설정 / 댓글 작성자 알림 설정 / 모듈별 사용 설정 / 스킨 설정 /
  시험용 알림 생성 / 알림 목록 / 커스텀 리스트
- 기본 설정 `procNcenterliteAdminInsertConfig`: use[이벤트][채널] 매트릭스 — 이벤트 8종(comment,
  comment_comment, mention, vote, scrap, message, admin_content, custom) × 채널 4종(web, mail,
  sms, push) + display_use, always_display, user_config_list, user_notify_setting,
  push_before_sms, document_read
- 고급 설정: variable_name, mention_names/suffixes(+always_cut), mention_limit, anonymous_voter/
  scrap, highlight_effect, unsubscribe, fcm_push_format

## 3. 공통 UI 패턴 (레거시)

- 목록 화면 공통: 체크박스 선택 + 일괄 작업, search_target/search_keyword 검색, 페이지네이션
  (첫/숫자/끝), 정렬 링크(sort_index+order_type), 간단보기/상세보기 토글(문서/댓글)
- 관리자 즐겨찾기 토글(procAdminToggleFavorite)이 모든 화면 헤더에 존재 (★)
- 팝업 메뉴(제목/작성자 클릭 → 문서/회원 컨텍스트 메뉴)

## 4. gap 후보 요약 (SPEC 작성 입력)

뉴버전 코드베이스 정밀 대조는 SPEC 작성 단계에서 수행하되, 사이드바/라우트 실측 기준 1차 후보:

1. **사이드바 미노출**: /admin/files, /admin/trash 라우트는 있으나 사이드바 '콘텐츠' 섹션에 없음.
   레거시 콘텐츠 메뉴 순서(게시판→페이지→문서→댓글→파일→설문→에디터→스팸필터→휴지통→메일→알림)와
   구성 불일치.
2. **문서 관리**: 기본 설정 탭(조회수 옵션/아이콘/검색 분할), 신고 목록 탭, 상태 필터(공개/비밀/임시),
   일괄 이동·복사+쪽지 통보, IP 검색 — 뉴버전 /admin/documents 기능 범위 확인 필요.
3. **댓글 관리**: 대기/발행(승인) 필터 + 발행 일괄 처리, 신고 목록 탭 — /admin/comments 확인 필요.
4. **파일 관리**: 업로드/다운로드/기타 설정 3탭(이미지·비디오 변환 파이프라인 설정 포함) — 뉴버전
   대응 화면 존재 여부.
5. **에디터 관리 화면**: 전역 에디터 설정 + 컴포넌트 관리 — 뉴버전 대응 불명(최대 gap 후보).
6. **스팸필터**: IP/키워드 목록·자동 차단·캡챠 설정 화면 — /admin/spam-review(신고 검토)와
   /admin/settings/security 로 분산된 현황 대조 필요.
7. **휴지통**: 문서/댓글 통합 휴지통 + 비우기/복원 — /admin/trash 기능 범위 확인.
8. **메일/SMS/푸시 관리**: 발송 로그·테스트·예외 도메인 — 뉴버전 대응 불명.
9. **알림 센터**: 이벤트×채널 매트릭스 설정 — /admin/settings/notification 범위 대조.
10. **게시판/페이지 모듈 관리**: 일괄 설정(기본/추가/권한) 3탭, 개별 게시판 8탭(정보/분류/확장변수/
    권한/추가/스킨/모바일스킨/삭제), 다국어 텍스트 모달 — /admin/modules, /admin/pages 대조.

## 5. 원자료

- 수집 스크립트: Playwright `browser_run_code_unsafe` 3배치 (메인 11화면 + 서브 15화면 + 게시판
  탭 5화면 + 뉴버전 사이드바). DOM 수집 결과는 이 문서의 §2에 전량 반영됨.
