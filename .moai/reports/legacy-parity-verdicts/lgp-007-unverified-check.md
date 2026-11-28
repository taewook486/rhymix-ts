# LGP-007 미검증·교차 발견 항목 소스 확정

- 작성: moai3 (보조 세션), 읽기 전용 확인
- 입력: `.moai/reports/legacy-parity-verdicts/lgp-007-mail-notify.md` 의 "교차 발견"·"미검증" 절
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 레거시 DB 변경, 전체 테스트·빌드

## 요약

| # | 항목 | 결론 |
|---|---|---|
| 1 | SMTP 설정 화면 두 곳 — 정본은 무엇인가 | **실제 발송 정본은 환경변수(`SMTP_*`)다.** 두 화면 중 `site/mail` 은 환경변수를 읽기만 하고, `settings/notification` 의 SMTP 저장값(SiteSetting `notification`)은 **테스트 발송 버튼 전용**이다. 실제 발송 경로는 이 DB 값을 읽지 않는다. 두 화면은 같은 값을 쓰지 않는다. |
| 2 | 이메일 큐 설정(`getEmailQueue`/`updateEmailQueue`) | **관리 화면은 없다.** 저장 프로시저와 SiteSetting 키(`emailQueue`)는 있지만 UI 호출처가 0건이다. `queueMode=queued` 를 읽는 **큐 소비자도 없다.** 실제 발송 경로는 큐 설정을 확인하지 않는다. |
| 3 | 알림 이벤트 종류 | rhymix-ts 생성 카테고리는 **4종**(COMMENT, COMMENT_REPLY, MENTION, MESSAGE). 레거시 설정 화면 이벤트는 **8종**(comment, comment_comment, mention, vote, scrap, message, admin_content, custom). 공통은 4종이고, 레거시에만 있는 것은 **vote, scrap, admin_content, custom 4종**이다. |

---

## 1. SMTP 설정 화면 두 곳

### 1-A. 화면별 읽기·쓰기 경로

| 구분 | 화면 `site/mail` (`/admin/site/mail`) | 화면 `settings/notification` (`/admin/settings/notification`) |
|---|---|---|
| 읽는 값 | `process.env.SMTP_HOST / SMTP_PORT / SMTP_FROM / SMTP_SECURE / SMTP_USER / SMTP_PASS` | `caller.admin.settings.getNotification()` → SiteSetting `notification` |
| 쓰는 값 | **없음 (읽기 전용 표시)** | `updateNotificationSettingsAction` → `caller.admin.settings.updateNotification` → SiteSetting `notification` |
| Server Action | `testMailConnectionAction`(연결 테스트), `sendTestMailAction`(테스트 발송) | `updateNotificationSettingsAction`(저장), `sendTestEmailAction`(테스트 발송), `updateGlobalEventsAction`(이벤트 설정) |
| 테스트 발송 경로 | `mailDispatcher`(환경변수로 만든 디스패처) | `nodemailer transporter.sendMail` 직접 호출 (DB 값 사용) |

근거:

```
$ sed -n 16,22p apps/web/app/admin/site/mail/page.tsx
  const isSmtp = mailDispatcher instanceof SmtpMailDispatcher;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ?? '587';
  const smtpFrom = process.env.SMTP_FROM;
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUserSet = !!process.env.SMTP_USER;
  const smtpPassSet = !!process.env.SMTP_PASS;

$ grep -n -E "import|mailDispatcher" apps/web/lib/mail/dispatcher.ts
import { createMailDispatcher } from '@rhymix-ts/auth';
export const mailDispatcher = createMailDispatcher(process.env);

$ grep -n -E "process\.env|SMTP_HOST|SMTP_FROM" packages/auth/src/mail/factory.ts | head -5
  4: * 환경변수를 검증하고 SMTP 설정에 따라 적절한 디스패처(NoopMailDispatcher 또는
  34:  const host = env.SMTP_HOST;
  45:  const from = env.SMTP_FROM;

$ grep -n -E "getNotificationSettings|updateNotificationSettings" -n apps/web/server/api/routers/admin/settings.ts | head -3
  14:  getNotificationSettings,
  769:    getNotificationSettings({ prisma: ctx.prisma }),

$ grep -n -E "getOrCreateSiteSetting|updateSiteSetting" packages/admin/src/settings.ts | sed -n 1,6p
  173:  const setting = await getOrCreateSiteSetting(ctx.prisma, 'notification');
  204:  const existingSetting = await getOrCreateSiteSetting(ctx.prisma, 'notification');
  213:  await updateSiteSetting(ctx.prisma, 'notification', toPersist as unknown as Record<string, unknown>);

$ sed -n 72,82p apps/web/app/admin/settings/notification/actions.ts
  export async function sendTestEmailAction(...) {
    const caller = await getServerCaller();
    const settings = await caller.admin.settings.getNotification();
    if (!settings.smtpHost || !settings.smtpPort) { return { error: 'SMTP 설정이 완료되지 않았습니다. ...' }; }

$ grep -n "transporter.sendMail" apps/web/app/admin/settings/notification/actions.ts packages/auth/src/mail/smtp-dispatcher.ts
  apps/web/app/admin/settings/notification/actions.ts:124:    await transporter.sendMail({
  packages/auth/src/mail/smtp-dispatcher.ts:96:          await this.transporter.sendMail({
```

### 1-B. 실제 발송 경로가 읽는 값

```
$ grep -rn -E "mailDispatcher\.send|\.send\(\{|dispatcher\.send|sendMail\(" apps/web packages --include=*.ts --include=*.tsx | grep -v -E "test|node_modules|\.next"
  apps/web/app/admin/settings/notification/actions.ts:124:    await transporter.sendMail({   (테스트 발송 전용)
  packages/auth/src/mail/smtp-dispatcher.ts:96:          await this.transporter.sendMail({   (실제 발송)
```

`SmtpMailDispatcher` 는 생성 시 환경변수 설정(`createMailDispatcher(process.env)`)을 받는다. DB `notification` 키를 읽는 코드는 발송 경로에 없다(grep `getSiteSetting`·`'notification'` 조회처 확인: `packages/admin/src/settings.ts:173,204,213` 과 `admin.settings` 라우터뿐).

### 1-C. 결론: 정본 판정 근거

- **정본(실제 발송)은 환경변수**다. `createMailDispatcher(process.env)` 가 시작 시점에 한 번 읽는다.
- `site/mail` 화면은 그 환경변수 값을 보여주는 읽기 전용 화면이다. 값을 바꿀 수 없다.
- `settings/notification` 의 SMTP 필드는 **DB 에 저장되지만 실제 발송에 쓰이지 않는다.** 테스트 발송 버튼만 DB 값을 쓴다. 즉 화면에서 저장한 SMTP 값과 실제 발송에 쓰이는 값이 다를 수 있다.
- 따라서 "SMTP 설정 화면 두 곳"은 정본이 둘이 아니다. 실제 정본은 환경변수 하나이고, `notification` 화면의 SMTP 저장은 **테스트용 사본**이다. 판정표에는 "두 화면이 같은 값을 쓰지 않음, 발송 정본은 환경변수"로 적는 것이 사실에 맞다.

주의: `packages/auth/src/mail/factory.ts` 의 주석에는 `SMTP_HOST 미설정 시 NoopMailDispatcher`(개발·E2E 폴백)가 있다. 환경변수가 없으면 메일은 실제로 나가지 않는다.

## 2. 이메일 큐 설정

```
$ sed -n 946,972p apps/web/server/api/routers/admin/settings.ts   (요지)
  getEmailQueue: protectedAdminProcedure.query(... getEmailQueueSettings ...)
  updateEmailQueue: protectedAdminProcedure.input(z.object({ queueMode: z.enum(['immediate','queued']), batchSize: z.number().int().min(1).max(1000) }))
    ... setSiteSetting(txCtx, 'emailQueue', input, actorId)

$ grep -rln -E "getEmailQueue|updateEmailQueue|emailQueue" apps/web/app apps/web/components
  (출력 없음 — 화면 호출처 0건)

$ grep -rn -E "queueMode|emailQueue|'queued'" packages/auth/src apps/web/lib apps/web/server --include=*.ts | grep -v test
  apps/web/server/api/routers/admin/settings.ts:962  (입력 스키마)
  apps/web/server/api/routers/admin/settings.ts:971  (저장)
  (발송 경로에서 queueMode 를 읽는 곳 없음)

$ grep -rn -E "mailDispatcher\.send|\.send\(\{" apps packages --include=*.ts --include=*.tsx | grep -v test
  (위 1-B 와 같음 — 발송 호출은 smtp-dispatcher.ts:96 한 곳뿐이고 큐 분기 없음)

$ grep -rn -E "batchSize|queue" packages/auth/src/mail/smtp-dispatcher.ts | head
  (큐 소비 로직 없음 — 재시도 루프만 있음)
```

결론:
- 관리 화면: **없음** (`getEmailQueue`/`updateEmailQueue` 호출처 0건).
- 저장: `settings.ts:971` 에서 SiteSetting `emailQueue` 키에 저장한다.
- 큐 소비자: **없음.** `queueMode=queued` 를 읽는 곳이 없고, 발송은 항상 즉시 실행된다(`smtp-dispatcher.ts:96`). `batchSize` 도 발송에 쓰이지 않는다.
- 참고: `packages/admin/src/admin-utils.ts:109,134,149` 의 `batchSize` 는 세션 정리(`purgeExpiredSessions`)용이며 이메일 큐와 무관하다.

따라서 "큐 설정을 바꿔도 동작이 바뀌지 않는다"가 사실이다. 판정표에 "큐 모드 대응 있음"으로 적었다면 정정이 필요하다.

## 3. 알림 이벤트 종류 비교

### 3-A. rhymix-ts 가 만드는 알림 type

```
$ sed -n 4,9p packages/notification/src/schemas.ts
  export const NotificationCategorySchema = z.enum(['COMMENT', 'COMMENT_REPLY', 'MENTION', 'MESSAGE']);

$ grep -n -o -E "category: '[A-Z_]+'" packages/notification/src/hooks.ts | sort | uniq -c
  1 112:category: 'MESSAGE'
  1 165:category: 'MENTION'
  1 61:category: 'COMMENT'
  1 76:category: 'COMMENT_REPLY'
```

훅은 `onCommentCreated`(댓글·대댓글), `onMessageSent`(쪽지), `onMentionDetected`(멘션)에서 알림을 만든다(`hooks.ts:46,97,136`). 생성되는 카테고리는 **4종**이다.

### 3-B. 관리자 전역 이벤트 설정 폼의 항목

```
$ grep -n -E 'name="(comment|reply|mention|message)"' apps/web/app/admin/settings/notification/NotificationSettingsForm.tsx
  73: name="comment"
  84: name="reply"
  95: name="mention"
  106: name="message"
```

rhymix-ts 전역 이벤트 설정은 **4종**(댓글, 대댓글, 멘션, 쪽지)이다. 저장 키는 `notification.globalEvents`(`settings.ts:1470-1532`)다.

### 3-C. 레거시 ncenterlite 설정 화면 이벤트 종류 (관리자 기본 설정 폼 `use[...]`)

```
$ python3 (dispNcenterliteAdminConfig-1rravqk.json 의 폼 필드 `use[이벤트][채널]` 추출)
  events:   ['admin_content', 'comment', 'comment_comment', 'custom', 'mention', 'message', 'scrap', 'vote']
  channels: ['mail', 'push', 'sms', 'web']
```

### 3-D. 대응 표 (사실)

| 이벤트 | 레거시 ncenterlite | rhymix-ts 생성 type | 전역 설정 폼 |
|---|---|---|---|
| 댓글 | `comment` | `COMMENT` | 있음 (`comment`) |
| 대댓글 | `comment_comment` | `COMMENT_REPLY` | 있음 (`reply`) |
| 멘션 | `mention` | `MENTION` | 있음 (`mention`) |
| 쪽지 | `message` | `MESSAGE` | 있음 (`message`) |
| 추천 | `vote` | 없음 | 없음 |
| 스크랩 | `scrap` | 없음 | 없음 |
| 관리자 콘텐츠 | `admin_content` | 없음 | 없음 |
| 커스텀 | `custom` | 없음 | 없음 |

채널: 레거시 4종(`web`, `mail`, `sms`, `push`). rhymix-ts 는 인앱(`web`)만 있다. 설정 화면에 "인앱 채널만 해당합니다" 문구가 있다(LGP-007 원문 근거). 메일·SMS·푸시 채널별 설정은 없다.

결론: 공통 4종은 대응한다. 레거시에만 있는 것은 **vote, scrap, admin_content, custom 4종**이다. rhymix-ts 는 생성하는 알림 type 자체가 4종뿐이다.

---

## 정리 (판정표 정정 대상)

1. SMTP 두 화면: "정본 2곳" 표현은 부정확하다. 발송 정본은 **환경변수**, `notification` 화면의 SMTP 값은 **테스트 발송 전용 사본**이다. 두 화면의 값이 다를 수 있다는 점을 명시해야 한다.
2. 이메일 큐: "큐 모드 설정 대응" 표현은 틀리다. 관리 화면도 큐 소비자도 없다. 설정은 저장만 되고 발송 동작에 영향이 없다.
3. 알림 이벤트: 공통 4종 대응, 레거시 추가 4종(vote, scrap, admin_content, custom) 없음. 채널도 인앱만이다.

## 미검증 (Gaps)

- 브라우저에서 저장 후 실제 발송 여부를 확인하지 않았다. 모든 결론은 소스 기준이다.
- 환경변수가 배포 환경에서 어떻게 설정되는지(`.env`, 컨테이너 설정 등)는 확인하지 않았다.
- `packages/auth/src/mail/smtp-dispatcher.ts` 의 재시도 루프 세부(`attempts`, `lastError`)는 큐 여부와 무관한 것으로만 확인했다. 전체 본문을 끝까지 읽지 않았다.
- 레거시 ncenterlite 의 vote·scrap 등 이벤트가 레거시에서 실제로 발생하는지(기능 존재 여부)는 확인하지 않았다. 설정 폼 항목 기준이다.

## 잔여 위험 (Residual-risk)

- 정적 소스 기준이다. 런타임에서 설정 키 이름이 바뀌거나 다른 경로로 읽힐 가능성은 배제하지 않았다.
- `getNotification` 이 반환하는 SMTP 값과 환경변수 값이 우연히 같을 수 있다. 이것은 "같은 값을 쓴다"는 뜻이 아니다. 저장 경로가 다르다는 사실로 판단했다.
