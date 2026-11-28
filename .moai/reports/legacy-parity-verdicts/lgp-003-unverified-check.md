# LGP-003 미검증 항목 소스 확정 (SPEC-CONTENT-PARITY 003 작성 전 확인)

- 작성: moai3 (보조 세션), 읽기 전용 확인
- 입력: `.moai/reports/legacy-parity-verdicts/lgp-003-content.md` §4.1 한계 (미검증) 항목
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기(`git log`, `git show`, `git diff`, `git status` 같은 읽기 명령만 사용), 레거시 DB 변경, 전체 테스트·빌드

## 요약

| # | 항목 | 결론 | 한 줄 근거 |
|---|---|---|---|
| 1 | `dispBoardAdminExtraVars` 확장 변수 **수정** UI | **없음** | 페이지는 추가·삭제 Server Action 만 있고, `contentExtraKey.update` 호출처 0건 |
| 2 | `dispTrashAdminList` 휴지통 **일괄** 처리 | **없음 (행 단위 복원·삭제와 전체 비우기만 있음)** | 체크박스·선택 상태 코드 0건. 행 단위 `handleRestore`·`handlePurge`, 전체 `handleEmpty` 만 있음 |
| 3 | `dispFileAdminUploadConfig` 의 `target_actions` 대응 | **레거시 파일 모듈에는 `target_actions` 가 없음 — 판정표의 전제가 잘못됨** | `target_actions` 는 스팸필터(captcha) 모듈 용어. rhymix-ts 트리거 대응 코드도 없음 |
| 4 | `dispBoardAdminCategoryInfo` 분류 **수정** UI | **없음** | 페이지는 추가·삭제 Server Action 만 있음. `admin.category.update` 는 라우터에만 있고 UI 호출처 0건 |
| 5 | `progress.md` M7 의 `[staged]` 표기 | **변경 자체는 커밋됨 (`baf71b3`). 다만 progress.md 의 `[staged]` 자리표시자는 SHA 로 바뀌지 않은 채 남음** | `baf71b3` 가 `mail-log.test.ts` 의 `timeout: 30000` 을 추가. `[staged]` 문자열은 `baf71b3` 에서 들어와 지금도 1건 남아 있음 |

---

## 1. `dispBoardAdminExtraVars` — 확장 변수 수정 UI

결론: **없음.** 화면에는 추가와 삭제만 있다.

```
$ ls "apps/web/app/admin/boards/[mid]/extra-keys/"
page.tsx

$ grep -n -E "update|Update|수정|onClick|mutation|Action" "apps/web/app/admin/boards/[mid]/extra-keys/"*.tsx
9:import { assertAdminServerAction } from '@/lib/auth/admin-guard';
47:  // Server Action: 확장 변수 키 추가
52:    await assertAdminServerAction();
84:  // Server Action: 확장 변수 키 삭제
89:    await assertAdminServerAction();

$ grep -rn -E "contentExtraKey" apps/web/app apps/web/components apps/web/lib --include=*.tsx --include=*.ts | grep -v test
(출력 없음 — 페이지·컴포넌트 어디에서도 contentExtraKey 프로시저를 호출하지 않음)

$ grep -n -E "^\s+[a-zA-Z]+:\s+protectedAdminProcedure" apps/web/server/api/routers/admin/content-extra-key.ts
61:  list: protectedAdminProcedure
73:  create: protectedAdminProcedure
95:  update: protectedAdminProcedure
117:  delete: protectedAdminProcedure
130:  reorder: protectedAdminProcedure
```

해석: `update`(`content-extra-key.ts:95`)와 `reorder`(`:130`)는 라우터에만 있고 UI 가 호출하지 않는다. 판정표가 "확장 변수 수정 대응 있음"으로 적었다면 그 근거는 라우터 존재뿐이므로 정정이 필요하다. 참고로 Server Action 주석 `:47`, `:84` 는 추가와 삭제만 다룬다.

## 2. `dispTrashAdminList` — 휴지통 일괄 처리

결론: **선택 일괄 복원·삭제는 없다.** 행 단위 복원·삭제와 "전체 비우기"만 있다.

```
$ grep -n -E "selectedIds|checked|checkbox|Set<|bulk|일괄|toggleAll|selectAll" apps/web/app/admin/trash/TrashClient.tsx
(출력 없음)

$ grep -n -E "function handle[A-Za-z]+|const handle[A-Za-z]+" apps/web/app/admin/trash/TrashClient.tsx
126:  const handleRestore = async (row: TrashRow) => {
134:  const handlePurge = async (row: TrashRow) => {
145:  const handleEmpty = async () => {

$ grep -n -E "^\s+[a-zA-Z]+:\s+protectedAdminProcedure" apps/web/server/api/routers/admin/trash.ts
50:  list: protectedAdminProcedure
68:  restore: protectedAdminProcedure
90:  purge: protectedAdminProcedure
106:  listComments: protectedAdminProcedure
123:  restoreComment: protectedAdminProcedure
142:  purgeComment: protectedAdminProcedure
166:  empty: protectedAdminProcedure
```

해석: 행 단위 복원·삭제는 `TrashClient.tsx:239`(`handleRestore(row)`), `:246`(`handlePurge(row)`)에 있다. `empty`(`trash.ts:166`)는 전체 비우기다. 선택 항목 여러 개를 묶어 처리하는 흐름은 없다. `aria-selected`(`:173`)는 탭 선택 표시이므로 일괄 처리가 아니다.

## 3. `dispFileAdminUploadConfig` — `target_actions` 대응

결론: **레거시 파일 모듈에 `target_actions` 가 없다.** 판정표의 "파일 설정의 `target_actions` 대응" 항목은 잘못된 전제다. `target_actions` 는 스팸필터 모듈의 캡차 대상 설정이다.

```
$ grep -rn "target_actions" --include=*.php --include=*.xml --include=*.html --include=*.js . | grep -v vendor
modules/spamfilter/spamfilter.model.php:241:		if ($target_action && !$config->captcha->target_actions[$target_action])
modules/spamfilter/spamfilter.class.php:145:		$output->target_actions = [];
modules/spamfilter/spamfilter.class.php:148:			$output->target_actions[$action] = ($config->{'use_' . $action} === 'Y') ? true : false;
modules/spamfilter/spamfilter.admin.controller.php:72:		if (!isset($vars->target_actions) || !is_array($vars->target_actions))
modules/spamfilter/spamfilter.admin.controller.php:74:			$vars->target_actions = [];
modules/spamfilter/spamfilter.admin.controller.php:96:		$config->captcha->target_actions = [
modules/spamfilter/spamfilter.admin.controller.php:97:			'signup' => in_array('signup', $vars->target_actions) ? true : false,
modules/spamfilter/spamfilter.admin.controller.php:98:			'login' => in_array('login', $vars->target_actions) ? true : false,
modules/spamfilter/spamfilter.admin.controller.php:99:			'recovery' => in_array('recovery', $vars->target_actions) ? true : false,
modules/spamfilter/spamfilter.admin.controller.php:100:			'document' => in_array('document', $vars->target_actions) ? true : false,

$ grep -n -i "target" modules/file/tpl/upload_config.html   (출력 없음)

$ grep -n -E "function dispFileAdminUploadConfig" -A12 modules/file/file.admin.view.php
233:	public function dispFileAdminUploadConfig()
  ... (config, is_ffmpeg, is_magick, is_exec_available 를 설정하고 upload_config 템플릿 사용)

$ grep -rn -E "trigger|Trigger|on_upload|onUpload|afterUpload|hooks" apps/web/app/admin/files/settings/*.tsx apps/web/server/api/routers/admin/file.ts
(출력 없음)
```

해석: 레거시 업로드 설정 화면(`dispFileAdminUploadConfig`)은 ffmpeg·imagemagick 실행 가능 여부 등을 보여줄 뿐 대상 액션 설정은 없다. rhymix-ts 쪽에도 업로드 트리거 대응 코드가 없다. 따라서 "레거시 target_actions 대응이 rhymix-ts 트리거로 있는가"의 답은 **해당 개념이 레거시 파일 모듈에 없어서 대응 대상 자체가 없다**. 스팸필터의 `target_actions` 는 LGP 판정표의 스팸필터 행(captcha 대상)과 연결해 다시 봐야 한다.

## 4. `dispBoardAdminCategoryInfo` — 분류 수정 UI

결론: **없음.** 페이지는 추가와 삭제만 있다. 설명 문구에는 "추가, 수정, 삭제"라고 적혀 있으나 수정 동작은 없다.

```
$ grep -n -E "update|edit|수정|onClick|mutation|Action" "apps/web/app/admin/boards/[mid]/categories/"*.tsx
9:import { assertAdminServerAction } from '@/lib/auth/admin-guard';
46:  // Server Action: 카테고리 추가
51:    await assertAdminServerAction();
74:  // Server Action: 카테고리 삭제
79:    await assertAdminServerAction();
95:          게시판 카테고리를 추가, 수정, 삭제합니다.

$ grep -rn -E "category\.update|categories?\.update|updateCategory" apps/web/app apps/web/components --include=*.tsx --include=*.ts | grep -v test
(출력 없음)

$ grep -n -E "^\s+[a-zA-Z]+:\s+protectedAdminProcedure" apps/web/server/api/routers/admin/category.ts
23:  list: protectedAdminProcedure
32:  create: protectedAdminProcedure
52:  update: protectedAdminProcedure
73:  delete: protectedAdminProcedure
```

해석: `update`(`category.ts:52`)는 라우터에만 있다. 페이지 안내 문구 `:95` 는 수정을 말하지만 동작은 없다. 판정표에 "수정 대응 있음"이 적혀 있다면 정정이 필요하다.

## 5. SPEC-CONTENT-PARITY-001 `progress.md` M7 `[staged]` 표기

결론: **변경 자체는 커밋돼 있다 (`baf71b3`). 다만 `progress.md` 의 `[staged]` 자리표시자는 실제 SHA 로 바뀌지 않은 채 남아 있다.**

```
$ sed -n 88p .moai/specs/SPEC-CONTENT-PARITY-001/progress.md
메일 로그 관련 커밋: `64fc5c0` (M7 완료), `04a7a30` (MailLogStatus mock), `dbc85bd` (mock 구조 수정), `7db05b4` (Test 1 타임아웃 수정), `512d500` (mock call-count mismatch 수정), `[staged]` (testTimeout 30000 조정, 진단 서술 갱신).

$ git log --oneline -S"30000" -- apps/web/server/api/routers/admin/mail-log.test.ts packages/auth/src/mail/smtp-dispatcher.test.ts apps/web/vitest.config.ts packages/auth/vitest.config.ts
baf71b3 docs(SPEC-CONTENT-PARITY-001): M7 testTimeout 조정 + 진단 서술 갱신

$ git show --stat --format='%h %s' baf71b3
baf71b3 docs(SPEC-CONTENT-PARITY-001): M7 testTimeout 조정 + 진단 서술 갱신
 .moai/specs/SPEC-CONTENT-PARITY-001/progress.md    |  4 ++--
 apps/web/server/api/routers/admin/mail-log.test.ts | 11 ++++++++++-

$ git show baf71b3 -- apps/web/server/api/routers/admin/mail-log.test.ts | grep -E "^[+-].*30000"
+  { timeout: 30000 }, // WSL2 dynamic-import cold-start 여유 (12-15s+), 로직 결함 아님

$ grep -c "\[staged\]" .moai/specs/SPEC-CONTENT-PARITY-001/progress.md
1
$ git log --oneline -S"[staged]" -- .moai/specs/SPEC-CONTENT-PARITY-001/progress.md
baf71b3 docs(SPEC-CONTENT-PARITY-001): M7 testTimeout 조정 + 진단 서술 갱신

$ git status --short apps/web/server/api/routers/admin/mail-log.test.ts   (출력 없음 — 작업 트리와 커밋 일치)
```

해석: `testTimeout 30000` 조정은 `baf71b3` 에 커밋됐고, 작업 트리의 `mail-log.test.ts:61` 도 같은 값이다. 그러나 `progress.md` 의 `[staged]` 는 `baf71b3` 에서 들어왔고, 그 뒤 SHA 로 바뀌지 않았다. 판정 근거로 쓸 때는 "`baf71b3` 에 커밋됨"으로 고쳐 적어야 한다. `[staged]` 표기는 커밋 전 상태를 가리키는 잘못된 표기다.

---

## 정리 (판정표 정정 대상)

- 1번 (확장 변수 수정): 정정 필요. 수정 UI 없음. 라우터 `update` 는 있으나 호출처 없음.
- 2번 (휴지통 일괄): 정정 필요. 일괄 선택 처리 없음. 행 단위와 전체 비우기만 있음.
- 3번 (파일 `target_actions`): 전제 자체가 틀림. 레거시 파일 모듈에 해당 개념 없음. 스팸필터 행과 다시 대조해야 함.
- 4번 (분류 수정): 정정 필요. 수정 UI 없음. 라우터 `update` 는 있으나 호출처 없음.
- 5번 (`[staged]`): 변경은 `baf71b3` 에 커밋됨. 표기만 정정 필요.

## 미검증 (Gaps)

- 브라우저로 화면을 실제로 열어 버튼·폼 동작을 확인하지 않았다. 모두 소스 기준이다.
- 1번·4번의 "호출처 0건"은 `apps/web/app`, `apps/web/components`, `apps/web/lib` 기준이다. 다른 패키지에서 같은 프로시저를 호출하는지는 확인하지 않았다.
- 3번에서 스팸필터의 `target_actions` 가 LGP 판정표의 어떤 행에 해당하는지는 판정표를 열어 확인하지 않았다.

## 잔여 위험 (Residual-risk)

- 소스 정적 검색 결과다. 런타임에서 동적으로 호출되는 경로가 있다면 놓칠 수 있다.
- 5번의 "커밋됨" 판단은 `git log -S` 기준이다. 해당 커밋이 원격에 푸시됐는지는 확인하지 않았다.
