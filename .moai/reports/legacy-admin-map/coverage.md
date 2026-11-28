# 레거시 관리자 화면 커버리지

- 대상: http://localhost:8080 · 레거시 소스: `/mnt/d/project/rhymix`
- 집계 시각: 2026-11-28T05:13:04.970Z
- module.xml 선언 disp*Admin* 액션: 133
- 지도에 근거가 있는 액션: 133
- 근거 없음: 0
- 지도의 페이지 파일: 192 (고유 act 133)

## 그룹별 고유 act

같은 act 가 파라미터만 달리해 여러 번 방문된 경우 한 줄로 합쳤다. 영역 SPEC 의 판정 단위는 이 표의 행이다.

| 그룹 | 고유 act | 페이지 파일 |
|---|---:|---:|
| 공통(헤더/푸터) | 3 | 4 |
| 고급 | 23 | 41 |
| 보충(파라미터 화면) | 30 | 30 |
| 즐겨찾기 | 24 | 24 |
| 설정 | 4 | 6 |
| 콘텐츠 | 34 | 67 |
| 회원 | 13 | 18 |
| 사이트 제작/편집 | 2 | 2 |

## 모듈별 선언 액션과 근거

| 모듈 | act | 그룹 | 근거 파일 수 | 제목 |
|---|---|---|---:|---|
| addon | `dispAddonAdminIndex` | 고급 | 1 | 설치된 애드온 |
| addon | `dispAddonAdminInfo` | 보충(파라미터 화면) | 1 | 설치된 애드온 |
| addon | `dispAddonAdminSetup` | 고급 | 2 | 설치된 애드온 |
| admin | `dispAdminCleanupList` | 공통(헤더/푸터) | 1 | 시스템 설정 |
| admin | `dispAdminConfigAdvanced` | 즐겨찾기 | 1 | 시스템 설정 |
| admin | `dispAdminConfigDebug` | 즐겨찾기 | 1 | 시스템 설정 |
| admin | `dispAdminConfigFtp` | 보충(파라미터 화면) | 1 | FTP 설정 |
| admin | `dispAdminConfigGeneral` | 설정 | 2 | 시스템 설정 |
| admin | `dispAdminConfigNotification` | 즐겨찾기 | 1 | 시스템 설정 |
| admin | `dispAdminConfigQueue` | 즐겨찾기 | 1 | 시스템 설정 |
| admin | `dispAdminConfigSecurity` | 즐겨찾기 | 1 | 시스템 설정 |
| admin | `dispAdminConfigSEO` | 즐겨찾기 | 1 | 시스템 설정 |
| admin | `dispAdminConfigSitelock` | 즐겨찾기 | 1 | 시스템 설정 |
| admin | `dispAdminCopyDomain` | 설정 | 1 | 시스템 설정 |
| admin | `dispAdminIndex` | 보충(파라미터 화면) | 1 | 시스템 설정 |
| admin | `dispAdminInsertDomain` | 보충(파라미터 화면) | 1 | 시스템 설정 |
| admin | `dispAdminRewriteTest` | 보충(파라미터 화면) | 1 |  |
| admin | `dispAdminSetup` | 설정 | 1 | 관리자 화면 설정 |
| admin | `dispAdminViewServerEnv` | 공통(헤더/푸터) | 1 | 시스템 설정 |
| advanced_mailer | `dispAdvanced_mailerAdminConfig` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| advanced_mailer | `dispAdvanced_mailerAdminExceptions` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| advanced_mailer | `dispAdvanced_mailerAdminMailLog` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| advanced_mailer | `dispAdvanced_mailerAdminMailTest` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| advanced_mailer | `dispAdvanced_mailerAdminPushLog` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| advanced_mailer | `dispAdvanced_mailerAdminPushTest` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| advanced_mailer | `dispAdvanced_mailerAdminSMSLog` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| advanced_mailer | `dispAdvanced_mailerAdminSMSTest` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| advanced_mailer | `dispAdvanced_mailerAdminSpfDkim` | 즐겨찾기 | 1 | 메일, SMS 및 푸시 알림 관리 |
| autoinstall | `dispAutoinstallAdminIndex` | 고급 | 4 | 쉬운 설치 |
| autoinstall | `dispAutoinstallAdminPackageDetail` | 보충(파라미터 화면) | 1 | 쉬운 설치 |
| board | `dispBoardAdminBoardAdditionSetup` | 콘텐츠 | 3 | 게시판 |
| board | `dispBoardAdminBoardInfo` | 콘텐츠 | 3 | 게시판 |
| board | `dispBoardAdminCategoryInfo` | 콘텐츠 | 3 | 게시판 |
| board | `dispBoardAdminContent` | 콘텐츠 | 2 | 게시판 |
| board | `dispBoardAdminDeleteBoard` | 보충(파라미터 화면) | 1 | 게시판 |
| board | `dispBoardAdminExtraVars` | 콘텐츠 | 3 | 게시판 |
| board | `dispBoardAdminGrantInfo` | 콘텐츠 | 3 | 게시판 |
| board | `dispBoardAdminInsertBoard` | 보충(파라미터 화면) | 1 | 게시판 |
| board | `dispBoardAdminMobileSkinInfo` | 콘텐츠 | 3 | 게시판 |
| board | `dispBoardAdminSkinInfo` | 콘텐츠 | 3 | 게시판 |
| comment | `dispCommentAdminDeclared` | 콘텐츠 | 3 | 댓글 |
| comment | `dispCommentAdminDeclaredLogByCommentSrl` | 보충(파라미터 화면) | 1 | 댓글 |
| comment | `dispCommentAdminList` | 콘텐츠 | 1 | 댓글 |
| communication | `dispCommunicationAdminConfig` | 고급 | 1 | 커뮤니케이션 |
| counter | `dispCounterAdminIndex` | 고급 | 3 | 접속통계 |
| document | `dispDocumentAdminAlias` | 보충(파라미터 화면) | 1 | 문서 |
| document | `dispDocumentAdminConfig` | 콘텐츠 | 1 | 문서 |
| document | `dispDocumentAdminDeclared` | 콘텐츠 | 1 | 문서 |
| document | `dispDocumentAdminDeclaredLogByDocumentSrl` | 보충(파라미터 화면) | 1 | 문서 |
| document | `dispDocumentAdminList` | 콘텐츠 | 2 | 문서 |
| document | `dispDocumentAdminTrashList` | 보충(파라미터 화면) | 1 | 문서 |
| editor | `dispEditorAdminIndex` | 콘텐츠 | 1 | 에디터 |
| editor | `dispEditorAdminSetupComponent` | 콘텐츠 | 3 | 에디터 |
| extravar | `dispExtravarAdminConfig` | 고급 | 1 | 확장 변수 |
| file | `dispFileAdminDownloadConfig` | 콘텐츠 | 1 | 파일 |
| file | `dispFileAdminEdit` | 보충(파라미터 화면) | 1 | 파일 |
| file | `dispFileAdminList` | 콘텐츠 | 1 | 파일 |
| file | `dispFileAdminOtherConfig` | 콘텐츠 | 1 | 파일 |
| file | `dispFileAdminUploadConfig` | 콘텐츠 | 1 | 파일 |
| importer | `dispImporterAdminImportForm` | 고급 | 1 | 데이터 들여오기 |
| integration_search | `dispIntegration_searchAdminContent` | 고급 | 1 | 통합검색 |
| integration_search | `dispIntegration_searchAdminSkinInfo` | 고급 | 1 | 통합검색 |
| krzip | `dispKrzipAdminConfig` | 고급 | 1 | 한국 우편번호 |
| layout | `dispLayoutAdminAllInstanceList` | 고급 | 3 | 설치된 레이아웃 |
| layout | `dispLayoutAdminCopyLayout` | 고급 | 3 |  |
| layout | `dispLayoutAdminEdit` | 보충(파라미터 화면) | 1 | 설치된 레이아웃 |
| layout | `dispLayoutAdminInsert` | 보충(파라미터 화면) | 1 | 설치된 레이아웃 |
| layout | `dispLayoutAdminInstalledList` | 고급 | 3 | 설치된 레이아웃 |
| layout | `dispLayoutAdminInstanceList` | 고급 | 3 | 설치된 레이아웃 |
| layout | `dispLayoutAdminLayoutModify` | 보충(파라미터 화면) | 1 |  |
| layout | `dispLayoutAdminModify` | 고급 | 3 | 설치된 레이아웃 |
| member | `dispMemberAdminAgreementsConfig` | 회원 | 1 | 회원 설정 |
| member | `dispMemberAdminAuthLog` | 회원 | 1 | 회원 설정 |
| member | `dispMemberAdminConfig` | 회원 | 1 | 회원 설정 |
| member | `dispMemberAdminDesignConfig` | 회원 | 1 | 회원 설정 |
| member | `dispMemberAdminFeaturesConfig` | 회원 | 1 | 회원 설정 |
| member | `dispMemberAdminGroupList` | 회원 | 1 | 회원 그룹 |
| member | `dispMemberAdminInfo` | 공통(헤더/푸터) | 1 | 회원 목록 |
| member | `dispMemberAdminInsert` | 보충(파라미터 화면) | 1 | 회원정보 조회/수정 |
| member | `dispMemberAdminInsertJoinForm` | 보충(파라미터 화면) | 1 | 회원 목록 |
| member | `dispMemberAdminList` | 회원 | 4 | 회원 목록 |
| member | `dispMemberAdminLoginConfig` | 회원 | 1 | 회원 설정 |
| member | `dispMemberAdminNickNameLog` | 회원 | 1 | 회원 설정 |
| member | `dispMemberAdminSignUpConfig` | 회원 | 1 | 회원 설정 |
| menu | `dispMenuAdminSiteDesign` | 사이트 제작/편집 | 1 | 사이트 디자인 설정 |
| menu | `dispMenuAdminSiteMap` | 사이트 제작/편집 | 1 | 사이트 메뉴 편집 |
| message | `dispMessageAdminConfig` | 고급 | 1 | 오류 표시 |
| module | `dispModuleAdminCategory` | 콘텐츠 | 1 | 설치된 모듈 |
| module | `dispModuleAdminContent` | 고급 | 1 | 설치된 모듈 |
| module | `dispModuleAdminCopyModule` | 콘텐츠 | 3 |  |
| module | `dispModuleAdminFileBox` | 설정 | 2 | 파일박스 |
| module | `dispModuleAdminInfo` | 보충(파라미터 화면) | 1 | 설치된 모듈 |
| module | `dispModuleAdminLangcode` | 고급 | 1 | 다국어 |
| module | `dispModuleAdminModuleAdditionSetup` | 보충(파라미터 화면) | 1 | 설치된 모듈 |
| module | `dispModuleAdminModuleGrantSetup` | 보충(파라미터 화면) | 1 | 설치된 모듈 - 서버 오류 |
| module | `dispModuleAdminModuleSetup` | 보충(파라미터 화면) | 1 | 설치된 모듈 |
| ncenterlite | `dispNcenterliteAdminAdvancedconfig` | 즐겨찾기 | 1 | 알림 센터 |
| ncenterlite | `dispNcenterliteAdminConfig` | 즐겨찾기 | 1 | 알림 센터 |
| ncenterlite | `dispNcenterliteAdminCustomList` | 즐겨찾기 | 1 | 알림 센터 |
| ncenterlite | `dispNcenterliteAdminList` | 즐겨찾기 | 1 | 알림 센터 |
| ncenterlite | `dispNcenterliteAdminOtherComment` | 즐겨찾기 | 1 | 알림 센터 |
| ncenterlite | `dispNcenterliteAdminSeletedmid` | 즐겨찾기 | 1 | 알림 센터 |
| ncenterlite | `dispNcenterliteAdminSkinsetting` | 즐겨찾기 | 1 | 알림 센터 |
| ncenterlite | `dispNcenterliteAdminTest` | 즐겨찾기 | 1 | 알림 센터 |
| page | `dispPageAdminContent` | 콘텐츠 | 2 | 페이지 |
| page | `dispPageAdminContentModify` | 보충(파라미터 화면) | 1 | 페이지 |
| page | `dispPageAdminDelete` | 보충(파라미터 화면) | 1 | 페이지 |
| page | `dispPageAdminGrantInfo` | 콘텐츠 | 3 | 페이지 |
| page | `dispPageAdminInfo` | 콘텐츠 | 3 | 페이지 |
| page | `dispPageAdminMobileContent` | 보충(파라미터 화면) | 1 | 페이지 |
| page | `dispPageAdminMobileContentModify` | 보충(파라미터 화면) | 1 | 페이지 |
| page | `dispPageAdminMobileSkinInfo` | 콘텐츠 | 2 | 페이지 |
| page | `dispPageAdminPageAdditionSetup` | 콘텐츠 | 3 | 페이지 |
| page | `dispPageAdminSkinInfo` | 콘텐츠 | 2 | 페이지 |
| point | `dispPointAdminConfig` | 회원 | 1 | 포인트 |
| point | `dispPointAdminModuleConfig` | 회원 | 2 | 포인트 |
| point | `dispPointAdminPointList` | 회원 | 2 | 포인트 |
| poll | `dispPollAdminConfig` | 보충(파라미터 화면) | 1 | 설문 |
| poll | `dispPollAdminList` | 콘텐츠 | 1 | 설문 |
| poll | `dispPollAdminResult` | 보충(파라미터 화면) | 1 | 설문 |
| rss | `dispRssAdminIndex` | 고급 | 1 | RSS |
| session | `dispSessionAdminIndex` | 고급 | 1 | 세션 관리 |
| spamfilter | `dispSpamfilterAdminConfigBlock` | 콘텐츠 | 1 | 스팸필터 |
| spamfilter | `dispSpamfilterAdminConfigCaptcha` | 콘텐츠 | 1 | 스팸필터 |
| spamfilter | `dispSpamfilterAdminConfigCaptchaTest` | 콘텐츠 | 1 | 스팸필터 |
| spamfilter | `dispSpamfilterAdminDeniedIPList` | 콘텐츠 | 1 | 스팸필터 |
| spamfilter | `dispSpamfilterAdminDeniedWordList` | 콘텐츠 | 3 | 스팸필터 |
| tag | `dispTagAdminConfig` | 고급 | 1 | 태그 |
| trash | `dispTrashAdminList` | 콘텐츠 | 1 | 휴지통 |
| trash | `dispTrashAdminView` | 보충(파라미터 화면) | 1 | 휴지통 - 서버 오류 |
| widget | `dispWidgetAdminAddContent` | 보충(파라미터 화면) | 1 | 설치된 위젯 |
| widget | `dispWidgetAdminDownloadedList` | 고급 | 1 | 설치된 위젯 |
| widget | `dispWidgetAdminGenerateCode` | 고급 | 3 | 설치된 위젯 |

## 보충 방문 결과 (본문 앞부분)

오류 문구가 보이면 표본 레코드가 없거나 화면이 폐기된 것이다 — 판정 때 사람이 확인한다.

- `dispAddonAdminInfo` (addon, 파라미터 {"selected_addon":"autolink"}) — 설치된 애드온
  - 애드온 제작자 제목 자동 링크 애드온 ver. 작성자 NAVER (http://xpressengine.com/, developers@xpressengine.com) 등록일 1970-01-01 설명 글과 댓글의 내용 중 URL 문자열에 링크를 걸어주는 애드온입니다.
- `dispAdminConfigFtp` (admin, 파라미터 null) — FTP 설정
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 사용할 수 없는 기능입니다. modules/admin/admin.admin.view.php:27 돌아가기 로그아웃 Powered by Rhymix 2.1.41 관리자 메뉴 초기화 | 캐시파일 재생성 | 세션 정리
- `dispAdminIndex` (admin, 파라미터 null) — 시스템 설정
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 대시보드 설치 마무리 작업이 필요합니다. 최근 설치되거나 업데이트된 모듈을 사용하려면 마무리 작업이 필요해요. 회원 (member) DB 테이블 생성 회원 (member) 설치 마무리하기 문서 (document)
- `dispAdminInsertDomain` (admin, 파라미터 null) — 시스템 설정
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 시스템 설정 사이트 설정 알림 설정 보안 설정 고급 설정 디버그 설정 SEO 설정 비동기 작업 사이트 잠금 사이트 제목 다국어 텍스트 설정 사이트 부제목 다국어 텍스트 설정 도메인 기본 도메인 HTTP 포트 HT
- `dispAdminRewriteTest` (admin, 파라미터 null) — -
  - {"result":0,"error":0,"message":"success"}
- `dispAutoinstallAdminPackageDetail` (autoinstall, 파라미터 null) — 쉬운 설치
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 잘못된 요청입니다. modules/autoinstall/autoinstall.admin.view.php:80 돌아가기 로그아웃 Powered by Rhymix 2.1.41 관리자 메뉴 초기화 | 캐시파일 재생성 
- `dispBoardAdminDeleteBoard` (board, 파라미터 {"module_srl":"51"}) — 게시판
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 게시판 관리 > board 도움말 삭제하시겠습니까? 모듈 이름 board 모듈 board 글 수 0 돌아가기 Powered by Rhymix 2.1.41 관리자 메뉴 초기화 | 캐시파일 재생성 | 세션 정리 | 
- `dispBoardAdminInsertBoard` (board, 파라미터 {"module_srl":"51"}) — 게시판
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 게시판 관리 > board 도움말 게시판 목록 게시판 정보 분류 관리 확장 변수 권한 관리 추가 설정 스킨 설정 모바일 스킨 설정 기본 설정 Toggle this section URL 모든 도메인 localhos
- `dispCommentAdminDeclaredLogByCommentSrl` (comment, 파라미터 null) — 댓글
  - 불량 댓글 신고 댓글 신고 이유 신고자 신고 이유 날짜 « 첫 페이지 1 끝 페이지 »
- `dispDocumentAdminAlias` (document, 파라미터 {"document_srl":"67"}) — 문서
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 문서 문서 목록 기본 설정 신고 목록 별칭(Alias) 제목 별칭(Alias) Welcome to Rhymix Powered by Rhymix 2.1.41 관리자 메뉴 초기화 | 캐시파일 재생성 | 세션 정리 |
- `dispDocumentAdminDeclaredLogByDocumentSrl` (document, 파라미터 {"target_srl":"67"}) — 문서
  - 불량 게시글 신고 Welcome to Rhymix HELLO, WORLD! WELCOME TO RHYMIX Rhymix는 자유로운 웹 콘텐츠 발행을 돕는 CMS입니다. 간편한 설치와 다양한 추가 프로그램을 활용하여 자신만의 웹페이지를 쉽고 빠르게 만들 수 있습니다. 시작하기 admin 신고 이유 신고자 신고 이유 날짜 « 첫 페이지 1 끝 페이지 »
- `dispDocumentAdminTrashList` (document, 파라미터 null) — 문서
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 문서 문서 목록 기본 설정 신고 목록 모듈 찾기 Total 0, Page 1/1 번호 문서 옮긴 사람 삭제 날짜 IP 주소 설명 복원 ‹ 첫 페이지 1 끝 페이지 › Powered by Rhymix 2.1.41 
- `dispFileAdminEdit` (file, 파라미터 null) — 파일
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 잘못된 요청입니다. modules/file/file.admin.view.php:212 돌아가기 로그아웃 Powered by Rhymix 2.1.41 관리자 메뉴 초기화 | 캐시파일 재생성 | 세션 정리 | 코어 
- `dispLayoutAdminEdit` (layout, 파라미터 {"layout_srl":"106"}) — 설치된 레이아웃
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 레이아웃 편집 기능은 더이상 제공하지 않습니다. 이미 편집된 레이아웃에 한하여 편집을 허용하나, 추후 완전히 제거될 수 있습니다. modules/layout/layout.admin.view.php:234 돌아가기
- `dispLayoutAdminInsert` (layout, 파라미터 {"layout":"default","type":"P"}) — 설치된 레이아웃
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 설치된 레이아웃 > 기본 레이아웃 v1.7 > Powered by Rhymix 2.1.41 관리자 메뉴 초기화 | 캐시파일 재생성 | 세션 정리 | 코어 파일 정리 | 서버 환경 표시 | 버그 리포트
- `dispLayoutAdminLayoutModify` (layout, 파라미터 {"layout_srl":"106"}) — -
  - Template not found: modules/layout/tpl/about_faceoff.html
- `dispMemberAdminInsert` (member, 파라미터 {"member_srl":"5"}) — 회원정보 조회/수정
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 회원정보 조회/수정 * 아이디 * 이메일 주소 * 비밀번호 * 이름 * 닉네임 홈페이지 블로그 생일 메일링 가입 예 아니오 쪽지 허용 모두 허용 등록된 친구들만 허용 모두 금지 상태 승인 거부 미인증 제한일 지정
- `dispMemberAdminInsertJoinForm` (member, 파라미터 null) — 회원 목록
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 회원가입 추가 항목 생성 * 입력항목 ID 입력항목의 구분자로 사용될 ID입니다. 영문으로 시작하고 영문 숫자만 사용가능합니다. * 입력항목 제목 다국어 텍스트 설정 * 형식 기본값 설명 필수/선택 필수 선택 저
- `dispModuleAdminInfo` (module, 파라미터 {"selected_module":"board"}) — 설치된 모듈
  - 모듈 제작자 제목 게시판 ver RX_VERSION 작성자 NAVER (http://xpressengine.com/, developers@xpressengine.com) 등록일 1970-01-01 설명 게시판의 기능을 담당. 게시판의 생성/추가 관리등의 관리자 기능도 포함합니다.
- `dispModuleAdminModuleAdditionSetup` (module, 파라미터 {"module_srls":"51"}) — 설치된 모듈
  - 일괄 추가 설정
- `dispModuleAdminModuleGrantSetup` (module, 파라미터 {"module_srls":"51"}) — 설치된 모듈 - 서버 오류
  - 서버 오류 TypeError #0 "count(): Argument #1 ($value) must be of type Countable|array, stdClass given" in modules/module/module.admin.view.php on line 234 배열이 아닌 변수에 배열 함수를 사용하려 하고 있습니다. 오래된 자료에서 종종 사용하던 
- `dispModuleAdminModuleSetup` (module, 파라미터 {"module_srls":"51"}) — 설치된 모듈
  - 일괄 기본 설정 모듈 분류 기존 값 유지 미사용 모듈 분류 관리는 모듈 분류에서 할 수 있습니다. 레이아웃 기존 값 유지 미사용 사이트 기본 레이아웃 사용(XEDITION) 테스트 레이아웃(user_layout) 기본 레이아웃(default) XEDITION(xedition) 사이트의 레이아웃을 쉽게 만들 수 있도록 도와줍니다. 레이아웃 설정과 메뉴의 연결
- `dispPageAdminContentModify` (page, 파라미터 {"module_srl":"49"}) — 페이지
  - 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free Board Q&A Notice Welcome HELLO, WORLD! WELCOME TO RHYMIX Rhymix는 자유로운 웹 콘텐츠 발행을 돕는 CMS입니다. 간편한 설치와 다양한 추가 프로그램을 활용하여 자신
- `dispPageAdminDelete` (page, 파라미터 {"module_srl":"49"}) — 페이지
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 페이지 관리 > index 삭제하시겠습니까? 페이지를 삭제할 때 파일도 함께 삭제합니다 모듈 이름 index 모듈 page 삭제 돌아가기 Powered by Rhymix 2.1.41 관리자 메뉴 초기화 | 캐시파
- `dispPageAdminMobileContent` (page, 파라미터 {"module_srl":"49"}) — 페이지
  - 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free Board Q&A Notice Welcome 모바일에서 보여질 페이지입니다. 만약 작성하지 않으면 기본 페이지 데이터를 재정렬해서 보여줍니다. 캐시파일 재생성 설정 페이지 수정 PC Rhymix Rhymix is 
- `dispPageAdminMobileContentModify` (page, 파라미터 {"module_srl":"49"}) — 페이지
  - 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free Board Q&A Notice Welcome HELLO, WORLD! WELCOME TO RHYMIX Rhymix는 자유로운 웹 콘텐츠 발행을 돕는 CMS입니다. 간편한 설치와 다양한 추가 프로그램을 활용하여 자신
- `dispPollAdminConfig` (poll, 파라미터 null) — 설문
  - 메뉴 건너뛰기 localhost admin 로그아웃 한국어 Menu Open/Close 대시보드 사이트 제작/편집 회원 콘텐츠 즐겨찾기 설정 고급 설문 관리 설문조사 목록 보기 기본 설정 스킨 설문조사 기본 스킨 (default) 설문조사 간단한 스킨 (simple) 컬러셋 기본 (normal) Powered by Rhymix 2.1.41 관리자 메뉴 초기
- `dispPollAdminResult` (poll, 파라미터 null) — 설문
  - 선택한 설문이 존재하지 않습니다. modules/poll/poll.admin.view.php:145 돌아가기 로그아웃
- `dispTrashAdminView` (trash, 파라미터 null) — 휴지통 - 서버 오류
  - 서버 오류 Error #0 "Call to a member function getTrashSrl() on null" in modules/trash/trash.admin.view.php on line 106 modules/trash/trash.admin.view.php:106 돌아가기 로그아웃
- `dispWidgetAdminAddContent` (widget, 파라미터 {"module_srl":"49"}) — 설치된 위젯
  - 내용 직접 추가 소스 스타일 문단 글꼴 크기 ▲ ◢ 사진 및 파일 첨부 여기에 파일을 끌어 놓거나 왼쪽의 버튼을 클릭하세요.
