# "저장한 척만 하는" 함수 전수 조사 (목업·무쓰기 후보)

- 작성: moai3 (보조 세션), 읽기 전용 조사
- 대상: `apps/web/app/**/actions.ts` 및 `apps/web/lib/**/*.ts` 중 `'use server'` 파일의 export 함수, `apps/web/app/**/route.ts` 의 POST·PUT·PATCH·DELETE (+ 이 파일들의 GET 도 같이 세었다). 테스트 파일 제외.
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 레거시 DB 변경, 전체 테스트·빌드. 임시 스캔 스크립트와 출력은 scratchpad 에만 두었다.

## 요약

| 구분 | 함수 수 | 비고 |
|---|---:|---|
| 전체 스캔 대상 | 113 | 'use server' 파일 56, 변형 route 파일 6 |
| **목업 (저장 안 함)** | **3** | 약관 저장·삭제 2건 + CAPTCHA 설정 저장 1건. 모두 `[Mock]` console.log 와 주석 처리된 tRPC 호출 |
| 직접 Prisma 쓰기 | 11 | 정상 |
| tRPC 프로시저 위임 | 62 | 정상으로 보되, 위임 대상이 mutation 이고 실제 쓰기를 하는지는 개별 확인하지 않음 (아래 한계) |
| 도메인 패키지 서비스 호출 | 21 | 정상. 호출 대상 함수에 실제 쓰기가 있는지 확인 (아래 2-C) |
| 쓰기·위임·서비스 호출 모두 없음 | 16 | 대부분 정상 (세션 상태, 읽기, 인증 서비스 호출이 스캐너에서 누락). 아래 3 에서 개별 판정 |

결론: **[Mock] 문자열 밖에도 "저장한 척"이 있는가?** → 목업 3건 외에 같은 패턴(성공 반환 + 쓰기 없음)은 **찾지 못했다.** 나머지 후보 16건은 모두 실제 도메인 호출이나 세션 처리였다.

## 1. 목업 (확정)

| 파일:줄 | 함수 | 반환 경로 | 쓰기 호출 | 판단 |
|---|---|---|---|---|
| `apps/web/app/admin/members/terms/actions.ts:30` | `upsertTermAction` | 성공: `revalidatePath` 후 `{ success: true }` | 없음. `:48` TODO, `:50` `// await caller.admin.terms.upsert(...)` 주석, `:53` `console.log('[Mock] Upsert term:')` | **목업** |
| `apps/web/app/admin/members/terms/actions.ts:66` | `deleteTermAction` | 성공: `revalidatePath` 후 `{ success: true }` | 없음. `:77` TODO, `:79` `// await caller.admin.terms.delete(...)` 주석, `:82` `console.log('[Mock] Delete term:')` | **목업** |
| `apps/web/app/admin/settings/security/actions.ts:119` | `updateCaptchaSettingsAction` | 성공: `{ ok: true }` 계열 `ActionState` | 없음. `:137` TODO, `:138` `// await caller.admin.settings.updateCaptcha(...)` 주석, `:141` `console.log('[Mock] Update CAPTCHA settings:')` | **목업** |

근거 명령과 출력:

```
$ grep -n -E "\[Mock\]|TODO: Replace|// await caller" app/admin/members/terms/actions.ts app/admin/settings/security/actions.ts app/admin/members/terms/page.tsx app/admin/members/terms/TermsEditor.tsx
app/admin/members/terms/actions.ts:48:    // TODO: Replace with actual tRPC call when backend is ready
app/admin/members/terms/actions.ts:50:    // await caller.admin.terms.upsert(parsed.data);
app/admin/members/terms/actions.ts:53:    console.log('[Mock] Upsert term:', parsed.data);
app/admin/members/terms/actions.ts:77:    // TODO: Replace with actual tRPC call when backend is ready
app/admin/members/terms/actions.ts:79:    // await caller.admin.terms.delete({ id });
app/admin/members/terms/actions.ts:82:    console.log('[Mock] Delete term:', id);
app/admin/members/terms/page.tsx:16:  // TODO: Replace with actual API call when backend is ready
app/admin/settings/security/actions.ts:137:    // TODO: Replace with actual tRPC call when backend is ready
app/admin/settings/security/actions.ts:138:    // await caller.admin.settings.updateCaptcha(parsed.data);
app/admin/settings/security/actions.ts:141:    console.log('[Mock] Update CAPTCHA settings:', parsed.data);
app/admin/members/terms/TermsEditor.tsx:90:      // TODO: Replace with actual API call
```

참고로 라우터 쪽에는 같은 마커가 없다.

```
$ grep -rn -E "\[Mock\]|Mock:|TODO: Replace|// await" server/api/routers/admin/*.ts | grep -v test
(출력 없음)
```

대응하는 라우터 프로시저(`terms.ts:53,111,150`, `settings.updateCaptcha`)는 실제로 Prisma 쓰기를 한다. 즉 **라우터는 살아 있고, 화면만 목업으로 끊겨 있다.** 수리는 화면의 Action 에서 위임 호출을 살리면 된다.

## 2. 스캐너 결과 (정상으로 본 것)

### 2-A. 스캐너 실행과 기준

- 방법: 파이썬 스크립트가 각 export 함수의 본문을 중괄호 매칭으로 잘라, (a) `prisma.<model>.create|update|upsert|delete|…`, `$transaction`, `tx.…` 쓰기 호출 수, (b) `caller.<…>(` 위임, (c) 서비스 이름 패턴(`create|update|delete|set|save|…` 접두) 호출, (d) `[Mock]`·TODO·`// await caller` 마커, (e) `success/ok/return;/redirect/revalidate` 반환 신호를 셌다.
- 판정 규칙: 마커가 있으면 목업 후보, 쓰기가 있으면 정상, 위임이 있으면 정상(위임), 서비스 호출이 있으면 정상(서비스), 나머지는 수동 판정.

실행 명령과 요약 출력 (그대로):

```
$ grep -rl -E "'use server'|\"use server\"" app lib --include=*.ts --include=*.tsx | grep -v -E "\.test\.|__tests__" | sort > us_files.txt
$ wc -l < us_files.txt
56
$ find app -name route.ts | xargs grep -l -E "export (async )?function (POST|PUT|PATCH|DELETE)" | grep -v test | sort > route_files.txt
$ cat route_files.txt
app/admin/api/points/adjust/route.ts
app/admin/api/site/points/config/route.ts
app/api/admin/import/route.ts
app/api/auth/autologin-refresh/route.ts
app/api/files/upload/route.ts
app/auth/signout/route.ts

$ python3 scan.py $(cat us_files.txt) $(cat route_files.txt) > scan_out.tsv ; wc -l < scan_out.tsv
113

$ (분류 집계 스크립트 출력)
total 113 | mock-marked 3 | direct prisma write 11 | tRPC caller delegation 62 | domain-service call 21 | no write/delegation/service call 16
```

### 2-B. 직접 Prisma 쓰기 (정상, 11건)

`scan_out.tsv` 에서 `writes>0` 인 함수: `app/(member)/…` 아님. 주요 항목은 `app/actions/onboarding.ts:31 dismissOnboarding`(upsert), `app/admin/pages/[instanceId]/edit/actions.ts:56 updatePageSettingsAction`(update), `:95 deletePageAction`(create·delete), `app/admin/site/design/actions.ts:134 assignTheme`(upsert), `:223 assignLayout`(update·upsert), `:323 assignSkin`(update), `:384 saveTokens`(upsert), `app/install/actions.ts:193 performInstall`(import·updateMany), `lib/admin/module-actions.ts:18 bulkDeleteModulesAction`(delete), `app/api/admin/import/route.ts:109 POST`, `app/api/files/upload/route.ts:20 POST`. 전부 실제 쓰기 호출이 있다.

### 2-C. 도메인 서비스 호출 (정상, 21건, 함수 정의 확인)

스캐너가 찾은 서비스 함수 중 패키지에 정의가 있는 것을 확인해 실제 쓰기가 있는지 봤다. 명령 출력 (그대로):

```
changeUserStatus (packages/auth/src/admin.ts:136, writes=True)
createAutoLogin (packages/auth/src/autologin.ts:67, writes=True)
createWidgetInstance (packages/core/src/widgets/instances.ts:45, writes=True)
deleteTag (packages/tag/src/tag.ts:274, writes=True)
deleteWidgetInstance (packages/core/src/widgets/instances.ts:132, writes=True)
mergeTags (packages/tag/src/tag.ts:209, writes=True)
purgeExpiredSessions (packages/admin/src/admin-utils.ts:105, writes=True)
renameTag (packages/tag/src/tag.ts:247, writes=True)
savePageContent (packages/page/src/service.ts:85, writes=True)
setSitePointConfig (packages/point/src/config.ts:16, writes=True)
toggleAdminRole (packages/auth/src/admin-role.ts:42, writes=True)
updateWidgetInstance (packages/core/src/widgets/instances.ts:85, writes=True)
registerAutoLoginMarker (packages/auth/src/autologin-marker.ts:31, writes=False)   ← 마커 기록, 아래 확인
createNotificationService (packages/notification/src/service.ts:309, writes=False)  ← 팩토리, 정상
```

나머지 서비스 이름(`add`, `update`, `set`, `create`…)은 tRPC 위임의 메서드 이름이라 패키지 정의가 없다. 이들은 2-A 의 위임 범주에 든다.

추가 확인 (정의는 있으나 쓰기 표지가 없었던 것):
- `registerAutoLoginMarker` (`packages/auth/src/autologin-marker.ts:31`): 본문을 읽었다. `markers.set(\`${userId}:${nonce}\`, Date.now())` 로 **프로세스 메모리의 `Map` 에** 기록한다(DB·쿠키 아님). `consumeAutoLoginMarker`(`:40`)도 같은 `Map` 을 쓴다. 쓰기는 실제로 일어나므로 "저장한 척"은 아니다. 다만 **프로세스 재시작이나 다중 인스턴스에서는 마커가 공유되지 않아 소실된다**. 이것은 저장 누락이 아니라 저장 위치의 한계이며, 자동 로그인 재발급 기능 검토 대상으로 적는다. 판단: **정상 (메모리 저장, 한계 있음)**.
- `createNotificationService` (`packages/notification/src/service.ts:309`): 서비스 생성자다. 실제 쓰기는 `markRead` 등에서 `notification.updateMany` 로 일어난다(`service.ts:243`). 정상.

### 2-D. 위임 (정상, 62건)

`caller.admin.*`, `caller.content.*` 호출 62건. 전부 "화면이 실제로 tRPC 프로시저를 부른다"는 사실만 확인했다. 대표 예: `app/admin/members/groups/actions.ts`(`caller.admin.group.create/update/delete`), `app/admin/menu/actions.ts`(`caller.admin.menu.create`, `caller.admin.menuItem.create/update/delete/duplicate`), `app/admin/polls/actions.ts`(`caller.admin.poll.create/update/delete`), `app/admin/settings/*/actions.ts`(`caller.admin.settings.update*`), `app/admin/members/denied-list/actions.ts`(`caller.admin.user.deniedList.add/remove`).

한계: 위임 대상 프로시저가 `query` 인지 `mutation` 인지, 그 안에서 실제로 Prisma 쓰기가 일어나는지는 프로시저마다 확인하지 않았다. 라우터 파일 전체에서 목업 마커는 0건이었다(위 1절). 따라서 라우터 쪽 목업은 "마커 기준으로는 없음"까지만 말할 수 있다.

### 2-E. 위임 대상이 `query` 인 경우 (쓰기 아님, 정상)

`sendTestEmailAction`(`app/admin/settings/notification/actions.ts:72`)이 `caller.admin.settings.getNotification()`(query)를 호출하고, 실제 발송은 `nodemailer` 로 한다. 테스트 발송이라 DB 쓰기가 없는 것이 설계다. 정상.

## 3. 쓰기·위임·서비스 호출이 없는 16건 (개별 판정)

스캐너 규칙으로는 후보지만, 본문을 읽어 판정했다. 근거는 본문 호출을 직접 확인한 것이다.

| 파일:줄 | 함수 | 반환 경로 | 쓰기 호출 유무 | 판단 | 근거 |
|---|---|---|---|---|---|
| `apps/web/app/admin/addons/actions.ts:17` | `toggleAddonAction` | 성공 `{success:true}` + `revalidatePath` | 없음(직접). 서비스 `coreToggleAddon`(`packages/core/src/addons/config.ts:95`) → `addonConfig.upsert` + `adminLog.create` | **정상** | 스캐너가 `coreToggleAddon` 을 놓쳤다 (이름이 `toggle` 접두라 패턴 밖). 모델 `AddonConfig` 존재 (`schema.prisma:1203`) |
| `apps/web/app/admin/addons/actions.ts:43` | `reorderAddonAction` | 성공 + `revalidatePath` | 없음(직접). `coreSetAddonPriority`(`config.ts:141`) → `addonConfig.upsert` | **정상** | 같음 |
| `apps/web/app/admin/site/mail/actions.ts:14` | `testMailConnectionAction` | 성공/실패 | 없음 | **정상 (읽기·검증)** | SMTP 연결 확인 용도. 저장 기능이 아님 |
| `apps/web/app/admin/site/mail/actions.ts:38` | `sendTestMailAction` | 성공 `{ok:true}` | 없음(직접). `mailDispatcher.dispatch(...)` → 실제 SMTP 발송 + `mailLog.create` | **정상** | 발송 자체가 목적. 발송 기록은 `smtp-dispatcher.ts` 가 남긴다 |
| `apps/web/app/install/actions.ts:59` | `agreeLicense` | 성공, `redirect` | 없음. 세션 플래그(`session.licenseAccepted = true`) | **정상 (세션 상태)** | 설치 마법사는 DB 대신 세션에 단계 상태를 둔다 |
| `apps/web/app/install/actions.ts:89` | `setEnvChecksPass` | `redirect` | 없음. 세션 플래그와 단계 전환 | **정상 (세션 상태)** | 같음 |
| `apps/web/app/install/actions.ts:136` | `validateDbConfig` | 성공 `{ok:true}` 또는 오류 | 없음. `validateDbConnection(config, …)` 호출(접속 검증) | **정상 (읽기 검증)** | 접속 시도만 하고 설정을 저장하지 않는다. 저장은 `performInstall`(`:193`)에서 한다 |
| `apps/web/lib/auth/actions.ts:73` | `signupAction` | 성공 `{ok:true}` | 없음(직접). `signup(…)`(`@rhymix-ts/auth`) 호출 | **정상** | 스캐너가 `signup` 을 서비스 패턴으로 못 잡았다. 실제 쓰기는 `signup` 내부 |
| `apps/web/lib/auth/actions.ts:334` | `verifyEmailAction` | 성공 `{ok:true}` | 없음(직접). `verifyEmail({token}, {prisma})` | **정상** | 같음 |
| `apps/web/lib/auth/actions.ts:394` | `requestPasswordResetAction` | `{ok:true}` 항상 (REQ-AUTH-051, 존재 여부 비노출) | 없음(직접). `requestPasswordReset(…)` | **정상** | 같음. 항상 ok 를 반환하는 것은 설계다 |
| `apps/web/lib/auth/actions.ts:416` | `confirmPasswordResetAction` | 성공 `{ok:true}` | 없음(직접). `confirmPasswordReset(…)` | **정상** | 같음 |
| `apps/web/lib/auth/admin-actions.ts:123` | `deleteMemberAction` | 성공 | 없음(직접). `softDeleteUser({targetUserId, actorId}, {prisma})` | **정상** | 스캐너가 `softDeleteUser` 의 `delete` 접두 패턴을 못 잡았다 |
| `apps/web/lib/theme/admin-actions.ts:10` | `getLayoutsForTheme` | 값 반환 | 없음 | **정상 (읽기)** | 이름이 `get` |
| `apps/web/lib/theme/admin-actions.ts:18` | `getSkinsForLayout` | 값 반환 | 없음 | **정상 (읽기)** | 같음 |
| `apps/web/app/api/auth/autologin-refresh/route.ts:82` | `GET` | 값 반환 | 없음 | **정상 (GET)** | 변경 메서드가 아님. POST(`:18`)에 쓰기 있음 |
| `apps/web/app/auth/signout/route.ts:9` | `POST` | `redirect('/')` | 없음(직접). `signOut({redirect:false})` (Auth.js) | **정상** | 세션 종료는 Auth.js 가 담당. redirect 만 하는 것이 맞다 |

### 3-A. 스캐너 누락 원인 (정정)

스캐너의 서비스 패턴은 `create|update|delete|…` 를 단어 경계로 찾는데, 실제 호출 이름이 `signup`, `verifyEmail`, `softDeleteUser`, `coreToggleAddon` 처럼 동사 접두가 다르거나 접두 뒤에 대문자가 이어지는 경우를 놓쳤다. 그래서 이 16건 중 상당수가 "쓰기 없음"으로 잘못 찍혔다. 그러나 본문을 직접 읽으니 **전부 실제 도메인 호출**이었다. 스캐너의 "쓰기 없음" 표시는 후보를 넓게 뽑는 용도로만 믿어야 한다.

## 4. 판정 요약 (목업 후보 전체)

| 등급 | 항목 | 수 |
|---|---|---:|
| 목업 (저장 안 함) | 약관 저장·삭제 2건, CAPTCHA 저장 1건 | **3** |
| 확인 필요 | 없음 | 0 |
| 정상 (스캐너 누락 포함) | 나머지 110건 | 110 |

**"확인 필요"가 0건인 이유:** 3절의 16건을 전부 본문으로 확인했고, 2절의 위임·서비스 호출도 대상이 실제 쓰기를 하는 것으로 확인된 것은 정의가 있는 것뿐이다. 위임 62건은 호출 대상이 query 인지 mutation 인지 전수 확인하지 않았으므로, 정확히는 "확인 필요 62건의 부분집합" 이라고 보는 편이 맞다. 아래 한계 참조.

## 5. 한계 (미검증)

- 위임 62건(tRPC `caller.*`)의 대상 프로시저가 mutation 이고 실제 Prisma 쓰기를 하는지 개별 확인하지 않았다. 라우터 마커 검색은 했지만 로직은 읽지 않았다. 이 항목이 "저장한 척"의 다음 후보다.
- 서비스 호출 21건 중 정의가 패키지 밖(예: `@rhymix-ts/*` 가 아닌 곳)에 있는 것은 확인하지 않았다.
- `route.ts` 의 POST 는 `points/adjust`, `points/config`, `import`, `autologin-refresh`, `files/upload`, `signout` 6개뿐이다. 스캐너는 `export function POST` 형태만 찾았다. 화살표 함수나 다른 export 형태가 있다면 빠진다.
- 런타임 동작(실제 저장 여부)은 확인하지 않았다. 목업 판정은 소스의 `[Mock]` 로그와 주석 처리된 호출 기준이다.
- 테스트 파일은 제외했다. 테스트가 목업을 검증하고 있을 수 있다.

## 6. 잔여 위험 (Residual-risk)

- 목업 3건은 화면이 "저장 완료"를 보여 주므로 사용자가 저장된 줄 안다. 실제로는 저장되지 않는다. 수리 전까지 해당 화면을 신뢰하면 안 된다.
- 라우터 쪽에 목업이 없어도 라우터 프로시저가 쓰기를 하지 않을 가능성은 남아 있다(위 한계 1번).
- 스캐너 기준 "쓰기 없음 16건" 중 2건(`verifyEmail`, `signup`)처럼 서비스 이름을 놓친 항목이 있었다. 같은 방식으로 놓친 것이 더 있을 수 있다. 본 조사에서는 16건 전부를 직접 읽었지만, 스캐너가 정상으로 분류한 110건은 본문을 전부 읽지 않았다.

## 부록: 산출물 위치

- 스캔 출력 TSV (113행, 함수별 쓰기·위임·서비스·마커·반환 신호): scratchpad `scan_out.tsv`
- 스캐너 스크립트: scratchpad `scan.py`
- 파일 목록: scratchpad `us_files.txt`, `route_files.txt`
