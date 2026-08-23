# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-23 (coverage.include 재구성 **적용·측정·푸시 완료** — `cc297db`.
>       4개 지표 전부 임계 85 미달, 임계는 무변경. 다음은 0% 영역 테스트 착수)
> source_session_id: 065918eb-e7ff-4d34-8c39-efac42f66bac

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. rhymix-ts — 0% 영역 테스트 착수 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-verify-command-matched-what-you-meant, feedback-stale-triage-doc-reverify
source_session_id: 065918eb-e7ff-4d34-8c39-efac42f66bac

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
   — coverage.include 재구성은 cc297db 로 이미 반영·푸시됐다. 다시 손대지 말 것.
2) grep -n "document/src/server" vitest.config.ts → 1행 존재
   — 이 영역이 0% 다. 측정은 끝났고 남은 것은 테스트를 쓰는 일이다.
3) 임계 85 는 무변경 유지(사용자 지시). 미달을 임계 하향으로 해결하지 않는다.

실행: packages/document/src/server 와 packages/file/src/server 의 tRPC 라우터
      단위 테스트 작성. apps/web/server/api/routers/ 의 기존 테스트 패턴을 재사용한다.

후속: 같은 범위 실행 명령으로 재측정해 68.64% 대비 증분을 보고.

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-22)

### 1부 — SPEC-LEGACY-PARITY-001 완전 종료

감사 FAIL(61.2) → 결함 6건 수리 → 재감사 **PASS 84.6/100**(Functionality 88 /
Security 90 must-pass 회복 / Craft 73 / Consistency 90). 판정을 받은 뒤 닫았다.
전문 보고서는 `.moai/reports/SPEC-LEGACY-PARITY-001-reaudit-20260822-181701.md` 에
**커밋돼 있다**. 오케스트레이터가 감사 자체보고를 받지 않고 vitest 80/80 재실행 +
수리 앵커 6건 행번호 대조까지 마쳤다. 상세는 progress.md §E.4.

### 2부 — 커버리지 툴체인 조사 (적용 직전 중단)

**감사 F2 의 "버전 스큐" 진단은 도구 실행으로 반증됐다.**

- 15개 package.json 전부 `vitest: ^3.0.0` / `@vitest/coverage-v8: ^3.0.0` — **선언 이미 일치**.
- pnpm-lock 이 `@vitest/coverage-v8@3.2.7(vitest@3.2.4)` 로 **peer 명시 해석** — 정상 쌍.
- `--coverage` 실행이 리포트를 정상 생성(좁은 범위 probe 에서 표 + 임계 판정 출력).

즉 **맞출 버전이 없다.** 고칠 것은 `coverage.include` 하나다. 현재 목록이 install 시대
선택에 멈춰 있고, 그 안의 `apps/web/middleware.ts` 는 Next 16 개명으로 **존재하지 않는다**
(나머지 12개 경로는 실재 확인).

#### 적용된 변경 (2026-08-23 `cc297db` 로 커밋·푸시 완료 — 재적용 금지)

```diff
  coverage.include: [
    ... install 시대 항목 전부 유지 ...        # 사용자 지시: 유지
-   'apps/web/middleware.ts',                  # 죽은 파일 — 제거
    'apps/web/proxy.ts',
-   'apps/web/app/api/install/**/*.ts',        # 아래 전체 글롭에 흡수
+   'apps/web/app/api/**/*.ts',                # HTTP 라우트 핸들러 11건 전량
    'apps/web/server/api/**/*.ts',             # tRPC 라우터 57건 (이미 포함돼 있었음)
+   'packages/document/src/server/**/*.ts',    # tRPC 라우터
+   'packages/file/src/server/**/*.ts',        # tRPC 라우터
  ]
```

**임계 85 는 무변경**(사용자 지시). 수치가 미달이어도 임계를 낮추지 않고 수치만 보고한다.

#### 측정 경로 — 전체 스위트는 폐기할 것

| 시도 | 결과 |
|---|---|
| 전체 스위트 `vitest run --coverage` | **105분 소모, 커버리지 수치 미생성.** 표도 `coverage/` 도 안 나옴. 테스트는 2,626/2,648 통과, 실패 7건은 **전부 타임아웃** |
| 범위 실행 1차 | **무효** — 아래 함정에 걸려 2파일만 실행 |
| 범위 실행 2차 | **성공 — 이게 변경 전 기준선이다.** 103파일 / 947테스트 전원 통과 |

전체 스위트 경로는 다시 시도하지 말 것 — 105분을 쓰고 숫자를 못 얻는다. 아래 범위 실행
명령을 쓸 것(전/후 동일 명령으로 돌려야 비교가 성립한다):

```
node_modules/.bin/vitest run --coverage \
  apps/web/server/api/ apps/web/app/api/ apps/web/app/install/ \
  apps/web/lib/install/ apps/web/lib/db/ apps/web/proxy \
  packages/auth/src/ packages/core/src/install/ packages/core/src/modules/ \
  packages/db/src/ packages/document/src/server/ packages/file/src/server/
```

#### 변경 전 기준선 (실측 완료 — 다시 재지 말 것)

위 범위 실행 명령으로 측정. 103파일 / 947테스트 통과 / 9 skip, 테스트 실패 0건.

| 지표 | 수치 | 임계 85 |
|---|---|---|
| Statements | **75.02%** | 미달 |
| Lines | **75.02%** | 미달 |
| Branches | **77.66%** | 미달 |
| Functions | **88.81%** | **충족** |

즉 **"커버리지 미측정" Gap 은 이제 측정됐다** — 그리고 현재 include 범위조차 85 에
미달한다(함수만 통과). include 를 넓히기 전부터 미달이었다는 뜻이라, 변경 후 수치가
더 내려가도 그것이 이번 변경 때문만은 아니다. 전/후 대조 시 이 점을 분리해서 볼 것.

눈에 띄는 구멍: `apps/web/lib/db` 가 **0%** 다. 이 한 영역이 총계를 크게 끌어내리고 있어
커버리지를 올리려면 여기가 첫 후보다.

증적: `.moai/state/verify/51318629/coverage-before2.log` (gitignore 경로 — 로컬 한정).

#### 변경 후 실측 (2026-08-23, 동일 명령 — 측정 완료)

103파일 / 947통과 + 9 skip, 테스트 실패 0건. 실행 규모가 변경 전과 **동일**하므로 전/후
비교가 성립한다(테스트 집합은 그대로, 분모만 넓어졌다). 소요 931초.

| 지표 | 변경 전 | 변경 후 | 증감 | 임계 85 |
|---|---|---|---|---|
| Statements | 75.02% | **68.64%** | −6.38p | 미달 |
| Lines | 75.02% | **68.64%** | −6.38p | 미달 |
| Branches | 77.66% | **76.32%** | −1.34p | 미달 |
| Functions | 88.81% | **83.62%** | −5.19p | 충족 → **미달로 전환** |

**4개 지표 전부 미달.** 임계는 낮추지 않았다(사용자 지시).

하락분은 전부 **새로 포함된 영역이 통째로 미측정**이라서다 — 기존 영역 수치는 그대로다.
품질이 나빠진 게 아니라, 커버리지 계산에서 빠져 있던 코드가 분모에 들어왔다. include 를
넓힌 목적 자체가 이 은폐를 걷어내는 것이었으니 의도한 결과다. 다만 **변경 전 75.02% 도
이미 미달**이었으므로 −6.38p 를 전부 이번 변경 탓으로 읽으면 안 된다.

증적: `.moai/state/verify/065918eb/coverage-after.log` (561~564행에 임계 실패 4건).

#### 0% 영역 — 다음 작업의 우선순위

| 대상 | 규모 | 비고 |
|---|---|---|
| `packages/document/src/server/**` | actions.ts 236행 + router.ts 347행 | **전량 0%** |
| `packages/file/src/server/**` | actions.ts 320행 + router.ts 466행 | **전량 0%** |
| `apps/web/app/api/files/upload/route.ts` | 143행 | 0% — 보안 감사에서 손댔는데 단위 테스트 없음 |
| `apps/web/app/api/documents/[id]/download/route.ts` | 56행 | 0% |
| `apps/web/server/api/context.ts` / `root.ts` | 124 + 13행 | 0% — 배선 파일 |
| `apps/web/lib/db/prisma.ts` | 1행 | 0% — 싱글턴, 총계 영향 없음 |

합계 0% 파일 34개. **document/file 의 server 라우터 1,169행이 단일 최대 구멍**이고,
tRPC 라우터라 `apps/web/server/api/routers/` 의 기존 테스트 패턴을 그대로 재사용할 수 있다.

지표만 통과시키려면 `context.ts`/`root.ts`/`trpc/[trpc]/route.ts` 같은 배선 파일을
`exclude` 하는 길도 있지만, include 를 넓힌 취지를 되돌리는 것이라 채택하지 않았다.

#### 새로 확인된 함정 2건

- **vitest 위치 인자는 글롭이 아니라 경로 정규식 필터다.** `'apps/web/server/api/**/*.test.ts'`
  를 넘기면 **아무것도 매칭되지 않는다**(와일드카드 없는 리터럴 경로만 걸린다). 이번에 이걸로
  2파일 39테스트만 돌았는데 5.11% 라는 그럴듯한 숫자가 나왔다 — **실행 파일 수를 대조하지
  않으면 잘못된 기준선을 그대로 믿게 된다.** 경로 접두사를 넘길 것.
- **전체 스위트 타임아웃 7건은 WSL2 병렬 경합이지 제품 결함이 아니다.** 테스트 파일들이
  자기 주석에 "격리 25초 → 전체 스위트 90초 초과"라고 적어두고 있다.
  `apps/web/lib/modules/registry.test.ts` B-101 은 **180초를 주고도 터졌다**(별건 부채).

## 후보 작업 (전부 선택적 — 사용자가 고를 것)

- ~~**커버리지 툴체인 정렬.**~~ **완료(2026-08-23, `cc297db`).** 버전 스큐는 오진으로
  반증됐고, `coverage.include` 재구성 + 전/후 실측까지 끝났다. 남은 것은 아래 항목이다.
- **0% 영역 테스트 작성 (권장 다음 작업).** `packages/document`·`packages/file` 의 server
  라우터 1,169행이 전량 미측정이다. 여기가 임계 85 로 가는 가장 짧은 경로다.
- **`packages/admin` 린트 구성.** 현재 `"lint": "echo 'no lint'"`.
- **`no-unused-vars` 경고 7건 정리** (`actions.ts:402` `err`, 다운로드 라우트 `ReadableStream`
  ×2, `actions.test.ts:46/57/75/76`). 미용 수준.
- **`next/image` 전환 4건.** 버튼 이미지 URL 이 항상 자기 오리진이라 `remotePatterns`
  없이 가능. 본 SPEC 범위 밖으로 유예됐던 항목.
- **AC-006 단위 수준 핀.** 슬롯 배정이 현재 e2e 전용 — `listSlotAssignments` 왕복
  단위 테스트를 붙이면 환경 의존이 줄어든다.
- **주 DB 재시드.** `rhymix_ts` 가 68개 테이블 전부 0행이다(레거시는 41행 유지).
  2026-08-13 의 "양 버전 기준선 확보" 상태가 TS 쪽만 깨져 있다.
- **별건 부채**: `apps/web/lib/modules/registry.test.ts` B-101 이 180초 예산 경계선
  (실측 160~182초). 예산 조정 또는 분할.
- **잔여 worktree 정리**: `.claude/worktrees/agent-a09e6b3213e201359/` 가 남아 있다.
  내용 확인 후 처분할 것.

## 환경 함정 (재발 방지 — 계속 유효)

- **`moai` 바이너리가 2개다.** `/usr/local/bin/moai` = **2.14.0**(`gate`/`session`/`model`
  없음), `~/.local/bin/moai` = **3.1.2**(전부 있음 — 종전 기록 3.1.1 에서 올라갔다).
  PATH 가 잡는 건 2.14.0 이다. pre-commit 이 `moai gate` 로 실패하면 품질 불합격이 아니라
  이 스큐다(`unknown command "gate"`) — 수동 검증 후 `SKIP_MOAI_PRECOMMIT=1` 로 통과시키고
  사유를 커밋 본문에 남길 것. 이번 세션 커밋이 그 예시다.
- **`.git/index.lock` 은 `moai statusline` 이 만든다.** 매 렌더마다 `git status --porcelain`
  을 띄워 lock 을 재생성한다. `rm -f` 직후 커밋해도 경합에 진다 — **재시도 루프**로 뚫을 것
  (`sleep` 은 도구가 막으므로 fifo + `read -t` 로 지연):
  `mkfifo f; exec 3<>f; for i in $(seq 1 25); do rm -f .git/index.lock; git commit -F msg && break; read -t 0.4 -u 3 _; done`
  **주의**: `git commit ... | tail` 처럼 파이프를 걸면 exit code 가 가려져 루프가 성공으로
  오판한다. 커밋 성공 여부는 `git log` 로 확인할 것.
- **유휴 알림은 종료의 증거가 아니다.** 서브에이전트가 끝났을 때도, 권한 프롬프트에서
  멈췄을 때도, 죽었을 때도 똑같이 유휴가 된다. 산출물 파일과 `ps` 를 실측해 판단할 것.
- **세션 레지스트리에 죽은 PID 가 남는다.** `moai session list` 를 그대로 믿지 말고
  `kill -0 <pid>` 로 확인. 서브에이전트도 별도 세션으로 등록돼 "외부 세션"처럼 보인다 —
  cmdline 의 `--agent-id` 로 구분.
- **`npx` 가 Windows 바이너리로 잡힌다.** 매 Bash 앞에
  `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"`, 도구는 `node_modules/.bin/<tool>`
  직접 지목. `eslint` 는 `apps/web/node_modules/.bin/`.
- **커밋은 명시 pathspec 으로만.** 미커밋 400+ 하네스 템플릿이 상주 — `git add -A`/`git add .` 금지.
- **eslint 가 느리다**(3분+). **jsdom 스위트도 느림**(100~230초, hang 아님 — MenuRenderer
  단독 실행이 182초였다). 타임아웃 넉넉히.
- **단위 테스트는 레포 루트 기준.** vitest 경로에 `[key]` 대괄호 있으면 따옴표로 감쌀 것.
- **dev 서버**: `/mnt/d` inotify 미작동 → 구현 후 재기동 필수, `.next/dev/lock` 먼저 제거.
- **`pkill -f 'next dev'` 는 자기 자신을 죽인다**(exit 144). 브래킷 회피 `next[ ]dev`.
- **docker**: rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444).
  WSL 에서 안 잡히면 Docker Desktop 의 WSL2 통합을 켤 것. admin@example.com / id=1 (2FA 없음).
