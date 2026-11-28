# 레거시 방문자 화면 지도

- 대상: http://localhost:8080 · 레거시 소스: `/mnt/d/project/rhymix`
- 수집 시각: 2026-11-28T07:27:29.180Z
- module.xml 선언 비관리자 disp 액션: 81 (방문 76, 제외: install 모듈·dispMemberLogout)
- 표본: `{"mid":"board","document_srl":"114","comment_srl":"116","member_srl":"5"}`
- 신분: 비회원(guest), 관리자(admin). 일반 회원 계정은 기준선에 없어 관리자 화면으로 회원 화면을 본다.

| 모듈 | act | permission | 비회원 | 관리자 |
|---|---|---|---|---|
| board | `dispBoardContent` | list | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board 번호 제목 글쓴이  | Free Board · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardWrite` | write_document | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board 최고관리자의 게시물 | Free Board · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardDelete` | write_document | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board 권한이 없습니다.  | Free Board · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardWriteComment` | write_comment | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board 글꼴 크기 소스 ▲ | Free Board · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardReplyComment` | write_comment | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board admin 크롤 표 | Free Board · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardModifyComment` | write_comment | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board 권한이 없습니다.  | Free Board · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardDeleteComment` | write_comment | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board 권한이 없습니다.  | Free Board · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardDeleteTrackback` | list,view | Free Board · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board Template n | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardContentList` | list | Free Board · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board Template n | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardContentView` | view | [크롤 표본] 레거시 지도 수집용 글 · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board Template n | [크롤 표본] 레거시 지도 수집용 글 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardUpdateLog` | update_view | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice msg_not_logged keep_s | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardUpdateLogView` | update_view | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice msg_not_logged keep_s | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardVoteLog` | vote_log_view | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice msg_not_logged keep_s | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardNotFound` | - | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board 대상을 찾을 수 없 | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardNoticeList` | list | Free Board · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board Template n | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardCategoryList` | list | Free Board · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board Template n | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardContentCommentList` | view | [크롤 표본] 레거시 지도 수집용 글 · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board Template n | [크롤 표본] 레거시 지도 수집용 글 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardContentFileList` | view | [크롤 표본] 레거시 지도 수집용 글 · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board Template n | [크롤 표본] 레거시 지도 수집용 글 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardTagList` | list | Free Board · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board 돌아가기 Rhymi | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardCategory` | list | Free Board · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board Template n | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| board | `dispBoardCommentPage` | view | Free Board · 폼 1 · 댓글 1 admin 2026.11.28 14:18 크롤 표본 댓글 댓글 글꼴 크기 소스 ▲ ◢ 사진 및 파일 첨부 여기에 파일을 끌어 놓거나 왼 | Free Board · 폼 1 · 댓글 1 admin 2026.11.28 14:18 크롤 표본 댓글 댓글 수정 삭제 이 댓글을 글꼴 크기 소스 ▲ ◢ 사진 및 파일 첨부 여기에  |
| comment | `dispCommentDeclare` | member | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice msg_not_logged keep_s | Free Board · 폼 1 · 불량 댓글 신고 × 댓글 크롤 표본 댓글 신고 이유 본문 주제나 흐름에 맞지 않는 광고 글입니다. 주제에 맞지 않는 글입니다. 과도한 욕설을 담 |
| communication | `dispCommunicationMessages` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 받은 쪽지함 · 폼 5 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| communication | `dispCommunicationSendMessage` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 · 폼 0 · 잘못된 요청입니다. modules/communication/communication.view.php:246 돌아가기 로그아웃 |
| communication | `dispCommunicationNewMessage` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 - 서버 오류 · 폼 0 · 서버 오류 TypeError #0 "count(): Argument #1 ($value) must be of type Countable/arra |
| communication | `dispCommunicationFriend` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 친구 보기 · 폼 4 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| communication | `dispCommunicationAddFriend` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 · 폼 0 · 잘못된 요청입니다. modules/communication/communication.view.php:436 돌아가기 로그아웃 |
| communication | `dispCommunicationAddFriendGroup` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 친구 그룹 생성 · 폼 1 · 친구 그룹 생성 그룹명을 입력해 주세요. |
| communication | `dispCommunicationMessageBoxList` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| document | `dispDocumentPrint` | - | [크롤 표본] 레거시 지도 수집용 글 · 폼 0 · [크롤 표본] 레거시 지도 수집용 글 admin 2026.11.28 14:18:18 크롤 표본 본문. 수집 후 기준선 덤프로 복원된다. | [크롤 표본] 레거시 지도 수집용 글 · 폼 0 · [크롤 표본] 레거시 지도 수집용 글 admin 2026.11.28 14:18:18 크롤 표본 본문. 수집 후 기준선 덤프로 복원된다. |
| document | `dispDocumentPreview` | - | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice 보안정책상 허용되지 않습니다. keep | Free Board · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| document | `dispTempSavedList` | member | Free Board · 폼 1 · 잘못된 요청입니다. ERR_ACT_NOT_FOUND 관리자 로그인 | Free Board · 폼 0 · 잘못된 요청입니다. ERR_ACT_NOT_FOUND classes/module/ModuleHandler.class.php:487 돌아가기 로그아 |
| document | `dispDocumentDeclare` | member | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice msg_not_logged keep_s | Free Board · 폼 1 · 불량 게시글 신고 × [크롤 표본] 레거시 지도 수집용 글 크롤 표본 본문. 수집 후 기준선 덤프로 복원된다. 신고 이유 주제나 흐름에 맞지 않 |
| document | `dispDocumentManageDocument` | all-managers | Free Board · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice msg_not_logged keep_s | Free Board · 폼 1 · 게시물 관리 × 선택한 문서가 없습니다. |
| editor | `dispEditorComponentInfo` | - | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| editor | `dispEditorFrame` | - | - · 폼 1 · 소스 스타일 본문 sans-serif 13 ▲ ◢ body p | - · 폼 1 · 소스 스타일 본문 sans-serif 13 ▲ ◢ body p |
| editor | `dispEditorPopup` | - | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| editor | `dispEditorSkinColorset` | all-managers | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| editor | `dispEditorConfigPreview` | root | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 1 · 글꼴 크기 소스 ▲ ◢ |
| krzip | `dispKrzipSearchForm` | - | - · 폼 0 · Template not found: modules/krzip/tpl/searchForm.daumapi.html | - · 폼 0 · Template not found: modules/krzip/tpl/searchForm.daumapi.html |
| layout | `dispLayoutPreviewWithModule` | root | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 CREATE A GOO |
| member | `dispMemberIndex` | - | 로그인 · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Membership 로그인 로그인 유지 | 회원정보 보기 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberSignUpForm` | - | 회원가입 · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Membership 회원가입 * 아이디 | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberLoginForm` | - | 로그인 · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Membership 로그인 로그인 유지 | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberFindAccount` | - | ID/PW 찾기 · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Membership 이메일 주소로 계정 | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberResendAuthMail` | - | 인증메일 재발송 · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice 회원 인증메일 재발송 가입 인증 메일을 | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberInfo` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원정보 보기 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberModifyInfo` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원정보 변경 · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberModifyPassword` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 비밀번호 변경 · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberModifyEmailAddress` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원정보 변경 · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberLeave` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 탈퇴 · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberScrappedDocument` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 스크랩 보기 · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberSavedDocument` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 저장함 보기 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberOwnDocument` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 작성 글 보기 · 폼 3 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberOwnComment` | member | [크롤 표본] 레거시 지도 수집용 글 · 폼 4 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice Free Board [크롤 표본] 레거 | [크롤 표본] 레거시 지도 수집용 글 · 폼 4 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberActiveLogins` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 자동 로그인 관리 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberAuthLog` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberModifyNicknameLog` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| member | `dispMemberSpammer` | root | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 · 폼 1 · 스패머 관리 × 지정된 회원을 차단하고, 회원이 남긴 글과 댓글을 삭제합니다. 회원이 작성한 게시물의 양에 따라 오래걸릴 수 있습니다. 닉네임  |
| menu | `dispMenuMenu` | - | - · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| message | `dispMessage` | - | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| module | `dispModuleSelectList` | all-managers | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 서버 오류 · 폼 0 · 서버 오류 TypeError #0 "escape_js(): Argument #1 ($str) must be of type string, null |
| module | `dispModuleSkinInfo` | all-managers | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| module | `dispModuleFileBox` | root | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| module | `dispModuleFileBoxAdd` | root | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 1 · 파일박스 설명 파일 |
| module | `dispModuleChangeLang` | - | - · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| ncenterlite | `dispNcenterliteNotifyList` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 내 알림 목록 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| ncenterlite | `dispNcenterliteUserConfig` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| ncenterlite | `dispNcenterliteUnsubscribeList` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| ncenterlite | `dispNcenterliteInsertUnsubscribe` | member | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | 회원 · 폼 0 · 잘못된 요청입니다. modules/ncenterlite/ncenterlite.view.php:187 돌아가기 로그아웃 |
| page | `dispPageIndex` | - | - · 폼 2 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| page | `dispPageNotFound` | - | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 2 · 메뉴 건너뛰기 검색 관리 회원정보 보기 스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리 로그아웃 Welcome Free |
| widget | `dispWidgetInfo` | all-managers | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 0 · 위젯 위젯 제작자 제목 ver 작성자 등록일 |
| widget | `dispWidgetGenerateCode` | root | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 1 · 스킨 선택 Content 위젯 기본 스킨(default) 네모의 꿈(simple_rectangle) 캐시 초 분 시 일 지정된 시간동안 캐시된  |
| widget | `dispWidgetGenerateCodeInPage` | all-managers | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 1 · Content 위젯 코드생성 게시판, 코멘트, 첨부파일 등 Content를 출력하는 위젯입니다. 아래 필요한 값들을 입력한 후 추가 버튼을 누르 |
| widget | `dispWidgetStyleGenerateCodeInPage` | all-managers | - · 폼 3 · 메뉴 건너뛰기 검색 로그인/회원가입 로그인 회원가입 Welcome Free Board Q&A Notice CREATE A GOOD DESIGN  | - · 폼 1 · 위젯스타일 심플 스트롱 |

## 방문하지 않은 액션

- install.`dispInstallIndex`
- install.`dispInstallCheckEnv`
- install.`dispInstallDBConfig`
- install.`dispInstallOtherConfig`
- member.`dispMemberLogout`
