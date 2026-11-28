# SPEC-LEGACY-PARITY-010 레거시 데이터 이전 사전 조사: MySQL 스키마 → Prisma 모델 매핑표

- 작성: moai2 (읽기 전용 조사, 저장소 파일 무수정, 레거시 DB 는 `SELECT`/`SHOW` 만 사용)
- 입력: 레거시 테이블 정의 `/mnt/d/project/rhymix/modules/*/schemas/*.xml`, 레거시 DB(`rhymix-db` 컨테이너, 읽기 전용 조회), `packages/db/prisma/schema.prisma`(1690행)
- 범위: 요청한 테이블 전부. 레거시 기준선 DB 의 실제 행 수는 §0.2 에 적었다.
- 판정 열 약어: **손실 없음** = 값이 그대로 또는 규칙 변환으로 옮겨짐 / **부분 손실** = 일부 정보가 사라짐 / **대응 없음** = 옮길 곳이 없음 / **결정 필요** = 이전 정책을 정해야 함

## 0. 전체에 걸리는 규칙

### 0.1 공통 변환 규칙

| # | 레거시 | rhymix-ts | 변환 규칙 |
|---|---|---|---|
| G1 | `date` 컬럼(`regdate`, `last_update` 등). 실제 DB 형식은 `char(14)` `YYYYMMDDHHMMSS` (`SHOW CREATE TABLE rx_documents` → ``regdate` char(14)``) | `DateTime` (UTC 로 저장하는 Prisma 기본) | 레거시는 사이트 내부 시간대(`files/config/config.php` 의 `internal_timezone => 32400`, `default_timezone => Asia/Seoul`)의 벽시계 시각을 저장한다. `YYYYMMDDHHMMSS` 를 **+09:00 으로 해석**해 UTC `DateTime` 으로 바꾼다. 빈 값·`NULL` 은 `NULL` 또는 `createdAt` 대체. 이전 도구는 시간대를 설정값으로 받아야 함 |
| G2 | `char(1)` `Y`/`N` | `Boolean` | `Y`→true, `N`→false |
| G3 | `*_srl` (member_srl, document_srl, module_srl …) | 모델마다 `id Int @default(autoincrement())` | 레거시는 단일 시퀀스(`rx_sequence`)에서 모든 srl 을 발급해 **테이블 간에도 유일**하다. rhymix-ts 는 테이블별 자동증가. 일부 모델은 레거시 번호를 보존하는 컬럼이 있다: `Board.moduleSrl`, `Document.documentSrl`, `DocumentCategory.categorySrl`, `Comment.commentSrl`, `FileAttachment.fileSrl` (모두 `BigInt? @unique`), `Layout.legacySrl`. **`User`·`MemberGroup`·`ModuleInstance`·`Menu`·`MenuItem`·`Poll`·`Message` 에는 보존 컬럼이 없다** → 이전 도구가 (a) `id` 를 레거시 srl 로 직접 지정하고 시퀀스를 `setval` 로 맞추거나 (b) 임시 매핑표(srl→새 id)를 유지해야 함 (결정 필요) |
| G4 | `site_srl` (항상 0, 단일 사이트) | `Site.id` / `siteId` | 0 → 이전 대상 `Site` 한 행 |
| G5 | PHP `serialize` 문자열 (`extra_vars`, `module_config.config`, `module_extra_vars` 일부, 예: `O:8:"stdClass":0:{}`) | `Json` 컬럼 | PHP unserialize → JSON. 기준선 `rx_documents.extra_vars` = `O:8:"stdClass":0:{}`, `rx_module_config(member).config` = `O:8:"stdClass":62:{…}` 로 확인. `stdClass`→객체, 배열→배열. 이전 도구에 unserialize 구현 필요(JS 라이브러리 또는 소형 파서) |
| G6 | HTML 이스케이프된 텍스트 (`menu_item.name` = `Q&amp;A`) | 평문 `title` | `&amp;` 등 엔티티 해제. 다국어 키(`$user_lang->…`)가 올 수 있음 → 해당 언어 문구로 확정 필요 |
| G7 | 접두사 `rx_` | 테이블명 `@@map` | 읽기 쪽에서만 처리 |

### 0.2 레거시 기준선 DB 의 행 수 (`SELECT COUNT(*)`)

member 1, member_group 3, member_group_member 1, modules 7, module_config 5, module_extra_vars 4, domains 1, menu 5, menu_item 41, documents 2, 나머지(member_join_form, member_agreed, member_nickname_log, member_scrap, document_categories, document_extra_keys, document_extra_vars, document_voted_log, document_histories, document_trash, comments, comment_voted_log, files, module_grants, module_admins, point, tags, poll 계열 4개, member_message, ncenterlite_notify, member_friend) 은 **모두 0행**.

→ 기준선에는 실제 콘텐츠가 거의 없어 **이전 도구는 기준선이 아니라 별도의 실제 운영 DB 덤프로 검증해야 한다.** 아래 매핑 중 값 형식이 기준선에서 확인된 것은 해당 줄에 "확인"으로 표시했다.

## 1. 회원

### 1.1 `member` → `User`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| member.member_srl | User.id | G3. 보존 컬럼 없음 → id 직접 지정 또는 매핑표. 이후 모든 `member_srl` 참조(문서·댓글·쪽지·포인트 등)가 이 매핑에 의존 | 결정 필요 |
| member.user_id | User.userId (`@unique`) | 그대로. 대소문자·중복 검사 필요 | 손실 없음 |
| member.password | User.passwordHash + passwordAlgo + passwordVersion | **§A 참조** (해시 형식 차이) | 결정 필요 |
| member.email_address | User.emailAddress (`@unique`) | 소문자 정규화 후 중복 검사 | 손실 없음 |
| member.email_id, email_host | (없음) | `email_address` 에서 재계산되는 파생값. 버림 | 손실 없음 (파생) |
| member.phone_number, phone_country | User.phoneNumber (`@unique`), phoneCountry | 그대로. 빈 문자열은 NULL 로(유니크 충돌 방지) | 손실 없음 |
| member.phone_type | (없음) | 휴대폰/유선 구분 | 대응 없음 |
| member.user_name | User.userName | 그대로 | 손실 없음 |
| member.nick_name | User.nickName (`@unique`) | 그대로. 레거시는 닉네임 중복 설정이 가능 → 충돌 시 접미사 규칙 필요 | 결정 필요 |
| member.find_account_question, find_account_answer | (없음) | 계정 찾기 질문·답변 | 대응 없음 |
| member.homepage, blog, birthday | User.extraVars (Json) | 키 `homepage`, `blog`, `birthday`(`YYYYMMDD`) 로 보존 제안. 전용 컬럼 없음 | 부분 손실 (화면 노출은 별도) |
| member.allow_mailing | User.extraVars | 키 `allow_mailing` 로 보존 제안 (전용 필드 없음) | 부분 손실 |
| member.allow_message (`Y`/`N`/`F`) | User.allowMessages (Boolean) | `Y`→true, `N`→false, **`F`(친구만) → true 로 근사하되 손실** (친구 기능이 없음) | 부분 손실 |
| member.is_admin | User.isAdmin | G2 | 손실 없음 |
| member.denied (Y/N) + member.status | User.denied, User.status | `denied=Y` → denied=true. 레거시 `status` 는 `APPROVED`/`DENIED`/`UNAUTHED` 가 기준선에서 확인됨(`APPROVED`) → `UserStatus` 의 같은 이름으로 매핑. `SUSPENDED`·`DELETED` 는 rhymix-ts 에서 새로 생김(레거시 대응 없음) | 손실 없음 |
| member.regdate | User.createdAt | G1 | 손실 없음 |
| member.ipaddress (가입 IP) | (없음) | `MemberAgreement.ip` 는 약관 동의용. 가입 IP 를 둘 곳이 없음 | 대응 없음 |
| member.last_login | User.lastLoginAt | G1 | 손실 없음 |
| member.last_login_ipaddress | User.lastLoginIp | 그대로 | 손실 없음 |
| member.change_password_date | User.passwordChangedAt | G1 | 손실 없음 |
| member.limit_date | (없음) | 로그인 제한 만료일. `User.status = SUSPENDED` 와 시각 필드가 없음 | 대응 없음 |
| member.description | User.extraVars | 키 `description` 로 보존 제안 | 부분 손실 |
| member.extra_vars | User.extraVars | G5 (PHP serialize → JSON). 키는 `member_join_form.column_name` 과 같음 → `JoinFormField.fieldName` 과 맞춰야 함. 기준선 값은 `NULL` | 손실 없음 |
| member.list_order | (없음) | 정렬용 음수 srl. 불필요 | 손실 없음 (파생) |
| (신규) | User.updatedAt, passwordVersion 등 | `updatedAt` = 이전 시각. 2FA·소셜·세션 필드는 빈 기본값 | — |

### 1.2 `member_group` → `MemberGroup`, `member_group_member` → `MemberGroupMember`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| member_group.group_srl | MemberGroup.id | G3. 보존 컬럼 없음. 카테고리·메뉴·권한이 이 번호를 참조(§0·§3·§4) | 결정 필요 |
| member_group.site_srl | MemberGroup.siteId | G4 | 손실 없음 |
| member_group.list_order | MemberGroup.listOrder | 그대로 | 손실 없음 |
| member_group.title | MemberGroup.title | 다국어 키가 올 수 있음(G6). 기준선: `관리그룹`/`준회원`/`정회원` 평문 확인 | 손실 없음 |
| member_group.regdate | MemberGroup.createdAt | G1 | 손실 없음 |
| member_group.is_default, is_admin | isDefault, isAdmin | G2. 기준선: 준회원=기본, 관리그룹=관리 확인 | 손실 없음 |
| member_group.image_mark | MemberGroup.imageMark | 레거시는 파일 경로 문자열 → 파일 복사와 경로 재작성 필요(§B 와 같은 처리) | 결정 필요 |
| member_group.description | MemberGroup.description | 그대로 | 손실 없음 |
| member_group_member.group_srl, member_srl | MemberGroupMember.groupId, userId | 두 srl 모두 §1 매핑으로 변환 | 손실 없음 |
| member_group_member.regdate | MemberGroupMember.joinedAt | G1 | 손실 없음 |
| member_group_member.site_srl | (없음) | 항상 0 | 손실 없음 |

### 1.3 가입 항목·약관·닉네임 로그·스크랩

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| member_join_form.member_join_form_srl | (없음, JoinFormField.id 새 발급) | | 손실 없음 |
| member_join_form.column_type | JoinFormField.fieldType | 레거시 유형(text, homepage, email_address, tel, kr_zip, date, select, radio, checkbox, textarea …) → rhymix-ts `fieldType` 문자열. 유형 목록 대조표 필요 | 결정 필요 |
| member_join_form.column_name | JoinFormField.fieldName | 그대로. `User.extraVars` 키와 일치해야 함 | 손실 없음 |
| member_join_form.column_title | JoinFormField.label | 다국어 키(G6) | 손실 없음 |
| member_join_form.required | JoinFormField.required | G2 | 손실 없음 |
| member_join_form.default_value, options | JoinFormField.options (Json?) | `options` 는 직렬화 배열 → JSON. `default_value` 는 둘 곳이 없음 | 부분 손실 |
| member_join_form.is_active | JoinFormField.visible | G2 | 손실 없음 |
| member_join_form.description, regdate | (없음) | | 대응 없음 |
| member_join_form.list_order | JoinFormField.fieldOrder | 그대로. `siteSrl` = 0 | 손실 없음 |
| member_agreed.member_srl | MemberAgreement.userId | §1.1 매핑 | 손실 없음 |
| member_agreed.agreement_sequence | MemberAgreement.agreementKey | 번호 → 문자열 키(`terms-<n>` 등) 규칙 필요. `version` 은 레거시에 없음 → 고정값(`legacy`) | 결정 필요 |
| member_agreed.agreed (Y/N), ipaddress, regdate | (agreed 없음), ip, agreedAt | `agreed=N` 행은 버림, `Y` 만 이전 | 부분 손실 |
| member_nickname_log.member_srl, before_nick_name, after_nick_name, regdate | NicknameChangeLog.userId, oldNickName, newNickName, changedAt | `changedByAdminId` = NULL. `user_id` 는 중복 정보라 버림 | 손실 없음 |
| member_scrap.* (스크랩 폴더 포함 member_scrap_folders) | (없음) | 스크랩 기능 자체가 없음(`grep scrap` 0건, 009 참조) | 대응 없음 |
| member_friend, member_friend_group | (없음) | 친구 기능 없음 (009 참조) | 대응 없음 |
| member_denied_user_id, member_denied_nick_name, member_managed_email_hosts, member_autologin, member_devices, member_auth_log … | DeniedIdentifier, ManagedEmailHost, AutoLogin, MemberDevice, AuditLog | 요청 범위 밖(참고만). 자동 로그인·기기 토큰은 이전하지 않는 것이 안전 | 이번 조사 제외 |

## 2. 쪽지·알림

### 2.1 `member_message` → `Message`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| member_message.message_srl, related_srl | Message.id (새 발급) | **레거시는 한 쪽지를 두 행으로 저장**: 보낸 사람 몫 `message_type='S'`, 받는 사람 몫 `'R'` (`modules/communication/communication.controller.php:237,257`), 보관함은 `'T'`(`:402`). `related_srl` 로 짝을 묶는다. rhymix-ts 는 **한 행 + `senderDel`/`receiverDel` 플래그** → 짝을 `related_srl` 로 합쳐 1행으로 만들고, 짝이 없는 쪽은 해당 `…Del = true` | 결정 필요 |
| member_message.sender_srl, receiver_srl | Message.senderId, receiverId | §1.1 매핑 | 손실 없음 |
| member_message.title, content | Message.subject, content | 길이 제한(제목 200, 본문 2000 — `packages/message/src/schemas.ts:13-16`) 초과분은 잘림 | 부분 손실 (길이) |
| member_message.readed (Y/N), readed_date | Message.readAt | `Y` → `readed_date`(없으면 `regdate`), `N` → NULL | 손실 없음 |
| member_message.message_type `T` (보관) | (없음) | 보관함 개념이 없음. 받은 쪽지로 이전 | 부분 손실 |
| member_message.list_order, regdate | (list_order 없음), Message.createdAt | G1 | 손실 없음 |

### 2.2 `ncenterlite_notify` → `Notification`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| ncenterlite_notify.id | Notification.id | 새 발급 | 손실 없음 |
| ncenterlite_notify.member_srl | Notification.recipientId | §1.1 매핑 | 손실 없음 |
| ncenterlite_notify.target_member_srl, target_nick_name | Notification.actorId, actorNickname | 그대로 | 손실 없음 |
| ncenterlite_notify.type, target_type, notify_type | Notification.category, sourceType | 레거시 유형 문자(`D` 문서, `C` 댓글, `T` 쪽지 등 — `ncenterlite.model.php:577-592`)를 rhymix-ts 열거형(category: COMMENT/COMMENT_REPLY/MENTION/MESSAGE, sourceType: COMMENT/MENTION/MESSAGE)에 맞춤. **문서 작성·추천·게시판 알림 등은 열거형에 없음** | 부분 손실 |
| ncenterlite_notify.srl, target_srl, target_p_srl | Notification.sourceId | 대상 srl → 새 id 매핑 필요(댓글 id) | 결정 필요 |
| ncenterlite_notify.readed | Notification.read, readAt | G2. `readAt` = NULL 또는 `regdate` | 손실 없음 |
| ncenterlite_notify.regdate | Notification.createdAt | G1 | 손실 없음 |
| ncenterlite_notify.notify, target_email_address, target_browser, target_summary, target_body, target_url, data | (없음) | rhymix-ts 는 알림 문구·URL 을 원본에서 다시 만든다 | 대응 없음 |
| ncenterlite_unsubscribe, user_set | NotificationPreference | 요청 범위 밖(참고). 알림은 일시 데이터라 **이전하지 않는 선택지**도 있음 | 결정 필요 |

## 3. 콘텐츠

### 3.1 `documents` → `Document`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| documents.document_srl | Document.documentSrl (BigInt, `@unique`) + Document.id | `documentSrl` 에 레거시 번호 보존, `id` 는 새 발급(또는 같은 값). 이후 댓글·첨부·태그·설문이 이 매핑을 사용 | 손실 없음 |
| documents.module_srl | Document.boardId | `Board.moduleSrl` 로 조회 → `Board.id` | 손실 없음 |
| documents.category_srl | Document.categoryId | 0 → NULL, 그 외 `DocumentCategory.categorySrl` 조회 | 손실 없음 |
| documents.lang_code | Document.langCode | 빈 값 → 기본 `ko`(기준선 값은 `ko`) | 손실 없음 |
| documents.is_notice | Document.isNotice | G2. 레거시는 `Y`/`N`(모듈 전체 공지) | 손실 없음 |
| documents.title, title_bold, title_color | title, titleBold, titleColor | 그대로 | 손실 없음 |
| documents.content | Document.content (HTML) | **§C 참조** (본문 안 경로·위젯 코드). `contentText`(검색용 평문)는 태그 제거로 새로 생성, `searchVector` 는 DB 가 생성 | 결정 필요 |
| documents.readed_count, voted_count, blamed_count, comment_count, trackback_count, uploaded_count | readedCount, votedCount, blamedCount, commentCount, trackbackCount, uploadedCount | 그대로. 이전 후 `commentCount`·`uploadedCount` 는 실제 행 수로 재계산하는 것이 안전 | 손실 없음 |
| documents.password | Document.password | 비회원 글 삭제용 비밀번호 해시 → **§A.3 참조** | 결정 필요 |
| documents.user_id | Document.userIdSnapshot | 그대로 | 손실 없음 |
| documents.member_srl | Document.authorId | §1.1 매핑. 0(비회원) → NULL | 손실 없음 |
| documents.user_name | (없음) | `nickName` 만 있음 | 대응 없음 |
| documents.nick_name | Document.nickName | 그대로 | 손실 없음 |
| documents.email_address | Document.email | 그대로(민감 필드) | 손실 없음 |
| documents.homepage | (없음) | | 대응 없음 |
| documents.tags | Tag + DocumentTag | 쉼표 구분 문자열은 파생값. 태그 행은 `tags` 테이블(§3.6)로 이전. `documents.tags` 는 버림 | 손실 없음 |
| documents.extra_vars | Document.extraVars (Json) | G5. **문서 확장 변수는 레거시에서 `document_extra_vars` 행으로 저장**됨 → §3.3 | 결정 필요 |
| documents.regdate, last_update | Document.regdate, lastUpdate | G1 | 손실 없음 |
| documents.last_updater | (없음) | 마지막 수정자 | 대응 없음 |
| documents.ipaddress | Document.ipAddress | 그대로 | 손실 없음 |
| documents.list_order, update_order | listOrder, updateOrder (BigInt) | 그대로(음수 값). 기준선 확인: `-67`, `-68` | 손실 없음 |
| documents.allow_trackback, notify_message | allowTrackback, notifyMessage | G2 | 손실 없음 |
| documents.status | Document.status | `PUBLIC`→PUBLIC, `SECRET`→SECRET, `TEMP`→TEMP. 기준선 값은 `PUBLIC`. 그 외 값(`PRIVATE` 등)이 있으면 처리 규칙 필요 | 결정 필요 |
| documents.comment_status | Document.commentStatus | `ALLOW`→ALLOW, 그 외(`DENY` 등)→DISABLE | 손실 없음 |
| (휴지통) | Document.deletedAt | §3.5 | — |

### 3.2 `document_categories` → `DocumentCategory`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| category_srl | categorySrl (+ id 새 발급) | 레거시 번호 보존 | 손실 없음 |
| module_srl | boardId | `Board.moduleSrl` 조회 | 손실 없음 |
| parent_srl | parentId | 0 → NULL, 그 외 같은 테이블 새 id. **부모 먼저 넣는 2단계 처리** | 손실 없음 |
| title, description, color | title, description, color | 그대로 (`title` 다국어 키 가능, G6) | 손실 없음 |
| group_srls (쉼표 텍스트) | groupIds (Int[]) | 각 값을 §1.2 `MemberGroup.id` 로 변환. 레거시 특수값(-1 전체, -2 로그인 등) 처리 규칙 필요 | 결정 필요 |
| expand, is_default | expand, isDefault | G2 | 손실 없음 |
| document_count | documentCount | 이전 후 재계산 권장 | 손실 없음 |
| regdate, last_update | createdAt, updatedAt | G1 | 손실 없음 |
| list_order | listOrder | 그대로 | 손실 없음 |

### 3.3 `document_extra_keys` / `document_extra_vars` → `DocumentExtraKey` / `Document.extraVars`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| document_extra_keys.module_srl | DocumentExtraKey.boardId | `Board.moduleSrl` 조회 | 손실 없음 |
| document_extra_keys.var_idx, var_name | varIdx, varName | 그대로 | 손실 없음 |
| document_extra_keys.var_type | varType | 레거시 유형(text, textarea, select, radio, checkbox, date, tel, email_address, homepage, kr_zip …) → rhymix-ts 유형. 대조표 필요 | 결정 필요 |
| document_extra_keys.var_is_required, var_search, var_sort | varIsRequired, varSearch, varSort | G2 | 손실 없음 |
| document_extra_keys.var_options | varOptions (Json?) | 줄바꿈/쉼표 문자열 → 배열 JSON | 손실 없음 |
| document_extra_keys.var_is_strict, var_default, var_desc, eid | (없음) | `langCode` 는 기본 `ko` | 대응 없음 (기본값·설명·엄격 모드) |
| document_extra_vars.document_srl, var_idx, value | Document.extraVars | 키 `varIdx`(또는 `eid`)로 값 병합. 어느 쪽을 키로 쓰는지는 rhymix-ts 의 `ExtraFieldsRenderer` 규칙과 맞춰야 함 | 결정 필요 |
| document_extra_vars.lang_code, sort_value | (없음) | | 대응 없음 |

### 3.4 `document_voted_log`, `document_histories` → `DocumentVote`, `DocumentUpdateLog`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| document_voted_log.document_srl | DocumentVote.documentId | 매핑 | 손실 없음 |
| document_voted_log.member_srl | DocumentVote.voterId (String) | 회원 id 문자열화. 비회원(0)은 IP 기반 식별자 필요 | 결정 필요 |
| document_voted_log.point | DocumentVote.voteType, point | 양수 → UP, 음수 → DOWN(비추천은 BLAME 구분 규칙 필요) | 결정 필요 |
| document_voted_log.ipaddress, regdate | (IP 없음), regdate | G1 | 부분 손실 (IP) |
| document_histories.document_srl, content, nick_name, member_srl, ipaddress, regdate | DocumentUpdateLog.documentId, prevContent, (editorId ← member_srl), editorIp, regdate | **레거시 이력에는 제목이 없음** → `prevTitle` 은 현재 제목 또는 빈 값으로 채움. `module_srl`, `history_srl` 버림 | 부분 손실 (제목) |

### 3.5 `document_trash` → `Trash`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| document_trash.document_srl | Trash.documentId | 매핑 | 손실 없음 |
| document_trash.trash_date | Trash.deletedAt (+ Document.deletedAt) | G1 | 손실 없음 |
| document_trash.member_srl | Trash.deletedById | 매핑 | 손실 없음 |
| (없음) | Trash.expiresAt (필수) | 레거시에 만료 개념이 없음 → `deletedAt` + 보존 기간 정책 필요 | 결정 필요 |
| document_trash.description, ipaddress, user_id, user_name, nick_name | (없음) | | 대응 없음 |

### 3.6 `tags` → `Tag` + `DocumentTag`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| tags.tag | Tag.name (`@unique`) | 레거시는 문서마다 한 행 → 이름으로 중복 제거해 `Tag` 생성, `count` = 문서 수 | 손실 없음 |
| tags.document_srl | DocumentTag.documentId | 매핑 | 손실 없음 |
| tags.tag_srl, module_srl, regdate | (없음) | | 손실 없음 (파생) |

### 3.7 `comments` → `Comment`, `comment_voted_log` → `CommentVoteLog`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| comments.comment_srl | Comment.commentSrl + id | 레거시 번호 보존 | 손실 없음 |
| comments.module_srl, document_srl | boardId, documentId | `Board.moduleSrl` / `Document.documentSrl` 조회 | 손실 없음 |
| comments.parent_srl | Comment.parentId | 0 → NULL, 그 외 새 id. 부모 먼저 넣는 2단계 | 손실 없음 |
| comments.is_secret | isSecret | G2 | 손실 없음 |
| comments.content | content (HTML) | §C | 결정 필요 |
| comments.voted_count, blamed_count | votedCount, blamedCount | 그대로 | 손실 없음 |
| comments.password | password | §A.3 | 결정 필요 |
| comments.user_id, nick_name, email_address, ipaddress | userIdSnapshot, nickName, email, ipAddress | 그대로 | 손실 없음 |
| comments.member_srl | authorId | §1.1 매핑. 0 → NULL | 손실 없음 |
| comments.notify_message, user_name, homepage, uploaded_count | (없음) | | 대응 없음 |
| comments.regdate, last_update | regdate, lastUpdate | G1 | 손실 없음 |
| comments.list_order | listOrder (BigInt) | 그대로 | 손실 없음 |
| comments.status (number, 기본 1) | status (Int) | 값 의미 대조 필요(1=공개). 숨김 값 사용 여부는 실제 데이터에서 확인 | 결정 필요 |
| comments_list.* (head, arrange, depth) | (없음) | 정렬·깊이용 보조 테이블. `parentId` 체인과 `listOrder` 로 재구성 | 손실 없음 (파생) |
| comment_voted_log.comment_srl, member_srl, point, regdate | CommentVoteLog.commentId, memberId (Int, 필수), voteType (Int), regdate | 비회원(`member_srl` 0)은 `memberId` 가 필수라 이전 불가 | 부분 손실 (비회원) |

### 3.8 `files` → `FileAttachment`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| files.file_srl | fileSrl + id | 레거시 번호 보존 | 손실 없음 |
| files.upload_target_srl + upload_target_type | documentId / commentId + uploadTargetType | 레거시 유형 값(`doc`, `com`, 그리고 모듈 아이콘·서명 등 `mod`/기타)을 `DOCUMENT`/`COMMENT` 로 변환. **그 외 유형(모듈·회원 이미지 등)은 이전 불가** | 부분 손실 |
| files.module_srl, sid | (없음) | `module_srl` 은 문서에서 유도, `sid` 는 다운로드 토큰 | 손실 없음 (파생) |
| files.member_srl | memberId (String?) | 문자열화 | 손실 없음 |
| files.download_count | downloadCount | 그대로 | 손실 없음 |
| files.direct_download | directDownload | G2 | 손실 없음 |
| files.source_filename | sourceFilename | 그대로 | 손실 없음 |
| files.uploaded_filename | uploadedFilename + storageKey | **§B 참조** (경로 규칙 차이) | 결정 필요 |
| files.thumbnail_filename | (없음) | 동영상 썸네일 경로. rhymix-ts 는 썸네일을 별도로 만든다 | 대응 없음 |
| files.file_size, mime_type | fileSize (BigInt), mimeType | 그대로 | 손실 없음 |
| files.original_type, comment | (없음) | | 대응 없음 |
| files.width, height, duration | width, height, duration | 그대로 | 손실 없음 |
| files.isvalid, cover_image | isvalid, coverImage | G2 | 손실 없음 |
| files.regdate | regdate | G1 | 손실 없음 |
| files.ipaddress | (없음) | | 대응 없음 |

### 3.9 `tags` 외 설문: `poll`, `poll_title`, `poll_item`, `poll_log` → `Poll`, `PollOption`, `PollVote`, `DocumentPoll`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| poll.poll_srl | Poll.id (새 발급) | 매핑표 필요(`poll_log`·`poll_item` 이 참조) | 손실 없음 |
| poll.upload_target_srl | DocumentPoll.documentId | 설문이 붙은 문서. `sortKey` = 순번 | 손실 없음 |
| poll.stop_date | Poll.endAt | G1 (종료 없음 값은 먼 미래 날짜로) | 결정 필요 |
| poll.regdate | Poll.startAt, createdAt | G1 | 손실 없음 |
| poll.poll_count, member_srl, ipaddress, list_order, poll_type | (없음) | 총 투표 수는 `PollVote` 개수로 재계산 | 대응 없음 |
| poll_title.title | Poll.title | **레거시 한 설문(`poll_srl`)에 질문이 여러 개(`poll_title` 여러 행, `poll_index_srl`)**. rhymix-ts `Poll` 은 질문 1개 → 질문별로 `Poll` 을 쪼개거나 첫 질문만 이전 | 부분 손실 (다중 질문) |
| poll_title.checkcount | Poll.allowMultipleChoice | `checkcount > 1` → true. **최대 선택 개수는 둘 곳이 없음** | 부분 손실 |
| poll_item.title, poll_index_srl | PollOption.label, sortOrder | 질문별로 묶음 | 손실 없음 |
| poll_item.poll_count, add_user_srl, upload_target_srl | (없음) | 집계값 | 손실 없음 (파생) |
| poll_log.member_srl, ipaddress, regdate, poll_item | PollVote.memberId, voterIp, createdAt, pollOptionId | `poll_item`(선택 항목 srl, 쉼표 구분 가능성) 마다 `PollVote` 한 행. 비회원은 `memberId` NULL | 손실 없음 |
| (없음) | Poll.allowGuestVote, duplicateVotePolicy, siteId | 로그에 비회원이 있으면 allowGuestVote=true, 정책 기본 `by-member` | 결정 필요 |

## 4. 사이트 구조

### 4.1 `modules` → `ModuleInstance` (+ `Board`)

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| modules.module_srl | (ModuleInstance 에 보존 컬럼 없음) / Board.moduleSrl | 게시판은 `Board.moduleSrl` 에 보존. 페이지 등 나머지는 매핑표. 문서·메뉴·권한이 이 번호를 참조 | 결정 필요 |
| modules.module | ModuleInstance.moduleCode | `board`, `page`, `member` … 기준선: board 3, page 3, member 1 확인. rhymix-ts 에 등록된 모듈만 이전 | 부분 손실 (미지원 모듈) |
| modules.mid | mid | 그대로. 예약어 충돌 검사 | 손실 없음 |
| modules.browser_title | browserTitle | 그대로(`name` 도 같은 값으로) | 손실 없음 |
| modules.description | description | 그대로 | 손실 없음 |
| modules.site_srl, domain_srl | siteId | G4. `domain_srl = -1` 은 "모든 도메인" | 손실 없음 |
| modules.menu_srl | menuId | 0 → NULL, 그 외 §4.2 매핑 | 손실 없음 |
| modules.layout_srl, mlayout_srl | layoutId, mobileLayoutId (String?) | `Layout.legacySrl` 로 조회. `-1`(사이트 기본)·`0` → NULL | 손실 없음 |
| modules.skin, mskin | skin, mobileSkin | `/USE_DEFAULT/` → NULL(기준선 확인). 레거시 스킨명은 rhymix-ts 스킨에 대응이 없음 → 기본 스킨 | 부분 손실 |
| modules.use_mobile, is_skin_fix, is_mskin_fix | (없음) | | 대응 없음 |
| modules.module_category_srl | (없음) | 모듈 분류 개념 없음(003 격차) | 대응 없음 |
| modules.is_default | isDefault | G2 | 손실 없음 |
| modules.open_rss (`Y`/`H`/`N`) | rssEnabled | `Y`→true, `N`→false, `H`(요약만)는 true 로 근사 | 부분 손실 |
| modules.header_text, footer_text | (없음) | 게시판 머리말·꼬리말 | 대응 없음 |
| modules.content, mcontent (페이지 본문) | ModuleInstance.mcontent, 모바일은 `config.mcontentMobile` | `ModuleInstance` 에는 본문 컬럼이 `mcontent` 하나뿐이고 `packages/page/src/service.ts:67` 이 이를 PC 본문으로, 모바일은 config JSON 에서 읽는다. 레거시 `content`(PC)→`mcontent`, `mcontent`(모바일)→`config.mcontentMobile`. **페이지 유형이 `WIDGET` 이면 본문에 위젯 이미지 코드가 있음 → §C** | 결정 필요 |
| modules.regdate | createdAt | G1 | 손실 없음 |

게시판은 `ModuleInstance` 한 행과 `Board` 한 행이 짝이다. `Board` 의 `listCount`·`pageCount`·`orderTarget`·`exceptNotice` 등 설정값은 레거시 `module_extra_vars` 의 `name/value` 쌍이거나 `modules` 컬럼에서 오며, 기준선 `module_extra_vars` 4행은 모두 페이지(`page_type`, `regdate`)라 **게시판 설정의 실제 키 이름은 기준선으로 확인하지 못했다.** 실제 운영 덤프에서 키 목록을 뽑아 대조해야 한다.

### 4.2 `menu`, `menu_item` → `Menu`, `MenuItem`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| menu.menu_srl, site_srl, title, listorder, regdate | Menu.id(매핑), siteId, title, listOrder, createdAt | `isAdminMenu` = false. 기준선 5행(관리자 메뉴 포함 여부 확인 필요) | 결정 필요 |
| menu_item.menu_item_srl, parent_srl, menu_srl | MenuItem.id(매핑), parentId, menuId | `parent_srl` 0 → NULL, 부모 먼저 넣는 2단계 | 손실 없음 |
| menu_item.name | title | G6 (`Q&amp;A` → `Q&A`, 다국어 키) | 손실 없음 |
| menu_item.url | url | 레거시는 `mid`(기준선 `board`) 또는 전체 URL(`https://rhymix.org/`). `mid` 는 `/<mid>` 경로로 변환 | 손실 없음 |
| menu_item.is_shortcut | (없음) | 외부 링크 여부. `url` 형태로 판별 | 손실 없음 (파생) |
| menu_item.icon, class, desc | icon, cssClass, description | 그대로 | 손실 없음 |
| menu_item.open_window, expand | openInNewWindow, expand | G2 | 손실 없음 |
| menu_item.normal_btn, hover_btn, active_btn | normalBtn, hoverBtn, activeBtn (Json) | 이미지 경로 → 파일 복사와 경로 재작성(§B) | 결정 필요 |
| menu_item.group_srls | groupIds (Int[]) | §1.2 매핑 | 손실 없음 |
| menu_item.listorder, regdate | listOrder, createdAt | G1 | 손실 없음 |
| menu_layout | (없음) | 메뉴-레이아웃 연결. `Domain.defaultMenuId` / `MenuSlotAssignment` 로 재구성 | 부분 손실 |

### 4.3 `domains`, `module_config`, `module_grants`, `module_admins`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| domains.domain_srl, domain, is_default_domain | Domain.id, hostname, isDefault | `hostname` 은 `@unique`. 기준선 `localhost` | 손실 없음 |
| domains.index_module_srl | indexModuleInstanceId | §4.1 매핑 | 손실 없음 |
| domains.index_document_srl | (없음) | | 대응 없음 |
| domains.default_layout_srl, default_mlayout_srl, default_menu_srl | defaultLayoutId, defaultMobileLayoutId, defaultMenuId | `Layout.legacySrl` / §4.2 매핑 | 손실 없음 |
| domains.http_port, https_port | (없음) | 포트 | 대응 없음 |
| domains.security (`none`/`always`/`optional`) | forceHttps, scheme | `always` → forceHttps=true | 부분 손실 (`optional`) |
| domains.settings (JSON) | settings (Json), defaultLanguage, defaultTimezone | 기준선: `{"language":"default","timezone":"default"}` → JSON 그대로 + 키 분해 | 손실 없음 |
| domains.description, regdate | (description 없음), createdAt | G1 | 부분 손실 |
| module_config.module, config | SiteSetting(key, value Json) / ModuleConfig | 레거시 키 5개(기준선): `member`, `menu`, `point`, `poll`, `spamfilter` (PHP serialize, G5). 설정 키 이름이 서로 달라 **항목별 대조표가 필요**하다(회원 설정은 62개 키). 인스턴스별 설정은 `ModuleConfig.config` | 결정 필요 |
| module_grants.module_srl, name, group_srl | Board.permissions (Json: 동작 → 그룹 id 배열) | `name`(list, view, write_document, write_comment …) → 키. `group_srl` 은 §1.2 매핑이며 **레거시 특수값(-1 전체, -2 로그인 회원, -3 관리자 등)** 처리 규칙이 필요. `access`·`manager` 항목은 rhymix-ts 권한 키에 없음(003 참조). 기준선 0행 | 부분 손실 |
| module_admins.* | (없음) | 게시판별 관리자 지정이 없음(003 참조) | 대응 없음 |

### 4.4 `point` → `Point`

| 레거시 테이블.컬럼 | rhymix-ts 모델.필드 | 변환 규칙 | 대응 없음/손실 |
|---|---|---|---|
| point.member_srl, point | User.pointBalance + Point 한 행 | **레거시는 잔액만 저장**(회원당 1행). rhymix-ts `Point` 는 내역(원장) 행. 회원마다 `amount` = 잔액, `sourceType = MANUAL`(또는 `SYSTEM`), `reason = "레거시 이전"` 1행을 만들고 `pointBalance` 에 같은 값을 넣는다 | 부분 손실 (이력 없음, 결정 필요) |

## A. 비밀번호 해시 (로그인 이전 가능성)

### A.1 레거시 형식

- 기준선 `rx_member.password` = `$2y$10$…` (60자) → **bcrypt**(`SELECT user_id, LEFT(password,12), CHAR_LENGTH(password)` 로 확인, 전체 해시는 읽지 않음).
- 레거시가 지원하는 해시는 `common/framework/Password.php:14-32` 의 서명 표로 판별한다: argon2id, bcrypt(`$2[a-z]$NN$`), pbkdf2(`algo:rounds:salt:hash`), md5, `md5,sha1,md5`(XE 구형), sha1, sha256/384/512, ripemd160, whirlpool, mssql_pwdencrypt, mysql_old_password(16자 hex), mysql_new_password(`*` + 40자 hex), portable(`$P$` phpass), drupal(`$S$`), joomla, kimsqrb. 설치마다 `password_hashing_algorithm`(`Password.php:128`)과 작업 계수(`:178`, 기본 10)가 다르고, **XE 시절 가입 회원은 md5·sha1 계열이 남아 있을 수 있다**(로그인 시 레거시가 새 알고리즘으로 올려 쓰지만 로그인하지 않은 회원은 그대로).

### A.2 rhymix-ts 쪽 현황

- `packages/auth/src/password.ts` 는 **argon2id PHC 문자열만 검증**한다: `encoded.startsWith('$argon2')` 가 아니면 `{ valid: false, needsRehash: true }` 를 반환하고 주석에 "Legacy hash (md5/bcrypt/sha1). We cannot verify it here — caller must bridge legacy verification before invoking us" 라고 적혀 있다(`password.ts:103-106`).
- `packages/auth/src/login.ts`, `password-config.ts` 에는 레거시 해시를 검증하는 코드가 **없다**(`grep -nE "legacy|bridge|md5|sha1|bcrypt|\$2y"` 결과 `password.ts` 의 주석뿐).
- 스키마에는 이를 위한 칸이 이미 있다: `User.passwordAlgo`(기본 `argon2id`), `User.passwordVersion`(기본 `argon2id-v1`).

### A.3 결론과 선택지

- 레거시 해시(특히 bcrypt)는 **단방향이라 argon2id 로 직접 변환할 수 없다.** 이전 시점에는 원문 비밀번호를 알 수 없다.
- **로그인 이전은 가능하다**: 이전 도구가 레거시 해시를 `passwordHash` 에 그대로 넣고 `passwordAlgo` = `bcrypt`(또는 `pbkdf2`·`md5` …), `passwordVersion` = `legacy-<algo>` 로 표시한다. 로그인 코드에 **레거시 검증기(bridge)를 추가**하고, 검증 성공 시 입력된 비밀번호로 argon2id 를 만들어 저장하면(`needsRehash: true` 흐름이 이미 있음) 사용자는 비밀번호를 다시 정하지 않아도 된다.
- 필요한 구현: bcrypt 검증 의존성(저장소 `package.json` 과 `packages/auth/package.json` 에서 `bcrypt` 라이브러리는 확인되지 않음 — 추가 필요), pbkdf2·md5·sha1 계열 검증(레거시 salt 규칙 포함). 지원하지 않는 형식(joomla, drupal, kimsqrb 등)의 회원은 **비밀번호 재설정 메일**로 유도.
- 비회원 글·댓글의 `password`(`Document.password`, `Comment.password`)도 같은 해시 형식이다. rhymix-ts 의 해당 필드 검증 방식은 이번 조사에서 확인하지 못했다(`packages/document/src/document.ts` 에는 응답에서 `password` 를 제거하는 처리만 확인) → 이전 전에 확인 필요.

## B. 첨부 파일의 실제 파일 경로 규칙 차이

| 항목 | 레거시 | rhymix-ts |
|---|---|---|
| 저장 위치 | `files/attach/{images 또는 binaries}/…` (`modules/file/file.controller.php:1999` `getStoragePath`). 기준선에 `files/attach/images`, `binaries` 폴더만 있고 **비어 있음** | 스토리지 어댑터 키 `attachments/{yyyy}/{mm}/{uuid}.{ext}` (`packages/file/src/attachment.ts:88-94`), 다운로드는 `apps/web/app/api/files/[id]/download/route.ts` 와 `by-key/[key]/download/route.ts` |
| 폴더 구조 | 설정 `file.folder_structure` 에 따라 (1) `…/{type}/{module_srl}/{upload_target_srl 을 3자리씩 끊은 경로}/` (2) `…/{type}/{YYYY}/{MM}/{DD}/` | 날짜 폴더 + UUID(문서·모듈 번호 정보가 경로에 없음) |
| 파일명 | 무작위 이름(썸네일은 `Security::getRandom(32,'hex').jpg`, `file.controller.php:1091`) | UUID |
| DB 에 적히는 경로 | `files.uploaded_filename` = `./files/attach/…` 형태의 **상대 경로** | `FileAttachment.storageKey`(스토리지 키), `uploadedFilename`(저장 이름) |
| 썸네일 | `files/thumbnails/…`, 동영상은 `thumbnail_filename` | 컬럼 없음(별도 생성) |
| 접근 URL | `./files/attach/images/…`(직접) 또는 `?module=file&act=procFileDownload&file_srl=…&sid=…` | `/api/files/{id}/download` |

필요한 이전 작업:
1. 레거시 `files/attach/**` 의 실제 파일을 rhymix-ts 스토리지로 복사하고 `storageKey` 를 정한다. 키를 새 규칙(`attachments/…`)으로 다시 만들지, 레거시 상대 경로를 보존하는 접두사(`legacy/…`)를 둘지는 결정 필요(후자는 중복 계산·본문 안 링크 재작성이 단순).
2. `uploaded_filename` 의 `./files/attach/…` 상대 경로가 실제 파일을 가리키는지 사전 검증(파일 누락 목록 출력).
3. `member_extra_info`(프로필 이미지·이름표시), `site_design`, `faceOff`, `ruleset`, `cache`, `env`, `config` 폴더는 `files/` 아래에 있으나 `files` 테이블 대상이 아니며 `site_design`(로고·파비콘)·`member_extra_info`(이미지 마크)는 별도 이전 대상인지 결정 필요(기준선 폴더 목록으로 확인).
4. 기준선에는 첨부 행·파일이 모두 0 이므로 **실제 운영 데이터로만 검증 가능**.

## C. 본문 HTML 안의 레거시 경로·위젯 코드

기준선 확인:
- `rx_documents.content`(문서 1건)에 `<link rel="stylesheet" href="./layouts/xedition/css/welcome.css" />` 같은 **레거시 상대 경로**가 있음.
- `rx_modules` 의 페이지(`module_srl` 49, `page_type = WIDGET`) `content` 는 `<img hasContent="true" class="zbxe_widget_output" widget="wi…` 로 시작하는 **레거시 위젯 코드**.

| 유형 | 레거시 | rhymix-ts | 처리 필요성 |
|---|---|---|---|
| 첨부 이미지·파일 링크 | `./files/attach/images/…`, `/files/attach/…`, `?module=file&act=procFileDownload&file_srl=…` | `/api/files/{id}/download` 등(§B) | **필요.** 본문 HTML 을 파싱해 `file_srl`·경로를 새 URL 로 재작성하거나, 레거시 경로를 같은 URL 로 서비스하는 리다이렉트 라우트를 둔다 |
| 레이아웃·스킨 자원 | `./layouts/xedition/css/…`, `./modules/…`, `./common/…` | 해당 자원 없음 | **필요.** 환영 글처럼 레거시 스킨 자원을 참조하는 본문은 깨짐. 제거하거나 대체 |
| 위젯 코드 | `<img class="zbxe_widget_output" widget="…" …>` (속성에 위젯 설정이 직렬화됨) | `<rx-widget name="…" props='{"…"}' />` 토큰(`apps/web/lib/widgets/renderer.tsx`, 정제 `sanitize.ts` 가 `rx-widget` 를 정적 세그먼트에서 제외) | **필요.** 레거시 위젯 종류(content, login_info, … )와 속성 키를 rhymix-ts 위젯 이름·props 로 변환하는 규칙이 있어야 하고, rhymix-ts 에 대응 위젯이 없는 것(`builtins/` 에는 `hello-widget.tsx` 만 확인)은 이전 불가 |
| 에디터 컴포넌트 | `<img editor_component="image_link" …>`, `<div editor_component="emoticon" …>` 등 | Tiptap 이미지·링크 | 필요. 레거시 에디터 컴포넌트 마크업을 일반 HTML 로 풀어쓰는 변환 |
| 안전 처리 | 본문이 신뢰되지 않는 HTML | `packages/board/src/components/sanitize.ts` 가 표시 시 정제 | 이전 시점이 아닌 렌더링 시점에 정제하고 있어 **원문 보존 이전은 가능**하나, 허용 태그에 없는 레거시 마크업은 표시에서 사라질 수 있음 |

## D. 이전 순서 제안 (의존성 기준, 참고)

1. `Site`, `MemberGroup` → `User` → `MemberGroupMember`, `JoinFormField`, `MemberAgreement`, `NicknameChangeLog`
2. `Menu` → `MenuItem` (그룹 id 변환 후)
3. `ModuleInstance` (+ `Board`, 페이지 본문) → `Domain` (인덱스 모듈 참조) → 권한(`Board.permissions`), 설정(`SiteSetting`/`ModuleConfig`)
4. `DocumentCategory`(부모→자식) → `DocumentExtraKey` → `Document` → `Tag`/`DocumentTag`, `Trash`, `DocumentUpdateLog`, `DocumentVote`
5. `Comment`(부모→자식) → `CommentVoteLog`
6. `FileAttachment` (+ 실제 파일 복사) → 본문 경로 재작성(§C)
7. `Poll` 계열, `Message`, `Point`, `Notification`(선택)
8. 이전 후 재계산: `commentCount`, `uploadedCount`, `documentCount`, `Tag.count`, `User.pointBalance`, 시퀀스 `setval`

## 근거 명령과 실제 출력 요약

모두 읽기 전용. 레거시 DB 는 `docker exec rhymix-db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" rhymix -N -e "…"'` 로 `SELECT`/`SHOW` 만 실행했다. 쓰기·DDL 은 하지 않았다. 비밀번호 해시는 앞 12자와 길이만 조회했다.

1. 레거시 컬럼 정의: `python3 -I` + `xml.etree` 로 `modules/{member,document,comment,file,module,menu,point,tag,poll,communication,ncenterlite}/schemas/*.xml` 의 `<column>` 속성(name, type, size, primary_key, notnull, default) 출력 → §1~§4 의 레거시 컬럼 목록 출처. 예: `documents` 34컬럼, `member` 30컬럼, `files` 22컬럼, `modules` 23컬럼
2. 실제 DB 형식: `SHOW CREATE TABLE rx_documents\G` → ``regdate` char(14) …latin1``, ``content` longtext``, `ENGINE=InnoDB … utf8mb4_unicode_ci` (G1 근거)
3. 행 수: `SELECT COUNT(*) FROM rx_<table>` 38개 → §0.2 (member 1, documents 2, modules 7, menu_item 41, 나머지 대부분 0)
4. 값 형식 표본: `SELECT user_id, LEFT(password,12), CHAR_LENGTH(password) FROM rx_member` → `admin  $2y$10$mornx  60`; `rx_documents` 표본 → `extra_vars='O:8:"stdClass":0:{}'`, `list_order=-67`, `status=PUBLIC`, `lang_code=ko`; `rx_menu_item` 표본 → `name='Q&amp;A'`, `url='qna'`; `rx_modules` → page 3·board 3·member 1, `skin='/USE_DEFAULT/'`; `rx_domains` → `settings={"language":"default","timezone":"default"}`; `rx_module_config` → `member, menu, point, poll, spamfilter`; `rx_module_extra_vars` → `page_type`/`regdate` 4행
5. 레거시 소스: `common/framework/Password.php:14-32`(해시 서명 표), `:128,178`(알고리즘·작업 계수 설정), `modules/file/file.controller.php:1999`(`getStoragePath`), `:1091`(썸네일 이름), `modules/communication/communication.controller.php:237,257,402`(쪽지 `S`/`R`/`T`), `files/config/config.php`(`internal_timezone`, `default_timezone`)
6. rhymix-ts 모델: `packages/db/prisma/schema.prisma` 의 `model` 블록을 python 으로 필드 단위 요약(User, MemberGroup, MemberGroupMember, JoinFormField, MemberAgreement, NicknameChangeLog, Document, DocumentCategory, DocumentExtraKey, DocumentVote, DocumentUpdateLog, Trash, Comment, CommentVoteLog, FileAttachment, ModuleInstance, ModuleConfig, Menu, MenuItem, Domain, Point, Tag, DocumentTag, Poll, PollOption, PollVote, DocumentPoll, Message, Notification, Board). 열거형: `UserStatus`(APPROVED, UNAUTHED, DENIED, SUSPENDED, DELETED), `DocumentStatus`(PUBLIC, SECRET, TEMP), `CommentStatus`(ALLOW, DISABLE), `NotificationCategory`/`NotificationSourceType`
7. 인증 코드: `packages/auth/src/password.ts:96-106`, `grep -nE "legacy|bridge|md5|sha1|bcrypt|\$2y" packages/auth/src/login.ts packages/auth/src/password-config.ts` → 출력 없음, `grep -rn "bcrypt\|argon2" package.json packages/auth/package.json` → bcrypt 의존성 없음
8. 파일: `packages/file/src/attachment.ts:88-94`(`storageKey`), `find apps/web/app/api -path '*file*' -name route.ts` → `files/upload`, `files/[id]/download`, `files/by-key/[key]/download`. `ls /mnt/d/project/rhymix/files` → `attach cache config env faceOff member_extra_info ruleset site_design`, `files/attach/{images,binaries}` 비어 있음
9. 위젯·본문: `apps/web/lib/widgets/renderer.tsx`(`rx-widget` 파싱), `sanitize.ts`, `ls apps/web/lib/widgets/builtins` → `hello-widget.tsx`

### 한계 (미검증)

- 레거시 기준선 DB 는 사실상 비어 있어 **값의 실제 분포(상태값, 특수 그룹 번호, 위젯 종류, 설문 다중 질문, 비회원 데이터 등)는 확인하지 못했다.** 표의 "결정 필요" 항목 다수는 운영 덤프로 검증해야 한다.
- 일부 레거시 값 집합은 소스·서명 표 기준의 추정이다: `message_type` 전체 값, 문서 `status` 의 `PRIVATE` 등 추가 값, 댓글 `status` 의미, `module_grants` 의 특수 그룹 번호, 확장 변수 유형 이름, `files.upload_target_type` 값.
- `User`·`Document`·`Comment` 등의 일부 필드(`Document.memberId`, `FileAttachment.memberId` 의 문자열 용도)와 `Document.password` 검증 방식은 사용 코드까지 따라가지 않았다.
- 게시판 설정(`Board.listCount` 등)과 `module_extra_vars` 키의 대응은 기준선에 게시판용 행이 없어 확인하지 못했다.
- `ncenterlite` 유형 문자(`D`, `C`, `T` …)의 전체 의미표와 `member_join_form.column_type` 값 목록은 대조표를 만들지 않았다.
- 시간대 해석(G1)은 설정 파일의 `internal_timezone` 값 기준이며 실제 운영 서버의 값은 다를 수 있다.
