# LGP-002 회원 영역 판정표 초안 (member · point)

- 작성: moai3 (보조 세션), 읽기 전용 분석
- 범위: `coverage.md` 의 member·point 행 16개 (그룹 '회원' 13개 + '보충(파라미터 화면)' 2개 + 공통(헤더/푸터) 1개 `dispMemberAdminInfo`)
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 레거시 DB 변경, 전체 테스트·빌드 실행. 레거시 화면(localhost:8080)은 열지 않았고, 근거는 전부 `pages/*.json` 과 레거시 소스(`modules/member`, `modules/point`) 및 rhymix-ts 소스 grep 으로 확인했다.
- 판정 기준: **대응 있음** = 화면과 주 기능이 rhymix-ts 에 있다(세부 누락은 비고에 기록). **격차** = 주 기능이 없거나 대부분 누락. **의도적 제외 후보** = 구조상 rhymix-ts 에 대응 개념이 없어 제외가 타당해 보인다. 최종 결정은 사용자 몫이다.
- 주의: `dispMemberAdminInfo` 는 지도상 '공통' 그룹이지만 회원 목록 화면과 같은 제목이라 포함했다.

## 요약

| 판정 | 개수 | act |
|---|---:|---|
| 대응 있음 | 9 | AgreementsConfig, Config, GroupList, Info, InsertJoinForm, List, LoginConfig, NickNameLog, SignUpConfig |
| 격차 | 6 | AuthLog, FeaturesConfig, Insert, point Config, point ModuleConfig, point PointList |
| 의도적 제외 후보 | 1 | DesignConfig |

## 판정표

| 레거시 act | 화면 제목 | 근거 파일(pages/…json) | rhymix-ts 대응(라우트·Server Action·tRPC, 파일:줄) | 판정 | 비고(레거시 폼 필드 중 rhymix-ts 에 없는 것) |
|---|---|---|---|---|---|
| `dispMemberAdminAgreementsConfig` | 회원 설정 (약관) | `dispMemberAdminAgreementsConfig-u27iz8.json` | 약관 탭 `app/admin/members/settings/page.tsx:110`, `AgreementSettingsForm` `settings/forms.tsx:431`, `updateAgreementSettingsAction` `settings/actions.ts:167`, 스키마 `server/api/routers/admin/settings.ts:93`. 약관 본문 CRUD `app/admin/members/terms/page.tsx:15`, `TermsEditor.tsx:28`, `terms/actions.ts:30,66`, tRPC `server/api/routers/admin/terms.ts:32,40,79,134` | 대응 있음 | 레거시 동의 항목 5칸(`agreement_1~5_title/content/type`) 중 rhymix-ts 설정 탭은 약관·개인정보 방침 필수 여부 2종만 다룬다. 커스텀 약관은 Terms 모델의 `required` 필드로 표현 가능(`packages/db/prisma/schema.prisma:637`)하나, 행별 필수 토글 UI 는 미확인. |
| `dispMemberAdminAuthLog` | 회원 설정 (인증 로그) | `dispMemberAdminAuthLog-khp4nn.json` | 대응 없음. 로그 화면은 관리자 작업 로그만 조회 (`server/api/routers/admin/log.ts:23`, `adminLog` 조회 `log.ts:71-72`) | 격차 | 레거시 검색 대상 `ipaddress/user_id/email_address/phone_number/user_name/nick_name`, 동작 유형 select, 기간 삭제 폼(`procMemberAdminClearAuthLog`, `days`). 데이터는 `LoginAttempt`(`schema.prisma:521`, `login_attempts`, 컬럼 ip/identifier/result/createdAt)에 쌓이고 2FA 실패도 기록(`server/api/routers/admin/two-factor.ts:117,126,144`)하지만, 이를 조회·삭제하는 관리자 UI·라우터가 없다. 사용자명·이메일 컬럼도 없다. |
| `dispMemberAdminConfig` | 회원 설정 (기본) | `dispMemberAdminConfig-1i7oykr.json` | 기본 설정 탭 `settings/page.tsx:89`, `DefaultSettingsForm` `settings/forms.tsx:42`, `updateDefaultSettingsAction` `settings/actions.ts:80`, 스키마 `settings.ts:58` | 대응 있음 | 없는 것: `member_mid`(회원 모듈 식별 URL), `force_mid`, `password_change_invalidate_other_sessions`(비밀번호 변경 시 다른 세션 무효화), `password_reset_method`(비밀번호 재설정 방식). `password_hashing_algorithm` 은 rhymix-ts 가 Argon2id 고정·읽기 전용(`forms.tsx:215`)이라 선택 기능 자체가 없다. 있는 것: 가입 허가·가입키·인증 메일 유효기간·프로필 사진 노출·닉네임 4종·비밀번호 수준·Argon2 time cost·자동 재해시. |
| `dispMemberAdminDesignConfig` | 회원 설정 (디자인) | `dispMemberAdminDesignConfig-1kreill.json` | 디자인 탭 `settings/page.tsx:133`, `DesignSettingsForm` `settings/forms.tsx:527`, `updateDesignSettingsAction` `settings/actions.ts:205` (`memberSkinId`, `memberTemplateId` 는 `actions.ts:201-202`, `settings.ts:937-938`) | 의도적 제외 후보 | 없는 것: `layout_srl`, `mlayout_srl`(레이아웃 선택), `colorset`(컬러셋), `mskin`(모바일 스킨). rhymix-ts 는 회원 스킨과 템플릿 2개만 제공한다. 레이아웃·컬러셋 개념을 들이지 않는다는 결정이 필요하다. |
| `dispMemberAdminFeaturesConfig` | 회원 설정 (기능) | `dispMemberAdminFeaturesConfig-14y16lk.json` | 기능 탭 `settings/page.tsx:126`, `FeatureSettingsForm` `settings/forms.tsx:599`, `updateFeatureSettingsAction` `settings/actions.ts:242`, 스키마 `settings.ts:102` (`allowProfileImage`, `allowSignature`, `exposeInMemberSearch`, `allowMessages`) | 격차 | 레거시 토글 7종 중 rhymix-ts 는 4종만 대응. 없는 것: `scrapped_documents`, `saved_documents`, `my_documents`, `my_comments`(회원 앱에 스크랩·저장함·작성 글·작성 댓글 기능 자체가 grep 0건 — 제외 후보로 볼 수 있음), `active_logins`, `auth_log`, `nickname_log`(메뉴 노출 토글). |
| `dispMemberAdminGroupList` | 회원 그룹 | `dispMemberAdminGroupList-13ieuz8.json` | 목록 `app/admin/members/groups/page.tsx:16`, 폼 `groups/forms.tsx`(`isDefault` :53, `imageMark` :66), Server Action `groups/actions.ts:36(create) 76(update) 117,130(delete)`, tRPC `server/api/routers/admin/group.ts:19,88,128,178,260(reorder)` | 대응 있음 | 레거시 `descriptions[]`(그룹 설명) 필드 대응 여부는 이번 조사에서 미확인. 레거시 `group_image_mark` 라디오 → `imageMark` 로 대응. 다국어 입력(`getModuleAdminMultilingualHtml`)은 rhymix-ts 에 없는 것으로 보이나 미확인. |
| `dispMemberAdminInfo` | 회원 목록 (공통 헤더) | `dispMemberAdminInfo-j4e5v3.json` | 회원 목록과 동일 화면 `app/admin/members/page.tsx:49` | 대응 있음 | 레거시는 폼 없는 헤더 act. 목록 화면과 같은 제목이라 같은 대응으로 묶었다. |
| `dispMemberAdminInsert` | 회원정보 조회/수정 | `dispMemberAdminInsert-pw8mdg.json` | **상세·수정 화면 없음.** 목록 행에 링크 없음(`app/admin/members/components/MemberTable.tsx`, 링크는 정렬 헤더뿐). `user.get` 프로시저(`server/api/routers/admin/user.ts:161`)는 호출자가 없고, `user.update`(`user.ts:236`)는 상태 변경(`userId`, `status`)만 받는다. 등록 `app/admin/members/new/actions.ts:34`, `CreateMemberForm.tsx`(그룹 `groupId`) | 격차 | 레거시 수정 폼 필드: `user_id`, `email_address`, `reset_password`, `user_name`, `nick_name`, `homepage`, `blog`, `birthday`, `allow_mailing`, `allow_message`, `status`, `limit_date`/`limited_reason`(제한일), `refused_reason`, `is_admin`, `description`, `group_srl_list[]`. 이 중 프로필 수정·제한일·관리자 여부·설명·그룹 재배정은 기존 회원에 대해 수정할 방법이 없다. 상태만 `bulk`(suspend/deny/approve/delete, `user.ts:258`)와 `update` 로 바꿀 수 있다. 상세 화면 경로 `app/admin/members/[id]/` 는 `points` 하위만 존재. |
| `dispMemberAdminInsertJoinForm` | 회원가입 추가 항목 생성·편집 | `dispMemberAdminInsertJoinForm-dkkhps.json` | 가입 양식 편집 `app/admin/members/joinform/page.tsx:15`, `JoinFormEditor.tsx`, Server Action `joinform/actions.ts:18`, 스키마 `server/api/routers/admin/settings.ts:113-125` (`key/label/type/required/order`) | 대응 있음 | 없는 것: 항목 설명(desc), 기본값(default), 다국어 제목(`getModuleAdminMultilingualHtml`). 입력 형식은 `text/textarea/select/checkbox` 4종으로 제한된다(레거시는 더 많음). 사이드바에 링크가 없고 설정 화면 `settings/page.tsx:39` 에서만 진입한다. |
| `dispMemberAdminList` | 회원 목록 | `dispMemberAdminList-1a7p11w.json`, `-1ge3fl3.json`, `-1wmzwwi.json`, `-dg03qu.json` | 목록 `app/admin/members/page.tsx:49`, 행 `components/MemberTable.tsx`, 일괄 처리 `MemberTable.tsx:55`(`admin.user.bulk`), tRPC `server/api/routers/admin/user.ts:87`(list, 검색 `:90`, 필터 `filterAdmin` `:93`, `groupId` `:95`), `user.ts:258`(bulk) | 대응 있음 | 없는 것: 선택 회원 그룹 일괄 배정(`groups[]`), 선택 회원에게 쪽지 메시지 발송(`message`). 일괄 처리는 suspend/deny/approve/delete 4종뿐. 레거시 `denied` 라디오(상태 전환)는 bulk 의 deny 로 대응. |
| `dispMemberAdminLoginConfig` | 회원 설정 (로그인) | `dispMemberAdminLoginConfig-1913xeq.json` | 로그인 탭 `settings/page.tsx:103`, `LoginSettingsForm` `settings/forms.tsx:337`, `updateLoginSettingsAction` `settings/actions.ts:127`, 스키마 `settings.ts:86` (`allowAutoLogin`, `autoLoginDuration`, `maxFailedAttempts`, `redirectAfterLogin`) | 대응 있음 | 없는 것: `identifiers[]`(로그인 식별자 선택), `change_password_date`(비밀번호 변경 주기), `max_error_count_time`(실패 집계 시간창, rhymix-ts 는 횟수만), `login_failure_except_ip`(실패 집계 제외 IP), `login_log`(로그인 기록 여부), `login_invalidate_other_sessions`(로그인 시 다른 세션 무효화), `after_logout_url`, `after_login_url`(rhymix-ts 는 enum 3종만). |
| `dispMemberAdminNickNameLog` | 닉네임 변경 기록 | `dispMemberAdminNickNameLog-awwvql.json` | 화면 `app/admin/members/nickname-log/page.tsx:19`, tRPC `server/api/routers/admin/user.ts:392`(`nicknameLog`), 설정 탭에서 링크 `settings/page.tsx:33` | 대응 있음 | 레거시 기간 삭제 폼(`procMemberAdminClearModifyNickNameLog`, `days`) 대응은 미확인. 검색 대상 `search_target` 대응은 확인 안 함. |
| `dispMemberAdminSignUpConfig` | 회원 설정 (가입) | `dispMemberAdminSignUpConfig-99ra1v.json` | 가입 탭 `settings/page.tsx:96`, `SignupSettingsForm` `settings/forms.tsx:258`, `updateSignupSettingsAction` `settings/actions.ts:33`, 스키마 `settings.ts:48` (`signupAccessMode`, `signupKey`, `emailAuthTtlHours`, `requireEmailVerification`, `requireAdminApproval`, `defaultGroupId`, `allowDuplicateNickname`). 이메일 도메인 검사는 별도 화면 `app/admin/members/email-hosts/page.tsx` | 대응 있음 | 없는 것: `limit_day`/`limit_day_description`(가입 제한일), SMS·휴대폰 인증(`special_phone_number`, `special_phone_code`, `max_auth_sms_count`, `max_auth_sms_count_time`), `redirect_url`(가입 후 이동 URL), 기본 입력 항목 사용·순서(`usable_list[]`, `list_order[]`), `is_user_id_public`(ID 공개 여부), 휴대폰 번호 옵션 전반. 이메일 도메인 검사(`emailhost_check`)는 `email-hosts` 화면으로 대응. |
| `dispPointAdminConfig` | 포인트 (사이트 설정) | `dispPointAdminConfig-pto8fh.json` | 화면 `app/admin/site/points/page.tsx:13`, 폼 `PointConfigForm.tsx:26`(fetch) → `app/admin/api/site/points/config/route.ts:12`(POST) → `packages/point/src/config.ts:5,16`, 스키마 `packages/point/src/schemas.ts:3` | 격차 | rhymix-ts 설정은 4종(`signupBonus`, `clampToZero`, `allowNegativeBalance`, `defaultLevel`)뿐. 없는 것: 포인트 이름(`point_name`), 최대 레벨·레벨 아이콘(`max_level`, `level_icon`), 다운로드·읽기 제한(`disable_download`, `disable_read_document*`), 행위별 포인트 전부(로그인, 문서·댓글 삭제 시 회수 여부, 업로드, 다운로드, 읽기, 추천·비추천, 작성자 보상 등). 엔진 쪽 이벤트 훅은 문서 생성·댓글 생성·추천·회원 가입 4종(`packages/point/src/hooks.ts:38,61,84,108`)뿐이며, 금액은 호출자가 이벤트에 실어 보낸다. `getLevel` 은 `_memberId` 를 쓰지 않는 시그니처(`packages/point/src/service.ts:173`)라 레벨 계산 구현 여부를 확인해야 한다. |
| `dispPointAdminModuleConfig` | 포인트 (모듈별 설정) | `dispPointAdminModuleConfig-1hyghc.json`, `-ir0gl5.json` | 대응 없음. `packages/point` 에 모듈 단위 키가 없고(`schemas.ts`, `service.ts`, `config.ts` 에 module 관련 항목 없음), 포인트 UI 는 사이트 단위 하나뿐 | 격차 | 레거시는 모듈(51·55·53 등 게시판 모듈 srl) 별로 문서·댓글·업로드·다운로드·읽기·추천 포인트를 따로 지정한다. 설계 자체를 사이트 단위로 할지 결정이 필요하다. |
| `dispPointAdminPointList` | 포인트 목록 | `dispPointAdminPointList-b9j06e.json`, `-xstzb7.json` | 회원별 상세만 있음. `app/admin/members/[id]/points/page.tsx:18`(`MemberPointsPage`), `PointAdjustForm.tsx:26` → `app/admin/api/points/adjust/route.ts:12`(POST), 이력 `packages/point/src/service.ts:141`(`getHistory`). 전체 회원 목록 화면 없음 | 격차 | 레거시 검색(`is_admin`, `selected_group_srl`, `search_target`, `search_keyword`)과 전체 목록이 없다. `members/[id]/points` 로 들어가는 링크도 사이드바(`components/admin/AdminSidebar.tsx:98-102`)와 회원 목록 행에 없어 URL 직접 입력으로만 도달 가능하다. |

## 교차 발견 (표 밖)

1. **진입 경로 누락**: 사이드바 회원 메뉴 링크는 `/admin/members`, `groups`, `new`, `settings`, `site/points` 5개뿐이다(`AdminSidebar.tsx:98-102`). `terms`, `email-hosts`, `joinform`, `nickname-log`, `denied-list` 는 화면이 있어도 어디서도 링크하지 않는다. 설정 화면 링크는 `nickname-log`, `denied-list`, `joinform` 3개뿐이다(`settings/page.tsx:33,36,39`). `terms` 와 `email-hosts` 는 inbound 링크가 0건이다.
2. **레거시 act 없는 rhymix-ts 화면**: `denied-list`(거부 식별자), `email-hosts`(이메일 도메인 검사), `settings/social`(소셜 로그인, 페이지가 조건부로 `/` 로 redirect 함 `settings/social/page.tsx:19`), `members/new`, `members/groups/[id]/edit`. 판정표에서 제외했다. 소셜 로그인 설정이 지도상 어떤 act 에도 대응하지 않는다는 점은 확인했다.
3. **레거시 인증 로그 데이터 원천**: 레거시 `dispMemberAdminAuthLog` 는 `member_auth_log` 테이블을 `member` 와 left join 해 조회한다(`modules/member/member.admin.view.php:793`, `queries/getAuthLogList.xml`). rhymix-ts 에는 같은 개념의 테이블이 없고 `login_attempts` 가 가장 가깝다.

## 다음 단계 제안 (판정 후속, 사용자 결정 필요)

- 의도적 제외 후보 1건(`dispMemberAdminDesignConfig` 의 레이아웃·컬러셋·모바일 스킨)과 `dispMemberAdminFeaturesConfig` 의 스크랩·저장함·작성 글·작성 댓글 4종을 제외할지 결정한다.
- `dispMemberAdminInsert`(회원 상세·수정)는 격차 중 가장 크다. `user.get`·`user.update` 는 서버에 있으나 UI 가 없다.
- 포인트는 사이트 단위 설계로 갈지, 행위별·모듈별 설정을 추가할지 결정한다.

---

## 부록: 판정 근거 (grep 명령과 실제 출력 요약)

모든 명령은 읽기 전용이다. 출력은 핵심만 요약했다.

1. `python3`로 `coverage.md` 의 `| member |`·`| point |` 행을 세었다.
   - 출력: 16행 (member 13, point 3).
2. `python3` 으로 `pages/dispMemberAdmin*.json`, `dispPointAdmin*.json` 을 파싱해 `forms` 중 `actField != procAdminToggleFavorite` 인 폼의 필드명을 추출했다(위 비고의 레거시 필드 목록 근거).
   - 출력: 레거시 폼 액션 `procMemberAdmin*`, `procPointAdmin*`, `dispMemberAdminList`, `dispPointAdminPointList` 등. 공통 즐겨찾기 폼 `procAdminToggleFavorite` 은 제외.
3. `find apps/web/app/admin/members apps/web/app/admin/site/points apps/web/app/admin/settings/social -name "*.tsx" -path "*\[*"`
   - 출력: `members/[id]/points/page.tsx`, `PointAdjustForm.tsx`, `groups/[id]/edit/page.tsx`. `members/[id]/page.tsx` 없음.
4. `grep -rn -E "회원정보 수정|회원 정보 수정|member_srl|/admin/members/\[|/admin/members/\$\{" apps/web --include=*.tsx --include=*.ts`
   - 출력: `.next/` 타입 산출물과 `e2e/legacy-crawl` 만. 회원 수정 화면 호출 없음.
5. `grep -rn -E "user\.update|user\.get\b|updateUser" apps/web/app apps/web/components`
   - 출력: `app/admin/members/page.tsx:9`(주석, `admin.user.update` 는 상태 변경용이라 명시)와 무관한 prisma 호출뿐. `user.update` 의 UI 호출자 없음. `user.get` 호출자 없음.
6. `grep -n "href=" app/admin/members/settings/page.tsx`
   - 출력: `:33` nickname-log, `:36` denied-list, `:39` joinform, `:49~67` 탭 앵커.
7. `grep -rn -E "admin/members/(joinform|terms|nickname-log|denied-list|email-hosts|settings|groups|new)['\"\`]" app components`
   - 출력: 설정 화면 3개 링크, 그룹 목록과 편집 화면 상호 링크, denied-list·email-hosts 의 자기 참조뿐. `terms`·`email-hosts` inbound 링크 없음.
8. `sed -n 96,102p components/admin/AdminSidebar.tsx` (grep `members|points`)
   - 출력: `/admin/members`, `/admin/members/groups`, `/admin/members/new`, `/admin/members/settings`, `/admin/site/points` 5개.
9. `grep -rln -E "스크랩|scrap" app/\(member\) app/\(site\) components`
   - 출력: 없음 (0건).
10. `grep -rlE "auth_log|authLog|인증 로그|로그인 기록" apps/web/app apps/web/server packages`
    - 출력: 없음 (0건). 인증 로그 화면 없음.
11. `grep -rn -E "loginAttempt|LoginAttempt" apps/web/app apps/web/server packages/auth/src`
    - 출력: `server/api/routers/admin/two-factor.ts:13,109,117,126,144`, `packages/auth/src/login.ts:14,15,143`. 관리자 조회 경로 없음.
12. `grep -n -E "^model .*(Log|Auth|Point)" packages/db/prisma/schema.prisma`
    - 출력: `AdminLog:241`, `LoginAttempt:521`, `AuditLog:569`, `Terms:637`, `Point:659`, `SitePointConfig:680`, `NicknameChangeLog:1527`. `log.ts:71-72` 은 `adminLog` 만 조회.
13. `grep -n -E "^\s+async on[A-Za-z]+\(" packages/point/src/hooks.ts`
    - 출력: `onDocumentCreated:38`, `onCommentCreated:61`, `onVoteCast:84`, `onMemberSignedUp:108`.
14. `grep -rln -E "packages/point|@rhymix-ts/point" apps/web --include=*.ts --include=*.tsx` (node_modules·.next 제외)
    - 출력: `app/admin/api/points/adjust/route.ts`, `app/admin/api/site/points/config/route.ts`, `app/admin/members/[id]/points/page.tsx`, `app/admin/site/points/page.tsx`, `PointConfigForm.tsx`. 포인트 UI 는 이 5개 파일뿐.
15. `grep -n -E "^const [A-Za-z]+Schema|^export const adminSettingsRouter" server/api/routers/admin/settings.ts` 및 스키마 필드 목록 확인
    - 출력: `SignupSettingsSchema:48`, `DefaultSettingsSchema:58`, `LoginSettingsSchema:86`, `AgreementSettingsSchema:93`, `FeatureSettingsSchema:102`, `JoinFormFieldSchema:113`, `JoinFormSettingsSchema:121`.
16. `grep -n -E "memberSkinId|memberTemplateId" server/api/routers/admin/*.ts app/admin/members/settings/*`
    - 출력: `settings.ts:937-938`, `settings/actions.ts:201-202`. 디자인 설정은 스킨 2개뿐.
17. `grep -n -E "^\s+[a-z]+:" settings.ts` 와 `grep -n "limit_day|limitDay|identifiers|identifier|max_error_count_time|login_log|scrap|changePasswordDate|colorset"` 계열
    - 출력: 위 비고의 "없는 것" 항목 모두 rhymix-ts 쪽 0건. 레거시 필드명 기준으로 검색했고 rhymix-ts 는 개념명으로 매핑했다.
18. `sed -n 521,530p packages/db/prisma/schema.prisma` 와 `sed -n 637,658p` 로 `LoginAttempt`·`Terms` 필드 확인.
    - 출력: `LoginAttempt` = id, ip, identifier, result, createdAt. `Terms` = id, siteId, type('terms'|'privacy'|'custom'), title, content, required, active, createdAt, updatedAt.
19. 레거시 소스 확인: `grep -rn -E "dispMemberAdminAuthLog|dispMemberAdminNickNameLog|dispPointAdminModuleConfig|dispMemberAdminAgreementsConfig" /mnt/d/project/rhymix/modules/{member,point}/*.php`
    - 출력: `member.admin.view.php:190`(AgreementsConfig), `:793`(AuthLog, `member.getAuthLogList` 호출), `:820`(NickNameLog), `member.admin.controller.php:1193,1216`(redirect), `point.admin.view.php:66`(ModuleConfig). `getAuthLogList` 쿼리는 `member_auth_log` 를 `member` 와 left join.

## 미검증 (Gaps)

- 레거시 화면을 브라우저로 열어 확인하지 않았다. 폼 필드는 `pages/*.json` 의 캡처에서만 읽었다.
- `dispMemberAdminGroupList` 의 `descriptions[]` 와 다국어 입력의 rhymix-ts 대응 여부.
- `dispMemberAdminNickNameLog` 의 기간 삭제 기능 대응 여부.
- `dispPointAdminConfig` 의 `getLevel` 구현 여부(`service.ts:173` 본문 미확인).
- 커스텀 약관의 행별 필수 토글 UI 여부(`TermsEditor.tsx` 본문 미확인).
- `settings/social` 페이지의 조건부 redirect 조건(`settings/social/page.tsx:15-19`) 미확인.

## 잔여 위험 (Residual-risk)

- 판정 3종은 거친 분류다. "대응 있음" 9행 모두 부분 누락이 있으며, 세부는 비고에 적었다. 부분 대응을 별도 판정으로 나눌지는 사용자 결정 사항이다.
- 의도적 제외 후보 1건과 격차 중 제외 후보 4종은 설계 결정이 필요하다. 이 초안은 제외를 권고하지 않는다.

## 정정 (2026-11-28, moai3 발견 · moai 재확인) — 상세: `lgp-005-006-unverified-check.md`

- `dispMemberAdminAgreementsConfig` → **격차로 정정.** 약관 편집 화면(`apps/web/app/admin/members/terms`)의 저장·삭제 Server Action 이 목업이다: `terms/actions.ts:48-53` `console.log('[Mock] Upsert term:', …)`, `:77-82` `[Mock] Delete term`. tRPC `admin.terms.create/update/delete` 는 있으나 연결이 주석 처리돼 있다. 관리자가 저장해도 DB 에 남지 않는다(조용한 데이터 손실) → 버그 수리 대상.
