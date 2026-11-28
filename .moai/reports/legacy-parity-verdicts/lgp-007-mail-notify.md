# LGP-007 메일·알림 영역 판정표 초안 (advanced_mailer · ncenterlite)

- 작성: moai3 (보조 세션), 읽기 전용 분석
- 범위: `coverage.md` 의 모듈 `advanced_mailer`(9행) · `ncenterlite`(8행) 전부 = 17행. 방문자 쪽 ncenterlite 화면 4개는 별도 절에서 판정.
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 레거시 DB 변경, 전체 테스트·빌드. 레거시 화면(localhost:8080)은 열지 않았고, 근거는 `pages/*.json`(관리자 지도·방문자 지도), 레거시 소스(`modules/advanced_mailer`, `modules/ncenterlite`), rhymix-ts 소스 grep 이다.
- 판정 기준: **대응 있음** = 화면과 주 기능이 rhymix-ts 에 있다(세부 누락은 비고). **격차** = 주 기능이 없거나 대부분 누락. **의도적 제외 후보** = 구조상 또는 기능 자체가 rhymix-ts 에 없어 제외가 타당해 보인다. 최종 결정은 사용자 몫이다.

## 요약

| 판정 | 개수 | act |
|---|---:|---|
| 대응 있음 | 3 | advanced_mailer MailLog, advanced_mailer MailTest, ncenterlite AdminConfig |
| 격차 | 8 | advanced_mailer AdminConfig, Exceptions, SpfDkim; ncenterlite Advancedconfig, CustomList, List, OtherComment, Seletedmid |
| 의도적 제외 후보 | 6 | advanced_mailer SMSLog, SMSTest, PushLog, PushTest; ncenterlite Skinsetting, Test |

관리자 17행 합계 17. 방문자 쪽 4개는 별도 절(대응 있음 2, 의도적 제외 후보 2).

## 판정표 — 모듈 advanced_mailer · ncenterlite (관리자 화면 17행)

| 레거시 act | 화면 제목 | 근거 파일(pages/…json) | rhymix-ts 대응(라우트·Server Action·tRPC, 파일:줄) | 판정 | 비고(레거시 폼 필드 중 rhymix-ts 에 없는 것) |
|---|---|---|---|---|---|
| `dispAdvanced_mailerAdminConfig` | 메일, SMS 및 푸시 알림 관리 (발송 로그 설정) | `dispAdvanced_mailerAdminConfig-al7vi4.json` | 발송 로그 토글 없음. 메일 발송 시 `MailLog` 를 항상 기록(`packages/auth/src/mail/smtp-dispatcher.ts:83-103`, 실패 시 오류 저장) | 격차 | 레거시 `log_sent_mail`, `log_errors`(메일), `log_sent_sms`, `log_sms_errors`, `log_sent_push`, `log_push_errors` 6종. 메일 로그는 항상 쌓이고 끌 수 없다. SMS·푸시 항목은 아래 제외 후보와 연동된다. 레거시 `advanced_mailer.controller.php:76` 은 이 토글로 로그 기록을 가른다. |
| `dispAdvanced_mailerAdminExceptions` | 메일 발송 예외 설정 | `dispAdvanced_mailerAdminExceptions-16oxjpa.json` | 대응 없음 (grep `exception` 0건) | 격차 | 레거시 `exception_1~3_method` / `_domains`: 수신 도메인별로 발송 드라이버를 다르게 고르는 규칙 최대 3개(`advanced_mailer.controller.php:22-27`, `:149-162`). rhymix-ts 는 발송 경로가 한 가지다. |
| `dispAdvanced_mailerAdminMailLog` | 메일 발송 내역 | `dispAdvanced_mailerAdminMailLog-165s76b.json` | 목록 화면 `apps/web/app/admin/site/mail/logs/page.tsx:22`(상태 필터 전체/성공/실패), tRPC `apps/web/server/api/routers/admin/mail-log.ts:14`(`list`, `status` SENT/FAILED/ALL, 커서 페이징 `:21-23`), 모델 `MailLog`(`packages/db/prisma/schema.prisma:1679`) | 대응 있음 | 없는 것: 기간별 삭제(`procAdvanced_mailerAdminClearSentMail`, `status`, `clear_before_days`). `mail-log.ts` 에 삭제 프로시저가 없다. 수신자 검색·정렬 등 레거시 목록 옵션 대응은 미확인. |
| `dispAdvanced_mailerAdminMailTest` | 메일 테스트 발송 | `dispAdvanced_mailerAdminMailTest-sfe3qb.json` | `apps/web/app/admin/site/mail/MailTestButtons.tsx:11`, Server Action `apps/web/app/admin/site/mail/actions.ts:38`(`sendTestMailAction`), 연결 테스트 `actions.ts:14`(`testMailConnectionAction`) | 대응 있음 | 레거시 테스트 폼 필드 없음(빈 입력 2개). 대응 충분. |
| `dispAdvanced_mailerAdminPushLog` | 푸시 발송 내역 | `dispAdvanced_mailerAdminPushLog-os6tqo.json` | 대응 없음. rhymix-ts 전체에 SMS·푸시(FCM 등) 발송 경로 없음(grep `sms|fcm|push` 는 라우터 `router.push` 만 매칭) | 의도적 제외 후보 | 레거시 `procAdvanced_mailerAdminClearSentPush`(기간 삭제) 포함. 기능 자체 부재. 구현할지 제외할지 사용자 결정이 필요하다. |
| `dispAdvanced_mailerAdminPushTest` | 푸시 테스트 발송 | `dispAdvanced_mailerAdminPushTest-1lyvz2e.json` | 대응 없음 (위와 동일) | 의도적 제외 후보 | 레거시 `procAdvanced_mailerAdminTestSendPush` 4개 입력. 기능 부재. |
| `dispAdvanced_mailerAdminSMSLog` | SMS 발송 내역 | `dispAdvanced_mailerAdminSMSLog-hmr1ut.json` | 대응 없음 (위와 동일) | 의도적 제외 후보 | 레거시 `procAdvanced_mailerAdminClearSentSMS`. 기능 부재. |
| `dispAdvanced_mailerAdminSMSTest` | SMS 테스트 발송 | `dispAdvanced_mailerAdminSMSTest-1ddn4k1.json` | 대응 없음 (위와 동일) | 의도적 제외 후보 | 레거시 `procAdvanced_mailerAdminTestSendSMS` 3개 입력. 기능 부재. |
| `dispAdvanced_mailerAdminSpfDkim` | SPF·DKIM 점검 | `dispAdvanced_mailerAdminSpfDkim-1u8dw1m.json` | 대응 없음. 메일 설정 화면 `apps/web/app/admin/site/mail/page.tsx` 에 호스트 마스킹만 있다(`:24`, REQ-MAIL-050). SPF/DKIM/DMARC 점검 grep 0건 | 격차 | 레거시 `procAdvanced_MailerAdminCheckDNSRecord`(`advanced_mailer.admin.controller.php:118`, DNS 레코드 조회). 운영 점검 기능이라 우선순위는 낮을 수 있다. |
| `dispNcenterliteAdminAdvancedconfig` | 알림 센터 (고급 설정) | `dispNcenterliteAdminAdvancedconfig-1vr8bf2.json` | 멘션 후보 추출만 있음. `packages/notification/src/mention.ts:16`(`extractMentionCandidates`). 설정 화면 없음 | 격차 | 레거시 `mention_names`, `mention_suffixes`, `mention_suffix_always_cut`, `mention_limit`(멘션 규칙), `anonymous_voter`, `anonymous_scrap`(익명 처리), `highlight_effect`, `unsubscribe`, `fcm_push_format`. 설정으로 조절하는 항목이 rhymix-ts 에 없다. |
| `dispNcenterliteAdminConfig` | 알림 센터 (기본 설정, 채널 매트릭스) | `dispNcenterliteAdminConfig-1rravqk.json` | 전역 알림 이벤트 `apps/web/app/admin/settings/notification/NotificationSettingsForm.tsx:64`, 저장 Server Action `apps/web/app/admin/settings/notification/actions.ts:152`(`updateGlobalEventsAction`). 카테고리는 `packages/notification/src/schemas.ts:4`(`COMMENT`, `COMMENT_REPLY`, `MENTION`, `MESSAGE` 4종) | 대응 있음 | 레거시 `use[카테고리][web/mail/sms/push]` 매트릭스는 카테고리 8종 × 채널 4종. rhymix-ts 는 카테고리 4종이며 화면에 "인앱 채널만 해당" 주석이 있어 메일·SMS·푸시 채널별 설정은 없다. 없는 카테고리: `vote`(추천), `scrap`(스크랩), `admin_content`, `custom`. 레거시 `display_use`, `always_display`, `user_config_list`, `user_notify_setting` 옵션도 없다. |
| `dispNcenterliteAdminCustomList` | 커스텀 알림 목록 | `dispNcenterliteAdminCustomList-16llrx5.json` | 대응 없음 | 격차 | 레거시 `procNcenterliteAdminDeleteCustom`(`ncenterlite.admin.controller.php:261`). 커스텀 알림 개념이 rhymix-ts 에 없다. |
| `dispNcenterliteAdminList` | 알림 목록 (관리자) | `dispNcenterliteAdminList-1pxpgqw.json` | 대응 없음. `apps/web/app/admin/settings/notification/` 는 설정만. 관리자 알림 목록 화면 0건 | 격차 | 레거시 `procNcenterliteAdminDeleteNofity`(`ncenterlite.admin.controller.php:215`) 삭제 포함. 발송된 알림을 관리자가 보고 지울 방법이 없다. |
| `dispNcenterliteAdminOtherComment` | 모듈별 댓글 알림 설정 | `dispNcenterliteAdminOtherComment-1f118yh.json` | 대응 없음 | 격차 | 레거시 `comment_all`, `comment_all_notify_module_srls[]`: 지정 모듈의 모든 댓글을 알림 대상으로 삼는 설정. rhymix-ts 는 작성자·답글 대상 기준만 있다. |
| `dispNcenterliteAdminSeletedmid` | 모듈 숨김·관리자 알림 설정 | `dispNcenterliteAdminSeletedmid-1d7c8qy.json` | 대응 없음 | 격차 | 레거시 `hide_module_srls[]`(알림에서 숨길 모듈), `admin_notify_module_srls[]`(관리자 알림을 받을 모듈). 모듈 단위 제어가 없다. |
| `dispNcenterliteAdminSkinsetting` | 알림 센터 스킨 설정 | `dispNcenterliteAdminSkinsetting-1sp7lhl.json` | 대응 없음 | 의도적 제외 후보 | 레거시 `layout_srl`, `mlayout_srl`, `skin`, `colorset`, `mskin`, `mcolorset`, `zindex`, `notify_count`. 레이아웃·스킨·컬러셋 체계가 rhymix-ts 에 없다(LGP-002 `dispMemberAdminDesignConfig` 와 같은 결정). `zindex`, `notify_count` 는 UI 옵션이라 필요 여부를 따로 판단한다. |
| `dispNcenterliteAdminTest` | 알림 더미 데이터 생성 | `dispNcenterliteAdminTest-1pxuhoc.json` | 대응 없음 | 의도적 제외 후보 | 레거시 `procNcenterliteAdminInsertDummyData`, `procNcenterliteAdminInsertPushData`. 개발·검증용 도구라 운영 화면 제외가 타당해 보인다. |

## 방문자 쪽 ncenterlite 화면 (별도 절, `legacy-front-map/pages/<act>-admin.json` 기준)

판정 대상 4개는 권한 `member`, 관리 계정으로 크롤링했다. 파일명의 `-admin` 은 크롤 계정이 관리자였다는 뜻이다.

| 레거시 act | 화면 제목 | 근거 파일 | rhymix-ts 대응 (파일:줄) | 판정 | 비고 |
|---|---|---|---|---|---|
| `dispNcenterliteNotifyList` | 내 알림 목록 (route `notifications`) | `dispNcenterliteNotifyList-admin.json` | 목록 `apps/web/app/(member)/notifications/page.tsx:43`, 읽음 처리 `apps/web/app/(member)/notifications/actions.ts:20`(`markOneRead`), `:43`(`markAllRead`), 서비스 `packages/notification/src/service.ts:181`(`list`) | 대응 있음 | 레거시 `is_keyword` 검색 폼은 rhymix-ts 목록 입력 스키마(`packages/notification/src/schemas.ts:35`)에 검색 필드가 있는지 미확인. 레거시 목록에 보낸 사람·받는 사람·읽음 확인·날짜 열이 있다. |
| `dispNcenterliteUserConfig` | 회원 알림 설정 (route `notififcations/config`) | `dispNcenterliteUserConfig-admin.json` | 설정 페이지 `apps/web/app/(member)/settings/notifications/page.tsx:76`, 저장 서비스 `packages/notification/src/service.ts:274`(`upsertPreference`) | 대응 있음 | 카테고리 4종(댓글, 댓글 답글, 멘션, 쪽지) 수신 여부만 있다. 레거시는 채널(메일·SMS·푸시)별 설정이 있으나 rhymix-ts 설정 화면에는 "준비 중" 표시가 있는 항목이 있다(`page.tsx` 라벨 `준비 중)`). 레거시 "유저 세팅을 제공하지 않습니다" 문구는 관리자가 기능을 끈 상태의 안내다. |
| `dispNcenterliteUnsubscribeList` | 개별 수신 거부 목록 (route `notififcations/unsubscribe`) | `dispNcenterliteUnsubscribeList-admin.json` | 대응 없음. 카테고리별 수신 여부 설정(`upsertPreference`)으로 대체 가능하나 목록 화면은 없다 | 의도적 제외 후보 | 레거시 본문은 "개별 수신 거부 기능을 제공하지 않습니다. 관리자에게 문의하세요." 안내다. 즉 레거시도 기능이 꺼진 상태였다. 메일 본문에서 수신거부 링크를 제공할지 여부를 사용자가 결정해야 한다. |
| `dispNcenterliteInsertUnsubscribe` | 수신 거부 등록 (route `notififcations/unsubscribe/add`) | `dispNcenterliteInsertUnsubscribe-admin.json` | 대응 없음 (rhymix-ts 에 수신 거부 엔드포인트 없음, grep `unsubscribe|수신거부` 0건) | 의도적 제외 후보 | 레거시는 파라미터 없이 접근하면 "잘못된 요청입니다"(`modules/ncenterlite/ncenterlite.view.php:187`). 등록 경로 자체가 공개 기능이 아니다. 위와 같은 결정에 묶는다. |

## 교차 발견 (표 밖)

1. **SMTP 설정 화면이 둘이다**: `apps/web/app/admin/site/mail/page.tsx:31`("메일 설정", 42행 "SMTP 설정")과 `apps/web/app/admin/settings/notification/NotificationSettingsForm.tsx:173`("SMTP 설정"). 같은 설정을 두 곳에서 다룬다. 어느 쪽이 정본인지 확인이 필요하다. 저장 Server Action 도 `site/mail/actions.ts` 와 `settings/notification/actions.ts:33` 로 나뉜다. tRPC 쪽은 `settings.ts:762-800` 의 `getNotification`/`updateNotification` 에 smtp 필드가 있다.
2. **이메일 발송 큐 설정**: tRPC `settings.ts:946-960` 에 `getEmailQueue`/`updateEmailQueue`(`queueMode` immediate|queued, `batchSize` 1~1000)가 있다. 이 설정을 바꾸는 관리 화면 위치는 이번 조사에서 찾지 못했다.
3. **관리자 알림 목록 부재**: 레거시 `ncenterlite` 관리자 쪽 목록·삭제(`List`, `CustomList`)에 대응하는 rhymix-ts 화면이 없다.
4. **쪽지 설정 화면**(`apps/web/app/admin/settings/communication`, `CommunicationSettingsForm.tsx:39` 쪽지 기능 설정, 수신함 최대 개수)은 이번 레거시 act 목록에 대응이 없다. 레거시 쪽지 기능은 `member`·`communication` 계열 별도 모듈이라 이 표 범위 밖이다. 소유 영역 확인이 필요하다.
5. **rhymix-ts 에만 있는 화면**: `apps/web/app/admin/site/mail/logs` 와 `settings/notification` 외에는 없다. 알림 채널 "인앱" 외 채널은 설계상 없다.

## 집계 검산

판정 카운트는 아래와 같다. 관리자 17행 기준.

- 대응 있음: `dispAdvanced_mailerAdminMailLog`, `dispAdvanced_mailerAdminMailTest`, `dispNcenterliteAdminConfig` = **3**
- 격차: `dispAdvanced_mailerAdminConfig`, `dispAdvanced_mailerAdminExceptions`, `dispAdvanced_mailerAdminSpfDkim`, `dispNcenterliteAdminAdvancedconfig`, `dispNcenterliteAdminCustomList`, `dispNcenterliteAdminList`, `dispNcenterliteAdminOtherComment`, `dispNcenterliteAdminSeletedmid` = **8**
- 의도적 제외 후보: `dispAdvanced_mailerAdminPushLog`, `dispAdvanced_mailerAdminPushTest`, `dispAdvanced_mailerAdminSMSLog`, `dispAdvanced_mailerAdminSMSTest`, `dispNcenterliteAdminSkinsetting`, `dispNcenterliteAdminTest` = **6**

합계 17. 요약 표와 일치한다.

방문자 쪽 4개: 대응 있음 2(NotifyList, UserConfig), 의도적 제외 후보 2(UnsubscribeList, InsertUnsubscribe).

## 부록: 판정 근거 (grep 명령과 실제 출력 요약)

모든 명령은 읽기 전용이다. 출력은 핵심만 요약했다.

1. `grep -n -E "^\| (advanced_mailer|ncenterlite) \|" coverage.md`
   - 출력: advanced_mailer 9행(`:48-56`), ncenterlite 8행(`:125-132`).
2. `python3` 으로 `pages/dispAdvanced_mailerAdmin*.json`, `pages/dispNcenterliteAdmin*.json` 를 파싱하고 공통 즐겨찾기 폼을 제외해 폼 필드를 추출했다.
   - 출력: 위 표의 레거시 필드 목록 근거. `procAdvanced_mailerAdminInsertConfig` 의 6개 로그 토글, `procNcenterliteAdminInsertConfig` 의 `use[...]` 매트릭스(카테고리 8 × 채널 4).
3. `python3` 으로 `legacy-front-map/pages/dispNcenterlite*-admin.json` 의 `permission`, `route`, `excerpt`, `links` 를 추출했다.
   - 출력: NotifyList(route `notifications`), UserConfig·UnsubscribeList(route `notififcations/config`, `notififcations/unsubscribe`), InsertUnsubscribe(route `notififcations/unsubscribe/add`). 모두 permission `member`. UnsubscribeList 본문 "개별 수신 거부 기능을 제공하지 않습니다", UserConfig 본문 "유저 세팅을 제공하지 않습니다", InsertUnsubscribe 본문 "잘못된 요청입니다".
4. `find apps/web/app/admin/site/mail apps/web/app/admin/settings/notification apps/web/app/admin/settings/communication "apps/web/app/(member)/notifications" "apps/web/app/(member)/settings/notifications" -type f`
   - 출력: site/mail(page, logs/page, MailTestButtons, actions), settings/notification(page, NotificationSettingsForm, actions), settings/communication(page, CommunicationSettingsForm, actions), (member)/notifications(page, actions), (member)/settings/notifications(page).
5. `grep -n -E "export default|<h1|<h2" ...` 및 라벨 grep(페이지별)
   - 출력: 메일 설정 h1(`site/mail/page.tsx:31`), SMTP 설정 h2(`:42`), 메일 발송 내역 h1(`logs/page.tsx:54`), 알림 설정 h1(`notification/page.tsx:28`), 전역 알림 이벤트 h2(`NotificationSettingsForm.tsx:64`), 발신자 설정(`:137`), SMTP 설정(`:173`), 쪽지 기능 설정(`communication/CommunicationSettingsForm.tsx:39`), 알림 설정 h1(`(member)/settings/notifications/page.tsx:103`), 알림 h1(`(member)/notifications/page.tsx:65`).
6. `grep -rn -E "\b(sms|SMS|fcm|FCM|webpush|pushToken|push_token|PUSH)\b" apps/web/app apps/web/server packages/notification/src packages/core/src packages/db/prisma/schema.prisma`
   - 출력: 0건. 앞서 넓게 찾은 `sms|fcm|push` 는 `router.push`·`sitemap` 등 무관한 매치뿐이었다.
7. `grep -rn -i -E "spf|dkim|unsubscribe|수신거부|수신 거부|exception" apps/web/app apps/web/server packages/auth/src packages/notification/src packages/core/src`
   - 출력: 0건(테스트·Exception 클래스명 제외).
8. `grep -n -E "mailLog\.(delete|deleteMany)|MailLog" apps/web/server apps/web/app packages/auth/src`
   - 출력: `mail-log.ts` 에 `list` 만 있고 삭제 없음. `smtp-dispatcher.ts:83,103` 에서 `MailLogStatus.FAILED`/`SENT` 기록.
9. `grep -n -E "^\s+[a-zA-Z]+:" apps/web/server/api/routers/admin/mail-log.ts` 및 `sed -n 21,45p`
   - 출력: `list` 입력 `cursor`, `limit`, `status`(SENT|FAILED|ALL), `sortBy`(createdAt), `sortOrder`.
10. `sed -n "$(grep -n '^model MailLog' packages/db/prisma/schema.prisma …)"`
    - 출력: MailLog = id, siteId, recipient, subject, status, error, createdAt.
11. `sed -n 4,22p packages/notification/src/schemas.ts`
    - 출력: NotificationCategory = COMMENT, COMMENT_REPLY, MENTION, MESSAGE. NotificationSourceType = COMMENT, MENTION, MESSAGE.
12. `grep -n -E "^\s+async [a-zA-Z]+\(" packages/notification/src/service.ts`
    - 출력: create:81, list:181, markRead:215, markAllRead:242, countUnread:260, upsertPreference:274.
13. `grep -n -E "^\s+(async )?on[A-Za-z]+\(" packages/notification/src/hooks.ts`
    - 출력: onCommentCreated:46, onMessageSent:97, onMentionDetected:136.
14. `grep -n -E "getNotification|updateNotification|getEmailQueue|updateEmailQueue|getCommunication|updateCommunication" apps/web/server/api/routers/admin/settings.ts` 및 주변 `sed -n`
    - 출력: getNotification:768, updateNotification:775(senderName, senderEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, smtpFrom), getEmailQueue:952, updateEmailQueue(queueMode, batchSize), getCommunication:1294, updateCommunication:1301.
15. `grep -rln -i -E "smtp|nodemailer|sendMail" packages/core/src packages/auth/src`
    - 출력: `packages/core/src/install/diagnostics.ts`, `packages/auth/src/index.ts`, `packages/auth/src/mail.ts`, `mail/audit.ts`, `mail/factory.ts`, `mail/smtp-dispatcher.ts`, `mail/errors.ts`. 발송 모듈은 `packages/auth/src/mail/` 이며 packages/core 에는 설치 진단만 있다.
16. 레거시 소스 확인: `grep -n -E "function (proc|disp)" modules/advanced_mailer/advanced_mailer.admin.controller.php modules/advanced_mailer/advanced_mailer.admin.view.php` 와 `modules/ncenterlite/ncenterlite.admin.*.php`
    - 출력: advanced_mailer 는 프로시저 10개(`InsertConfig:14`, `InsertExceptions:50`, `CheckDNSRecord:118`, `ClearSentMail:154`, `ClearSentSMS:178`, `ClearSentPush:202`, 테스트 3종 `226/307/358`)와 디스패치 뷰 11개. ncenterlite 는 `InsertConfig:4`, `InsertDummyData:139`, `InsertPushData:180`, `DeleteNofity:215`, `DeleteCustom:261`.
17. 레거시 소스 확인: `grep -n -E "log_sent_mail|log_errors|exception" modules/advanced_mailer/advanced_mailer.class.php modules/advanced_mailer/advanced_mailer.controller.php`
    - 출력: 로그 토글 `controller.php:76`, 예외 목록 `:149-162`, 예외별 드라이버 `:22-27`.
18. `grep -c -i "sms" modules/advanced_mailer/advanced_mailer.class.php` → 0, `advanced_mailer.admin.controller.php` → 16. SMS 관리 코드는 관리자 컨트롤러에만 있고 클래스 쪽 발송 드라이버에는 없다.

## 미검증 (Gaps)

- 레거시 화면을 브라우저로 열어 확인하지 않았다. 폼 필드는 `pages/*.json` 캡처에서만 읽었다.
- `dispNcenterliteNotifyList` 의 레거시 `is_keyword` 검색과 rhymix-ts 목록 검색 대응 여부.
- `dispNcenterliteUserConfig` 의 "준비 중" 항목이 정확히 어느 채널인지(`(member)/settings/notifications/page.tsx` 라벨 본문 미확인).
- 이메일 발송 큐(`updateEmailQueue`)를 바꾸는 관리 UI 위치.
- `packages/notification/src/schemas.ts:35`(`NotificationListInputSchema`)의 검색 필드 유무.
- `packages/core/src/install/diagnostics.ts` 가 SPF/DKIM 과 무관한지(smtp 매치만 확인).
- 레거시 `dispAdvanced_mailerAdminMailLog` 의 수신자 검색·정렬 옵션 대응.

## 잔여 위험 (Residual-risk)

- 판정 3종은 거친 분류다. "대응 있음" 3행과 방문자 2행 모두 부분 누락이 있으며 세부는 비고에 적었다.
- 의도적 제외 후보 6행(SMS 2·푸시 2, 스킨·더미 데이터)과 방문자 수신거부 2행은 설계 결정이 필요하다. 이 초안은 제외를 권고하지 않는다. 특히 SMS·푸시는 "구현할지, 범위에서 뺄지" 결정이 먼저다.

## 미검증·교차 발견 확정 (moai3, 2026-11-28, moai 재확인) — 상세: `lgp-007-unverified-check.md`

- SMTP 정본: 실제 발송은 환경변수 `SMTP_*`(`apps/web/lib/mail/dispatcher.ts:11-12`). `site/mail` 화면은 환경변수 표시 전용, `settings/notification` 의 SMTP 저장값은 테스트 발송 버튼에만 쓰인다 → 관리자가 화면에서 바꾼 SMTP 값이 실제 발송에 반영되지 않는 격차(007 요구사항 후보).
- 이메일 큐 설정: 저장 프로시저·SiteSetting 키는 있으나 화면 0, `queued` 모드를 소비하는 큐도 0 → 죽은 설정.
- 알림 종류: rhymix-ts 4종(COMMENT, COMMENT_REPLY, MENTION, MESSAGE) vs 레거시 8종 — vote·scrap·admin_content·custom 이 격차.
