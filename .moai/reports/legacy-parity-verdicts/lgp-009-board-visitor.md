# SPEC-LEGACY-PARITY-009 방문자 게시판·문서·댓글·커뮤니케이션 영역 판정표 (초안)

- 작성: moai2 (읽기 전용 조사, 저장소 파일 무수정)
- 입력: `.moai/reports/legacy-front-map/summary.md` + `pages/<act>-{guest,admin}.json` 중 board 21, document 4(`dispTempSavedList` 제외), comment 1, communication 7, editor 5 = 38 act
- 표본: 글 114, 댓글 116. 레거시 화면은 열지 않았고 근거 파일(`pages/*.json`의 `excerpt`·`forms`)로만 판정했다.
- 대상: `apps/web/app/[mid]/**`, `apps/web/app/(member)/{messages,drafts,documents,settings}`, `apps/web/app/{search,tag,tags}`, `packages/{board,document,comment,message,tag,file}`, `apps/web/server/api/routers/content/*`
- 판정 기준 (003·005·006 초안과 동일)
  - **대응 있음**: 같은 목적의 화면·동작이 있고 핵심 필드가 대부분 있음 (누락은 비고)
  - **격차**: 화면이 없거나, 있어도 레거시 필드 대부분이 없거나 쓰기 경로가 없음
  - **의도적 제외 후보**: 레거시 자체 결함·비활성, 또는 기능 자체를 뺀 근거가 있음 (최종 결정은 moai)
- 비회원/관리자 표기: 근거 파일은 `.moai/reports/legacy-front-map/pages/` 아래 `<act>-guest.json`, `<act>-admin.json` 한 쌍. 비고에 두 신분의 화면 차이를 적었다.
- 일반 회원 계정은 기준선에 없어 관리자 신분으로 회원 화면을 본 것이다 (summary.md 머리말).

## 1. 판정표

| 레거시 act | 화면 제목 (비회원 / 관리자 본문) | 근거 파일 | rhymix-ts 대응 | 판정 | 비고 |
|---|---|---|---|---|---|
| `dispBoardContent` | 게시판 글 목록 | dispBoardContent-{guest,admin}.json | `apps/web/app/[mid]/page.tsx` → `packages/board/src/routes/index-page.tsx` (분류 `categoryId`, 정렬 `sort`, 검색 `search`+`searchField`(제목/내용/작성자), `pageSize`, `view`, 공지 `notices`) + `content.document.list` (`routers/content/document.ts:108`) | 대응 있음 | 레거시 폼: `category`, `search_target`(제목+내용/제목/내용/댓글/이름/닉네임/아이디/등록일), `search_keyword`. 없는 것: 댓글·이름·아이디·등록일·태그 검색 대상. 관리자 전용 "게시물 관리"(체크박스 일괄)·"설정"·"태그 설정" 링크 없음. 레거시 목록은 글 1건(표본)과 `[1]` 댓글 수 표시 |
| `dispBoardWrite` | 글쓰기/수정 | dispBoardWrite-{guest,admin}.json | `apps/web/app/[mid]/write/page.tsx` + `packages/board/src/routes/write-form.tsx` (`title`, `content`, `moduleInstanceId`, 태그 `tags`, 투표 `poll*`) + `actions/create-document.ts:84` → `content.document.create` (`document.ts:155`; `status` PUBLIC/SECRET/TEMP, `categoryId`, `extraVars`) | 대응 있음 | 레거시 관리자 폼: `title`, `content`, `is_notice`(공지), `title_bold`, `comment_status`(댓글 허용), `allow_trackback`, `notify_message`(알림), `status`, `tags`, `Filedata`(첨부), `use_editor`/`use_html`. 없는 것: 공지 지정 입력, 제목 굵게, 댓글 허용 토글, 엮인글 허용, 알림 수신 선택. 비회원 글쓰기 불가(`document.create` 가 `protectedProcedure`). 비회원 화면은 "최고관리자의 게시물을 수정할 권한이 없습니다"(권한 차단) |
| `dispBoardDelete` | 글 삭제 확인 | dispBoardDelete-{guest,admin}.json | `view-page.tsx:280` 삭제 버튼 + `content.document.delete` (`document.ts:279`) | 대응 있음 | 레거시 관리자: "이 문서를 삭제하시겠습니까?" + 취소. 비회원: "권한이 없습니다." 별도 확인 화면의 유무는 확인하지 않음 |
| `dispBoardWriteComment` | 댓글 작성 폼 | dispBoardWriteComment-{guest,admin}.json | `packages/board/src/components/CommentForm.tsx` + `actions/comment-create.ts:46` → `content.comment.create` (`routers/content/comment.ts:62`; `documentId`, `parentId`, `content`) | 대응 있음 | 없는 것: 비회원 댓글(`nick_name`, `password`, `homepage` — `comment.create` 가 `protectedProcedure` 라 비회원 불가), 댓글 첨부(`Filedata`), 알림(`notify_message`). 비밀 댓글은 `CommentItem.tsx` 에 표시 처리가 있으나 작성 폼의 비밀 입력은 확인하지 못함 |
| `dispBoardReplyComment` | 대댓글 작성 폼 | dispBoardReplyComment-{guest,admin}.json | `CommentForm.tsx` 의 `parentId` + `comment.create` | 대응 있음 | `dispBoardWriteComment` 와 같은 필드 격차. 레거시는 원 댓글 본문(admin 크롤 표본 댓글)을 위에 표시 |
| `dispBoardModifyComment` | 댓글 수정 폼 | dispBoardModifyComment-{guest,admin}.json | `packages/board/src/actions/comment-update.ts:58` (`handleCommentUpdateForm`, 작성자 검사 `CommentOwnershipError` `:31`) | 대응 있음 | 레거시 비회원: "권한이 없습니다". 첨부·알림 필드 격차는 작성 폼과 동일 |
| `dispBoardDeleteComment` | 댓글 삭제 확인 | dispBoardDeleteComment-{guest,admin}.json | `actions/comment-delete.ts:43` + `content.comment.delete` (`comment.ts:152`) | 대응 있음 | 레거시 관리자 필드 `instant_delete`("완전 삭제" 체크). rhymix-ts 삭제가 휴지통 이동인지 완전 삭제인지 선택 입력은 확인하지 못함 |
| `dispBoardDeleteTrackback` | 엮인글 삭제 | dispBoardDeleteTrackback-{guest,admin}.json | 없음. 엮인글 기능 자체가 없음 (`grep -rliE "trackback"` 는 `packages/document/src/__fixtures__.ts` 한 파일뿐) | 의도적 제외 후보 | 레거시도 두 신분 모두 "Template not found:" 오류만 표시(`excerpt`). 쓰기 폼의 `allow_trackback` 도 rhymix-ts 에 없음. 제외를 확정한 문서는 찾지 못함 — moai 확인 필요 |
| `dispBoardContentList` | 글 목록 조각 | dispBoardContentList-{guest,admin}.json | 목록은 `index-page.tsx` 가 담당 | 대응 있음 | 레거시 단독 호출 시 두 신분 모두 "Template not found:" 오류(스킨 조각 act 를 직접 연 결과). 목록 기능 자체는 `dispBoardContent` 행이 대응 |
| `dispBoardContentView` | 글 보기 조각 | dispBoardContentView-{guest,admin}.json | `apps/web/app/[mid]/[id]/page.tsx` → `packages/board/src/routes/view-page.tsx` + `content.document.get` (`document.ts:141`) | 대응 있음 | 레거시 단독 호출은 "Template not found:" 오류(제목은 표본 글 제목이 잡힘). 본문·작성자·날짜·추천수 `votedCount`(`view-page.tsx:164`)·이전/다음 글 `adjacent`·첨부 목록 `listAttachments`(`view-page.tsx:17,79`)·신고 버튼·설문 위젯 표시 |
| `dispBoardNoticeList` | 공지 목록 조각 | dispBoardNoticeList-{guest,admin}.json | `index-page.tsx` 의 `notices` | 대응 있음 | 레거시 단독 호출은 "Template not found:" 오류. 공지 지정 입력은 쓰기 폼에 없음(`dispBoardWrite` 행) |
| `dispBoardCategoryList` | 분류 목록 조각 | dispBoardCategoryList-{guest,admin}.json | `index-page.tsx` 분류 select (`categoryTree`, `:294`) + `content.category.tree` (`routers/content/category.ts:14`) | 대응 있음 | 레거시 단독 호출은 "Template not found:" 오류 |
| `dispBoardCategory` | 분류 보기 | dispBoardCategory-{guest,admin}.json | `index-page.tsx` 분류 필터 `categoryId` | 대응 있음 | **레거시 결함**: "Template not found: modules/board/skins/xedition/category.html" (두 신분 모두) |
| `dispBoardContentCommentList` | 글의 댓글 목록 조각 | dispBoardContentCommentList-{guest,admin}.json | `packages/board/src/components/CommentList.tsx` + `content.comment.list` (`comment.ts:58`) | 대응 있음 | 레거시 단독 호출은 "Template not found:" 오류 |
| `dispBoardContentFileList` | 글의 첨부 목록 조각 | dispBoardContentFileList-{guest,admin}.json | `view-page.tsx` 가 `listAttachments` 로 첨부 목록 표시 (`:17,79`) | 대응 있음 | 레거시 단독 호출은 "Template not found:" 오류 |
| `dispBoardTagList` | 태그 목록 | dispBoardTagList-{guest,admin}.json | `apps/web/app/tags/page.tsx`(태그 클라우드) + `apps/web/app/tag/[tagName]/page.tsx` + `packages/board/src/components/TagListPage.tsx` | 대응 있음 | 레거시 본문은 "돌아가기"만 보이는 빈 목록(표본에 태그 없음). 게시판 단위가 아니라 사이트 단위 태그 화면 |
| `dispBoardCommentPage` | 댓글 페이지(ajax) | dispBoardCommentPage-{guest,admin}.json | `CommentList.tsx` 가 글 보기 안에서 댓글 렌더 | 대응 있음 | 레거시는 댓글 영역만 반환하는 조각(댓글 1건 + 작성 폼). 댓글 페이지네이션 동작은 `CommentList.tsx` 에서 확인하지 못함. 비회원은 닉네임·비밀번호·홈페이지 입력이 있고 rhymix-ts 에는 없음 |
| `dispBoardUpdateLog` | 수정 로그 목록 | dispBoardUpdateLog-{guest,admin}.json | `apps/web/app/(member)/documents/[id]/history/page.tsx` ("수정 이력") + `content.history.document` (`routers/content/history.ts:32`) | 대응 있음 | 레거시 비회원: 로그인 필요 안내(`msg_not_logged`). 관리자: "업데이트 로그가 기록되어 있지 않은 게시글입니다." 표본에 로그가 없어 열 구성(제목·글쓴이·수정한 사람·최종)만 확인 |
| `dispBoardUpdateLogView` | 수정 로그 상세 | dispBoardUpdateLogView-{guest,admin}.json | 수정 이력 화면 (`history/page.tsx`) | 대응 있음 | 레거시 관리자: "잘못된 요청입니다. modules/board/board.view.php:1538" (로그 번호 파라미터 없이 열린 결과). 비회원: 로그인 안내 |
| `dispBoardVoteLog` | 추천 로그 | dispBoardVoteLog-{guest,admin}.json | 없음. 권한 키 `vote_log_view` 만 `packages/board/src/permissions.ts` 에 있고 화면·라우트 없음 | 의도적 제외 후보 | 레거시 관리자도 "사용할 수 없는 기능입니다. modules/board/board.view.php:1591" (기준선에서 비활성). 비회원은 로그인 안내. 제외를 확정한 문서는 찾지 못함 — moai 확인 필요 |
| `dispBoardNotFound` | 대상 없음 | dispBoardNotFound-{guest,admin}.json | `view-page.tsx:88` `notFound()` 등 Next.js 404 | 대응 있음 | 레거시 문구 "대상을 찾을 수 없습니다." |
| `dispDocumentPrint` | 글 인쇄 보기 | dispDocumentPrint-{guest,admin}.json | 없음 (`grep -rliE "print/인쇄"` 결과 0건) | 격차 | 레거시는 폼 0개의 단순 본문 화면(제목·작성자·날짜·본문). 두 신분 동일. 인쇄 전용 보기가 없음 |
| `dispDocumentPreview` | 글 미리보기 | dispDocumentPreview-{guest,admin}.json | 없음. 글쓰기 화면이 Tiptap WYSIWYG 라 별도 미리보기가 필요 없음 (`packages/board/src/components/TiptapEditor.tsx`) | 의도적 제외 후보 | 레거시도 두 신분 모두 "보안정책상 허용되지 않습니다. modules/document/document.view.php:55" 로 차단(관리자 본문에 소스 줄 표시) |
| `dispDocumentDeclare` | 글 신고 | dispDocumentDeclare-{guest,admin}.json | `apps/web/components/report/ReportButton.tsx:33` → `content.report.create` (`routers/content/report.ts:15`; `documentId`, `reason` 1~500자) | 대응 있음 | 레거시 관리자 폼: `target_srl`, `message_option`(사전 정의된 신고 이유 목록: 광고, 주제 이탈, 욕설, 폭력, 차별 등), `declare_message`(직접 입력). rhymix-ts 는 `reason` 자유 입력 하나라 사전 정의 이유 선택이 없음(`ReportButton.tsx` 의 선택 UI 여부는 미확인). 비회원: 로그인 안내 |
| `dispDocumentManageDocument` | 게시물 관리(일괄 이동·복사·삭제) | dispDocumentManageDocument-{guest,admin}.json | 방문자 화면 없음 (`grep -rliE "manageDocument/copyDocument/moveDocument"` 결과 0건). 관리자 쪽에는 `admin.document.bulkUpdate` 가 있음 | 격차 | 레거시 관리자 본문 "선택한 문서가 없습니다."(파라미터 없이 열림), 폼 `type`. 게시판 관리자가 목록에서 체크한 글을 이동·복사·삭제하는 팝업. 방문자 목록에 체크박스 자체가 없음 |
| `dispCommentDeclare` | 댓글 신고 | dispCommentDeclare-{guest,admin}.json | `ReportButton.tsx` → `content.report.create` (`commentId`) | 대응 있음 | `dispDocumentDeclare` 와 같은 사전 정의 이유 격차. 레거시 관리자 본문은 신고 이유 목록이 `본문`과 함께 표시 |
| `dispCommunicationMessages` | 쪽지함(받은/보낸/보관/읽지 않은) | dispCommunicationMessages-{guest,admin}.json | `apps/web/app/(member)/messages/page.tsx` (`folder` inbox/sent, 읽음 처리, 일괄 삭제 `actions.ts:26,43`) + `content.message.list/read/delete` (`routers/content/message.ts:87/97/120`) | 대응 있음 | 레거시 폼: `message_type`, `allow_message`(전체 수신/친구만/수신 거부), `check_all`, `search_target`/`search_keyword`. 없는 것: 보관함, 읽지 않은 쪽지함, 검색, 수신 범위 3단계(rhymix-ts 설정 `settings/messages` 는 `allowMessages` 켜기/끄기 하나). 비회원은 로그인 필요(레거시: 로그인 화면 본문) |
| `dispCommunicationSendMessage` | 쪽지 보내기 | dispCommunicationSendMessage-{guest,admin}.json | `apps/web/components/message/SendMessageButton.tsx:47` → `content.message.send` (`message.ts:55`; `receiverId`, `subject` ≤200, `content` ≤2000) | 대응 있음 | 레거시 관리자 화면은 "잘못된 요청입니다. modules/communication/communication.view.php:246"(수신자 파라미터 없이 열림). 레거시에 있는 쪽지 첨부(`enable_attachment`)는 rhymix-ts 에 없음 |
| `dispCommunicationNewMessage` | 새 쪽지 작성 | dispCommunicationNewMessage-{guest,admin}.json | 위 `SendMessageButton` 과 `message.send` | 대응 있음 | **레거시 결함**: 관리자 신분에서 TypeError "count(): Argument #1 ($value) must be of type Countable 또는 array, null given" (`modules/communication/communication.model.php` 180행). 기능은 `dispCommunicationSendMessage` 행과 같음 |
| `dispCommunicationFriend` | 친구 목록 | dispCommunicationFriend-{guest,admin}.json | 없음 (`grep -rliE "friend/친구"` 결과 0건) | 격차 | 레거시 관리자 폼: `jumpMenu`, `check_all`, `friend_group_srl`. 본문 "친구 보기, 그룹 미지정, 이동, 친구 그룹 생성, 친구 그룹/닉네임/등록일/삭제" |
| `dispCommunicationAddFriend` | 친구 추가 | dispCommunicationAddFriend-{guest,admin}.json | 없음 | 격차 | 레거시 관리자 화면은 "잘못된 요청입니다. modules/communication/communication.view.php:436"(대상 회원 파라미터 없이 열림). 친구 기능 자체가 없음 |
| `dispCommunicationAddFriendGroup` | 친구 그룹 생성 | dispCommunicationAddFriendGroup-{guest,admin}.json | 없음 | 격차 | 레거시 관리자 폼 `friend_group_srl`, `window_type`, `title`(그룹명). 친구 기능 자체가 없음 |
| `dispCommunicationMessageBoxList` | 쪽지함 선택 | dispCommunicationMessageBoxList-{guest,admin}.json | `messages/page.tsx` 의 inbox/sent 탭 | 대응 있음 | 레거시는 받은/보낸/보관/읽지 않은 쪽지함 링크 목록. rhymix-ts 는 받은·보낸 2개 |
| `dispEditorComponentInfo` | 에디터 컴포넌트 정보 | dispEditorComponentInfo-{guest,admin}.json | 없음. 본문 에디터는 Tiptap (`TiptapEditor.tsx`) | 의도적 제외 후보 | 근거: `.moai/specs/SPEC-CONTENT-PARITY-001/spec.md:71-73,126` — SPEC-MODULE-BACKLOG-001 triage 에서 레거시 editor 모듈 DROP(Tiptap 대체). 레거시 응답은 사이트 껍데기만 보이는 빈 화면 |
| `dispEditorFrame` | 에디터 iframe 프레임 | dispEditorFrame-{guest,admin}.json | 없음 | 의도적 제외 후보 | 레거시 에디터 iframe 용 내부 화면(폼 `primary_key`, `content`, `use_editor`, `use_html`). Tiptap 은 iframe 을 쓰지 않음. 위 SPEC 근거 동일 |
| `dispEditorPopup` | 에디터 컴포넌트 팝업 | dispEditorPopup-{guest,admin}.json | 없음 (이미지 업로드는 `TiptapEditor.tsx:54` `uploadImageFile` 로 대체) | 의도적 제외 후보 | 위 SPEC 근거 동일. 레거시 응답은 빈 화면(컴포넌트 이름 파라미터 없이 열림) |
| `dispEditorSkinColorset` | 에디터 색상 세트 | dispEditorSkinColorset-{guest,admin}.json | 없음 | 의도적 제외 후보 | 위 SPEC 근거 동일. 권한 `all-managers`, 빈 화면 |
| `dispEditorConfigPreview` | 에디터 설정 미리보기 | dispEditorConfigPreview-{guest,admin}.json | 없음 | 의도적 제외 후보 | 위 SPEC 근거 동일. 권한 `root`, 관리자 신분에서만 폼(`dummy_content`, `dummy_key`, `use_editor`, `use_html`) 노출. 관리자 에디터 설정 화면(`dispEditorAdminIndex`)이 003 에서 이미 제외 후보 |

### 1.1 집계

| 판정 | 행 수 |
|---|---:|
| 대응 있음 | 25 |
| 격차 | 5 |
| 의도적 제외 후보 | 8 |
| 합계 | 38 |

(§3.2 `awk` 재집계값과 일치 확인: 25 / 5 / 8, 합계 38, 빈 판정 0.)

## 2. 요약

- 레거시 board 21 act 중 상당수(`ContentList`, `ContentView`, `NoticeList`, `CategoryList`, `ContentCommentList`, `ContentFileList`, `Category`, `DeleteTrackback`)는 단독 호출 시 "Template not found:" 오류를 낸다. 스킨 조각 act 를 직접 연 결과이며, 기능은 대응하는 본 화면(`dispBoardContent` 등) 행으로 판정했다.
- 격차가 분명한 곳: 문서 인쇄 보기, 게시물 관리(일괄 이동·복사), 친구 목록·친구 추가·친구 그룹 생성(5행). 이 중 친구·인쇄·상담은 peer 의 0단계 grep 결과와 일치했다.
- 부분 대응(대응 있음이나 필드 격차가 큼): 쓰기 폼의 공지·제목 굵게·댓글 허용·엮인글·알림, 비회원 글·댓글(닉네임·비밀번호·홈페이지), 쪽지 보관함·읽지 않은 쪽지함·검색·수신 범위, 신고 사유 목록.
- 상담 게시판(`Board.consultation`): 소스 재확인 결과 `packages/board/src/{config,on-install,permissions}.ts` 에 값·권한 키(`consultation_read`)만 있고 방문자 화면 분기는 확인되지 않음. 이번 38 act 에는 대응하는 레거시 act 가 없어 판정표 행으로는 넣지 않았다.

## 3. 판정 근거 명령과 실제 출력 요약

모두 `/mnt/d/project/rhymix-ts` 에서 읽기 전용으로 실행했다. 레거시 화면·소스는 열지 않았다.

1. 대상 act: `summary.md` 표의 board 21, document 5(`dispTempSavedList` 제외 4), comment 1, communication 7, editor 5 → 38행
2. 레거시 폼·본문: `pages/<act>-{guest,admin}.json` 의 `permission`, `title`, `excerpt`, `forms[].fields[].name` (`mid`, `act`, `is_keyword`, `user_id`, `password`, `keep_signed` 등 사이트 공통 로그인·검색 필드는 제외하고 읽음)
3. 방문자 라우트: `find apps/web/app/[mid] apps/web/app/(member) apps/web/app/search apps/web/app/tag -name page.tsx -o -name route.ts` → `[mid]/page.tsx`, `[mid]/[id]/page.tsx`, `[mid]/write`, `[mid]/[id]/edit`, `[mid]/{rss,atom}/route.ts`, `(member)/{messages,drafts,notifications,settings/*}`, `(member)/documents/[id]/history`, `search`, `tag/[tagName]`, `tags`
4. 비관리자 tRPC: `grep -n "^  [a-zA-Z]*: (protected|public)Procedure" routers/content/*.ts` → document list 108·get 141·create 155·update 244·delete 279·adjacent 296·vote 316, comment list 58·create 62·delete 152·vote 165, message send 55·list 87·read 97·delete 120·countUnread 131·getConfig 144, report create 15, history document 32, search integrated 15, category tree 14
5. 폼·액션 확인: `grep -noE` 로 `index-page.tsx`(name `view`, `sort`, `searchField`, `search`, `pageSize`, `categoryId`, 검색 대상 옵션 title/content/author 324-326행), `write-form.tsx`(name `title`, `moduleInstanceId`, `content`), `view-page.tsx`(삭제 버튼 280행, `votedCount` 164행, `listAttachments` 17·79행, `notFound` 88행)
6. 부재 확인 (`grep -rliE`, apps/web/app + routers + packages/{board,document,comment,message}/src, 테스트·관리자 제외):
   - `trackback|엮인` → `packages/document/src/__fixtures__.ts` 한 파일
   - `print|인쇄` → 출력 없음
   - `friend|친구` → 출력 없음
   - `manageDocument|copyDocument|moveDocument` → 출력 없음
   - `scrap|스크랩` → 출력 없음
   - `voteLog|vote_log` → `packages/board/src/permissions.ts`, `packages/comment/src/service.ts`, `trash.ts`(화면 아님)
   - `consultation` → `packages/board/src/{config,on-install,permissions}.ts`, `packages/document/src/__fixtures__.ts` (값·권한 키)
7. 수정 이력: `ls apps/web/app/(member)/documents/[id]/history` → `page.tsx`(제목 "수정 이력" 71·92행)
8. 쪽지 입력 스키마: `packages/message/src/schemas.ts:13-26` → `receiverId`, `subject`, `content`; 목록은 `folder` inbox/sent, `limit`, `cursor`. 설정 화면 필드는 `allowMessages` 하나
9. 에디터: `grep -n "Extension|StarterKit|Image|CodeBlock" TiptapEditor.tsx` → StarterKit, Image, CodeBlockLowlight; 이미지 업로드 `uploadImageFile`(54행). 에디터 DROP 근거는 `SPEC-CONTENT-PARITY-001/spec.md` 71-73, 126행
10. 신고 입력: `routers/content/report.ts` → `documentId?`, `commentId?`, `reason` 1~500자

### 3.1 한계 (미검증)

- 방문자 화면을 브라우저로 열어 확인하지 않았다. "대응 있음"은 소스의 라우트·프로시저·폼 필드 존재 기준이다.
- 레거시 쪽 근거는 `pages/*.json` 의 본문 앞부분(`excerpt`)과 폼 목록뿐이라 글 114·댓글 116 표본에서 보이지 않는 분기(예: 로그가 있는 글의 수정 로그 상세, 첨부 파일이 있는 글)는 판정에 반영하지 못했다.
- 확인하지 못한 것: 쓰기 폼의 공지·비밀 글 입력 UI 유무, 댓글 비밀 체크 입력, 댓글 삭제의 완전 삭제 선택, 댓글 페이지네이션, 신고 버튼의 사유 선택 UI, 글 삭제 확인 대화상자.
- 일반 회원 계정 신분의 화면은 기준선에 없어 비교하지 못했다(관리자 신분으로 대체). 레거시에서 "회원은 보이고 관리자는 안 보이는" 분기는 놓쳤을 수 있다.
- 상담 게시판은 act 단위 행이 없어 판정표에 넣지 않았다(§2 마지막 항목).

### 3.2 재집계

```bash
awk -F'|' '/^\| `disp/{gsub(/^ +| +$/,"",$6); c[$6]++; n++} END{for(k in c) print k, c[k]; print "total", n}' .moai/state/collab/lgp-009-board-visitor-draft.md
```
