# LGP-008 방문자 회원 셀프서비스 판정표 초안 (member 비관리자 act + document dispTempSavedList)

- 작성: moai3 (보조 세션), 읽기 전용 분석
- 범위: `legacy-front-map/summary.md` 기준 모듈 `member` 의 비관리자 act 중 방문(18) + 미방문 `dispMemberLogout`(소스 판정) = 19행, 그리고 모듈 `document` 의 `dispTempSavedList` (소스 판정) 1행. 합계 20행.
- 신분 규칙: 화면 내용 비교는 `-admin` 파일 기준. 비회원(`-guest`) 파일은 "로그인 요구 여부" 비교에만 썼다.
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 레거시 DB 변경, 전체 테스트·빌드. 레거시 화면을 브라우저로 열지 않았다.
- 판정 기준: **대응 있음** = 화면과 주 기능이 rhymix-ts 에 있다. **격차** = 주 기능이 없거나 대부분 누락. **의도적 제외 후보** = 구조상 또는 기능 자체가 없어 제외가 타당해 보인다. 최종 결정은 사용자 몫이다.
- 로그인 요구 비교는 행별 비고에 적었다. 레거시 `permission=member` 행은 비회원 파일이 빈 본문이며, rhymix-ts 쪽 `(member)` 페이지는 `/login?callbackUrl=` 로 보낸다(확인 완료).

## 요약

| 판정 | 개수 | act |
|---|---:|---|
| 대응 있음 | 4 | dispMemberSignUpForm, dispMemberLoginForm, dispMemberLogout(소스), dispTempSavedList(소스) |
| 격차 | 16 | dispMemberIndex, FindAccount, ResendAuthMail, Info, ModifyInfo, ModifyPassword, ModifyEmailAddress, Leave, ScrappedDocument, SavedDocument, OwnDocument, OwnComment, ActiveLogins, AuthLog, ModifyNicknameLog, Spammer |
| 의도적 제외 후보 | 0 | (격차 중 스크랩·저장함·Spammer 는 제외 검토 대상으로 비고에 표시) |

합계 20. 행별 판정은 아래 표가 정본이다.

## 판정표

| 레거시 act | 모듈·권한 | 화면 제목 (-admin 기준) | 근거 파일 | rhymix-ts 대응 (라우트·Server Action·tRPC, 파일:줄) | 판정 | 비고 |
|---|---|---|---|---|---|---|
| `dispMemberIndex` | member · 권한 없음 | 회원정보 보기 (로그인 상태 홈) / 로그인 (비회원) | `dispMemberIndex-guest.json`, `-admin.json` | 비회원: `apps/web/app/(auth)/login/page.tsx`. 로그인 상태 홈: 없음 | 격차 | 비회원 진입은 `/login` 으로 대응된다. 로그인 회원의 홈(회원 정보 요약, 메뉴 진입점)이 없다. |
| `dispMemberSignUpForm` | member · 권한 없음 | 회원가입 (비회원 본문) | `dispMemberSignUpForm-guest.json`, `-admin.json` (-admin 은 본문 없이 헤더만) | `apps/web/app/(auth)/signup/page.tsx:87,105`(제목 h1), `TermsConsent.tsx`(약관 동의), `TurnstileWidget.tsx`(CAPTCHA) | 대응 있음 | 레거시 가입 폼 항목은 아이디·비밀번호(6자 이상, 영문·숫자 조합)·이메일·닉네임 등이다. rhymix-ts 는 `packages/auth/src/signup.ts` 에 정책 검증이 있다. 입력 항목 세부 대조는 미확인. 로그인 요구 없음 — 양쪽 일치. |
| `dispMemberLoginForm` | member · 권한 없음 | 로그인 (비회원 본문) | `dispMemberLoginForm-guest.json`, `-admin.json` | `apps/web/app/(auth)/login/page.tsx:78`(아이디 또는 이메일), `:115`(로그인 상태 유지 = 레거시 `keep_signed`), `:145`(회원가입 링크), `:150`(비밀번호 찾기 링크) | 대응 있음 | 레거시 `ID/PW 찾기` 링크는 rhymix-ts 에서 "비밀번호 찾기" 만 남았다(`:150`). 아이디 찾기는 행 `dispMemberFindAccount` 에서 다룬다. |
| `dispMemberFindAccount` | member · 권한 없음 | ID/PW 찾기 (이메일 주소로 계정 찾기) | `dispMemberFindAccount-guest.json`, `-admin.json` | 비밀번호 재설정만: `apps/web/app/(auth)/password-reset/page.tsx:38-66`(입력: "아이디 또는 이메일", 결과: 재설정 링크 전송), Server Action `requestPasswordResetAction`(`:14,:24`). 아이디 찾기 화면·Action 없음 | 격차 | 레거시 본문은 "회원정보에 등록된 메일 주소로 아이디/비밀번호를" 찾는다. rhymix-ts 는 비밀번호 재설정만 있다. 아이디를 이메일로 돌려보내는 흐름이 없다. |
| `dispMemberResendAuthMail` | member · 권한 없음 | 인증메일 재발송 (본문: 가입 인증 메일을 받지 못한 경우 다시 받을 수 있습니다) | `dispMemberResendAuthMail-guest.json`, `-admin.json` | 재발송 UI·Action 없음. `apps/web/app/(auth)/verify-email/page.tsx` 는 링크 클릭 처리만. `packages/auth/src/verify-email.ts:21` 주석에만 "재발송 안내"가 언급된다 | 격차 | 만료 토큰에 대해 재발송을 안내하도록 설계돼 있으나(주석), 실제 재발송 엔드포인트가 없다. grep `resend|재발송` 은 apps/web 에 0건. |
| `dispMemberInfo` | member · 권한 member | 회원정보 보기 (-admin) / 비회원은 빈 본문 (로그인 요구) | `dispMemberInfo-guest.json`, `-admin.json` | 대응 없음. `apps/web/app/(member)/` 아래 회원정보 보기 페이지 없음 (`(member)` 는 drafts, messages, notifications, settings/messages, settings/notifications, documents/[id]/history 뿐) | 격차 | 비회원 로그인 요구: rhymix-ts 쪽 `(member)` 는 `/login?callbackUrl=` 로 보낸다(확인). 화면 자체가 없다. |
| `dispMemberModifyInfo` | member · 권한 member | 회원정보 변경 (-admin, 폼 `ruleset` 포함) | `dispMemberModifyInfo-guest.json`, `-admin.json` | 대응 없음. 프로필·닉네임·이메일 등 회원 정보 수정 화면 없음. tRPC `admin.user.update` 는 관리자 상태 변경 전용 | 격차 | 비회원 로그인 요구 동일. 관리자 쪽 `user.update` 는 status 만 받는다(`apps/web/server/api/routers/admin/user.ts:236`), 본인 정보 수정 경로는 없다. |
| `dispMemberModifyPassword` | member · 권한 member | 비밀번호 변경 (-admin, 폼 `current_password`, `password1`, `password2`) | `dispMemberModifyPassword-guest.json`, `-admin.json` | 로그인 상태에서 변경하는 화면·Action 없음. 재설정 흐름만 있다: `apps/web/app/(auth)/password-reset/confirm/page.tsx`, `packages/auth/src/password-reset.ts`(`confirmPasswordReset`) | 격차 | `packages/auth/src/login.ts:95,330,345` 는 `needsPasswordChange` 플래그를 계산하지만 `apps/web` 에서 소비하지 않는다(grep 0건). 비밀번호 만료 시 변경 페이지로 보낼 곳이 없다. |
| `dispMemberModifyEmailAddress` | member · 권한 member | 회원정보 변경 (이메일 주소 변경, -admin) | `dispMemberModifyEmailAddress-guest.json`, `-admin.json` | 대응 없음. 이메일 변경 템플릿만 있다: `packages/auth/src/mail/templates/email-change.ko.ts`, `email-change.en.ts`, `render.ts:34`. 발송 호출자는 0건(`'email-change'` 는 `mail.ts:20` 타입 정의만) | 격차 | 템플릿은 있으나 변경 흐름이 연결되지 않았다. |
| `dispMemberLeave` | member · 권한 member | 회원 탈퇴 (-admin, 폼 `password`, `ruleset`) | `dispMemberLeave-guest.json`, `-admin.json` | 본인 탈퇴 화면 없음. `softDeleteUser` 는 관리자 일괄 삭제에서만 호출(`apps/web/server/api/routers/admin/user.ts:277`) | 격차 | 관리자 삭제 경로만 있다. 본인이 탈퇴하는 셀프 흐름과 확인 절차가 없다. |
| `dispMemberScrappedDocument` | member · 권한 member · route `my_scrap` | 스크랩 보기 (-admin) | `dispMemberScrappedDocument-guest.json`, `-admin.json` | 대응 없음. 스크랩 기능 자체가 회원 앱에 없다(grep `스크랩|scrap` 0건, `app/(member)`·`app/(site)`·`components`) | 격차 | 기능 부재. 제외 후보로 볼 수 있다(`LGP-002` 의 `FeaturesConfig` 와 같은 결정 묶음). |
| `dispMemberSavedDocument` | member · 권한 member · route `my_saved_documents` | 저장함 보기 (-admin) | `dispMemberSavedDocument-guest.json`, `-admin.json` | 대응 없음. `(member)/drafts/page.tsx` 는 임시글(TEMP 상태) 목록이라 저장함과 다르다 | 격차 | 레거시 저장함은 "보관" 기능이다. rhymix-ts 에 같은 개념이 없다. 제외 후보로 볼 수 있다. |
| `dispMemberOwnDocument` | member · 권한 member · route `my_documents` | 작성 글 보기 (-admin) | `dispMemberOwnDocument-guest.json`, `-admin.json` | 대응 없음. 본인 작성 글 목록 화면 없음 (grep `내 글|작성 글|my_documents` 0건) | 격차 | 게시판 공통 목록은 `apps/web/app/[mid]/page.tsx` 이며 작성자 필터는 없는 것으로 보인다(미확인). |
| `dispMemberOwnComment` | member · 권한 member · route `my_comments` | 작성 댓글 보기 (-admin, 본문 예: "[크롤 표본] 레거시 지도 수집용 글") | `dispMemberOwnComment-guest.json`, `-admin.json` | 대응 없음. 본인 작성 댓글 목록 화면 없음 | 격차 | 비회원 파일도 본문이 보이는데 `-guest` 에 크롤 표본 제목이 나온다. 레거시 권한은 `member` 이지만 비회원 화면에 목록 본문이 노출된 것으로 보여 권한 검사 결과를 재확인할 필요가 있다(미확인). |
| `dispMemberActiveLogins` | member · 권한 member · route `active_logins` | 자동 로그인 관리 (-admin) | `dispMemberActiveLogins-guest.json`, `-admin.json` | 대응 없음 (화면). 세션·자동 로그인 함수는 있다: `packages/auth/src/session-revocation.ts`(`revokeAllSessions`), `packages/auth/src/autologin.ts`(`createAutoLogin`, `revokeAutoLogin`). 호출하는 UI·tRPC 없음 | 격차 | 함수는 패키지에 있으나 본인 세션 목록·개별 해제 화면이 없다. |
| `dispMemberAuthLog` | member · 권한 member · route `auth_log` | (-admin 본문 빈 제목) 인증 로그 | `dispMemberAuthLog-guest.json`, `-admin.json` | 대응 없음. 관리자 쪽 `login_attempts` 조회도 없다(`LGP-002` 의 `dispMemberAdminAuthLog` 와 동일 결론) | 격차 | 본인 인증 로그 보기는 `LoginAttempt`(`packages/db/prisma/schema.prisma:521`) 기반으로 만들 수 있다. 레거시 원천은 `member_auth_log` 다. |
| `dispMemberModifyNicknameLog` | member · 권한 member · route `nickname_log` | (-admin 본문 빈 제목) 닉네임 변경 기록 | `dispMemberModifyNicknameLog-guest.json`, `-admin.json` | 본인 화면 없음. 관리자 쪽 `apps/web/app/admin/members/nickname-log/page.tsx:19`, tRPC `user.ts:392`(`nicknameLog`) 만 있다 | 격차 | 관리자 화면은 있으나 회원 본인 열람 화면이 없다. 쓰기 측 `NicknameChangeLog` 모델(`schema.prisma:1527`)은 있다. |
| `dispMemberSpammer` | member · 권한 **root** · `check_var=module_srl` | 스패머 관리 (-admin): 지정 회원 차단 + 회원이 남긴 글·댓글 삭제, 관리자 메모, 휴지통 이동 | `dispMemberSpammer-guest.json`, `-admin.json` | 대응 없음. 관리자 신고 처리 `apps/web/server/api/routers/admin/spamfilter.ts:29,48`(`reports`, `resolveReport`) 만 있다. 회원 차단+글 일괄 삭제 조합 없음. 회원 상태 일괄 처리는 `user.ts:258`(bulk, suspend/deny/approve/delete) | 격차 | 레거시는 모듈 단위 root 권한 기능이다. rhymix-ts 는 회원 상태 변경(bulk)과 스팸 신고 처리로 나뉘어 있고, "차단 + 글 일괄 삭제" 한 번에 하는 흐름이 없다. 관리자 전용이므로 제외 여부를 사용자가 결정한다. |
| `dispMemberLogout` (**미방문, 소스 판정**) | member · 권한 없음 | (방문 안 함) 로그아웃 후 `redirect_url` 로 이동 | 소스: `modules/member/member.view.php:940-` (`isSameOrigin` 검사, 비로그인이면 `redirect_url` 로 이동, 로그인이면 `procMemberLogout`) · `modules/member/conf/module.xml:34` | `apps/web/components/layout/UserAuthSection.tsx:12`(`<form action="/auth/signout" method="post">`, 로그아웃 버튼 `:46`), 라우트 `apps/web/app/auth/signout/route.ts`(주석 `:4`: POST, 세션 종료 후 홈으로 리다이렉트) | 대응 있음 | 레거시 `redirect_url` 인자는 rhymix-ts 에 없고 홈으로 고정이다. 오리진 검사는 POST 폼 방식으로 대체됐다. 실제 동작은 브라우저 검증 전이다. |
| `dispTempSavedList` (**document 모듈, 소스 판정**) | document · 권한 member · popup_layout | (레거시 게시판 문맥에서 `ERR_ACT_NOT_FOUND`, 본문 "잘못된 요청입니다") | 소스: `modules/document/document.view.php:237-` (비로그인 시 `MustLogin`, 임시 저장 문서 10건 페이징), `modules/document/conf/module.xml:7` | `apps/web/app/(member)/drafts/page.tsx:33`(비로그인 `redirect('/login?callbackUrl=/drafts')`), `:45`(h1 "내 임시글"), `:48`(빈 목록 문구), 발행 버튼 (파일 상단 주석) | 대응 있음 | 로그인 요구: 레거시 `MustLogin` ↔ rhymix-ts 로그인 리다이렉트, 일치. 레거시는 팝업 레이아웃이고 rhymix-ts 는 전체 페이지다. 페이징 개수(10건)는 rhymix-ts 쪽 확인 안 함. 발행 버튼은 이 파일 주석 기준이다. |

## 교차 발견 (표 밖)

1. **로그인 요구 일치 여부**: 레거시 `permission=member` 행 12개(Info, ModifyInfo, ModifyPassword, ModifyEmailAddress, Leave, Scrapped, Saved, OwnDocument, OwnComment, ActiveLogins, AuthLog, ModifyNicknameLog)는 비회원 파일이 빈 본문이다. rhymix-ts 쪽 대응 페이지가 없어 비교 대상 자체가 없지만, 같은 영역의 `(member)` 페이지 4개(notifications, settings/notifications, messages, settings/messages)와 drafts 는 모두 `/login` 으로 보낸다. 같은 정책이다.
2. **`OwnComment` 비회원 노출**: 레거시 `dispMemberOwnComment-guest.json` 에 크롤 표본 제목과 본문이 보인다. `permission=member` 인데 비회원에게 내용이 나간 것으로 읽힌다. 레거시 권한 검사 결과를 실제로 확인해야 한다. 이 초안에서는 미확인으로 둔다.
3. **`needsPasswordChange` 미소비**: 로그인 결과 플래그는 있으나 소비 측이 없다(`packages/auth/src/login.ts:95,330,345`). 비밀번호 만료 정책이 실제로 강제되지 않는다. 이 행은 `dispMemberModifyPassword` 의 격차와 함께 보는 것이 맞다.
4. **레거시 메뉴 노출 기준**: `-admin` 파일의 헤더에는 `스크랩 보기 저장함 보기 작성 글 보기 작성 댓글 보기 자동 로그인 관리` 메뉴가 보인다. rhymix-ts 의 로그인 후 메뉴에는 해당 진입점이 없다(`UserAuthSection.tsx` 에 로그아웃 외 항목 확인 필요).

## 다음 단계 제안 (사용자 결정 필요)

- 격차 16행 중 **기능 자체가 없는** 항목(스크랩, 저장함, 작성 글·댓글 목록, 본인 로그인 기록)은 제외할지, 구현할지 결정한다. `LGP-002` `dispMemberFindAccount`·`FeaturesConfig` 와 묶어서 함께 결정하는 것이 효율적이다.
- 회원 본인 정보 영역(Info, ModifyInfo, ModifyPassword, ModifyEmailAddress, Leave)은 한 묶음으로 설계해야 한다. 이메일 변경 템플릿과 `needsPasswordChange` 플래그가 이미 있어 재사용 가능하다.
- 재발송(`ResendAuthMail`)은 인증 토큰 만료 경로와 함께 설계한다.

---

## 부록: 판정 근거 (grep 명령과 실제 출력 요약)

모든 명령은 읽기 전용이다. 출력은 핵심만 요약했다.

1. `grep -E "^\| member \|" legacy-front-map/summary.md`
   - 출력: member 행 19개(방문 18 + `dispMemberSpammer` 포함). `dispMemberLogout` 은 summary 에 없고 `module.xml` 으로 확인.
2. `python3` 으로 `pages/<act>-{guest,admin}.json` 의 `title`, `permission`, `route`, `excerpt`, `forms` 를 추출.
   - 출력: 위 표의 제목·권한·route·본문 근거. 비회원 파일이 빈 제목인 행은 권한 `member` 행이다.
3. `grep -E '<action name="disp(Member|TempSaved)' modules/member/conf/module.xml`
   - 출력: `dispMemberIndex`(권한 없음), `dispMemberSpammer`(권한 `root`), `dispMemberLogout`(권한 없음), 나머지 `member`. `dispMemberInfo` 등은 `route=` 속성을 가진다.
4. `grep -E 'TempSaved' modules/document/conf/module.xml`
   - 출력: `<action name="dispTempSavedList" type="view" permission="member" …/>`, `procDocumentDeleteTempSaved`.
5. `sed -n 237,262p modules/document/document.view.php`
   - 출력: `setLayoutFile('popup_layout')`, 비로그인 시 `MustLogin`, `member_srl` 두 값으로 임시 저장 목록 조회, `list_count = 10`.
6. `sed -n 940,975p modules/member/member.view.php`
   - 출력: `dispMemberLogout` 의 `isSameOrigin` 검사, 비로그인 시 `redirect_url` 이동, 로그인 시 `procMemberLogout`.
7. `sed -n 1079,1100p modules/member/member.view.php`
   - 출력: `dispMemberSpammer` 는 `is_logged` 검사 후 `checkMidAndRedirect`, 모듈 권한 `grant->root` 검사.
8. `find "apps/web/app/(member)" "apps/web/app/(auth)" -type f`
   - 출력: (member) = documents/[id]/history, drafts, messages, notifications, settings/messages, settings/notifications. (auth) = login, password-reset(+confirm), signup(+TermsConsent, TurnstileWidget), verify-email. 본인 정보·탈퇴·스크랩·작성 글·세션 페이지 없음.
9. `ls apps/web/app` 및 `find app/auth -type f`
   - 출력: 최상위 `(auth)`, `(member)`, `[mid]`, `admin`, `api`, `auth`(signout/route.ts), `install`, `search`, `tag`, `tags` 등. `auth/signout/route.ts` 존재.
10. `grep -rln -E "내 정보|회원정보|프로필|회원 탈퇴|탈퇴|자동 로그인|스크랩|저장함|로그인 세션|세션 목록|인증 로그|닉네임 변경 기록|스패머|spammer" apps/web/app apps/web/components apps/web/server --include=*.tsx --include=*.ts` (test·admin 제외)
    - 출력: `app/install/actions.ts` 한 건뿐(무관). 회원 본인 화면 키워드 0건.
11. `grep -rn -E "softDeleteUser|revokeAllSessions|createAutoLogin|requestPasswordReset|resend|재발송|findAccount|ID 찾기|아이디 찾기" apps/web --include=*.tsx --include=*.ts`
    - 출력: `requestPasswordReset`(password-reset/page.tsx:6,14,24), `softDeleteUser`(admin/user.ts:21,277)만. `revokeAllSessions`·`createAutoLogin`·재발송·아이디 찾기 호출 0건.
12. `grep -rn -E "'email-change'|\"email-change\"" apps/web packages` (templates 제외)
    - 출력: `packages/auth/src/mail.ts:20` 타입 정의 한 건. 발송 호출 0건.
13. `grep -n -E "유지|keep|ID 찾기|아이디|비밀번호 찾기|/password-reset|/signup" "apps/web/app/(auth)/login/page.tsx"`
    - 출력: `:78` 아이디 또는 이메일, `:115` 로그인 상태 유지, `:145` 회원가입 링크, `:150` 비밀번호 찾기 링크.
14. `grep -n -E "redirect\(" (member)/notifications/page.tsx (member)/settings/notifications/page.tsx (member)/messages/page.tsx (member)/settings/messages/page.tsx`
    - 출력: 비로그인 시 전부 `redirect('/login?callbackUrl=…')`.
15. `sed -n 1,12p "apps/web/app/(member)/drafts/page.tsx"`, `grep -n -E "h1|임시|redirect"`
    - 출력: 상단 주석(내 임시글 목록, 발행 버튼), `:33` 비로그인 redirect, `:45` h1 "내 임시글", `:48` 빈 목록 문구.
16. `grep -n -E "^\s+[a-zA-Z]+:\s+protected" apps/web/server/api/routers/admin/moderation.ts`
    - 출력: 확인용. 회원 차단 프로시저는 `spamfilter.ts:29,48` 의 `reports`, `resolveReport` 만 확인.
17. `grep -rn "needsPasswordChange" apps/web packages`
    - 출력: `packages/auth/src/login.ts:95,330,345` 만. `apps/web` 소비 0건.
18. `sed -n 30,50p components/layout/UserAuthSection.tsx` 와 `ls app/auth`
    - 출력: `:12` `<form action="/auth/signout" method="post">`, `:46` "로그아웃". `app/auth/signout/route.ts` 존재, 주석 `:4` POST 세션 종료 후 홈 리다이렉트.
19. `grep -rn -E "resend|재발송|verification" packages/auth/src/verify-email.ts`
    - 출력: `:21` 주석에 "재발송" 안내 언급. 재발송 함수 없음.
20. `python3` 으로 `pages/dispMember*-admin.json` 의 `forms` 필드 추출.
    - 출력: ModifyPassword 폼 `current_password`, `password1`, `password2`. Leave 폼 `password`, `ruleset`. ModifyInfo 폼 `ruleset`. 나머지 행은 공통 로그인 폼 필드뿐이라 판정에 쓰지 않았다.

## 미검증 (Gaps)

- 레거시 화면을 브라우저로 열어 확인하지 않았다. 본문·폼은 `pages/*.json` 캡처 기준이다.
- `dispMemberSignUpForm` 입력 항목 세부(레거시 아이디·비밀번호·이메일·닉네임 필드 vs rhymix-ts 가입 폼 필드)는 대조하지 않았다.
- `dispMemberOwnComment` 비회원 파일에 본문이 노출된 이유(레거시 권한 검사 결과)는 확인하지 않았다.
- `[mid]` 게시판 목록의 작성자 필터(OwnDocument 대응 여부) 미확인.
- drafts 목록 페이징 개수(레거시 10건)와 rhymix-ts 쪽 페이징 값 미확인.
- `dispMemberLogout` 의 `redirect_url` 인자가 필요한 외부 연동이 있는지 미확인.
- `UserAuthSection.tsx` 로그인 후 메뉴 전체 항목 미확인(로그아웃 외 항목 목록).

## 잔여 위험 (Residual-risk)

- 판정 3종은 거친 분류다. "대응 있음" 4행(SignUp, Login, Logout, TempSavedList)은 세부 누락이 남아 있을 수 있다.
- 격차 16행 중 스크랩·저장함·Spammer 는 제외 후보다. 이 초안은 제외를 권고하지 않는다. 기능 존재 여부는 사용자 결정 사항이다.
- `dispMemberLogout` 판정은 정적 읽기 기준이다. 실제 로그아웃 동작은 브라우저에서 확인하기 전까지 검증되지 않았다.
