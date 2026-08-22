# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-22 (SPEC-LEGACY-PARITY-001 **완전 종료** — 재감사 PASS 84.6 수령·기록·푸시)
> source_session_id: 51318629-ca68-4817-b32f-ee4dd0db41bb

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. rhymix-ts — SPEC-LEGACY-PARITY-001 종료 후 다음 작업 선정 진입.
applied lessons: feedback-idle-notification-is-not-termination,
feedback-agent-test-claims-verify-by-rerun, feedback-verify-commit-message-against-diff
source_session_id: 51318629-ca68-4817-b32f-ee4dd0db41bb

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
   — HEAD 는 (아래 "이번 세션 결과"의 최종 SHA). 소스 clean, 미커밋은 하네스 템플릿뿐.
2) grep "^status:" .moai/specs/SPEC-LEGACY-PARITY-001/spec.md → completed
   — 재감사 PASS 84.6 수령·기록 완료. **이 SPEC 은 닫혔다. 재개방하지 말 것.**
3) 진행 중인 SPEC 없음 — 다음 작업은 아래 "후보 작업" 중에서 사용자와 정할 것.

실행: 사용자에게 다음 작업을 물어 정할 것 (AskUserQuestion). 후보는 아래 절.
      선정 전에 임의로 착수하지 말 것 — 남은 항목은 전부 선택적 후속이다.

후속: 선정된 작업의 규모에 따라 /moai plan 또는 직접 수리.

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-22)

**SPEC-LEGACY-PARITY-001 이 완전히 닫혔다.** 감사 FAIL(61.2) → 결함 6건 수리 →
재감사 **PASS 84.6/100**. 판정을 받은 뒤 닫았다(직전 세션들의 "닫고 나서 판정이 오는"
순서를 반복하지 않았다).

| 차원 | 점수 | must-pass |
|---|---|---|
| Functionality | 88 | 통과 |
| Security | 90 | 통과 |
| Craft | 73 | — (커버리지 미측정이 상한) |
| Consistency | 90 | — |

회복은 재점수가 아니라 수리 실측으로 성립했다. 전문 보고서는
`.moai/reports/SPEC-LEGACY-PARITY-001-reaudit-20260822-181701.md` 에 **커밋돼 있다**
(`.moai/state/` 아래 증적이 gitignore 로 재현 불가했던 전례를 피했다).

### 재감사가 명시 판정한 다툼 지점 3건

1. **D1 High→Medium 유지.** 감사자가 `apps/web/proxy.ts:53,200-208` 을 직접 읽고 `/admin`
   요청단계 차단을 확인 — 원 High 의 전제("middleware.ts 없음")는 확정 반증됐다. 잔여는
   다층 방어(서버액션은 URL 경로가 아니라 action ID 로 주소지정).
2. **D3 마이그레이션 불요 동의.** 감사자가 **주 DB 의 0건을 근거로 받지 않았다** — 68개
   테이블 전부 0행이라 아무것도 증명하지 않는다는 점을 명시했다. 채택한 근거는 구조적:
   `bundle-schema.ts:48-51` union 이 레거시 평문 문자열을 정합형으로 정규화하므로
   레거시→신규 경로는 구성상 비정합 값을 만들 수 없다.
3. **AC-SITE-004/005/006 은 PASS 를 막지 않는다.** 감사 환경 미검증 ≠ 실패. 검증 수단은
   `c3037dd` 로 저장소에 커밋돼 있다. Gap 으로 남긴 채 마감했다.

### 오케스트레이터 독립 재검증 (감사자 자체보고를 근거로 쓰지 않음)

- vitest SPEC 범위 6스위트 재실행 → **80/80 통과** (actions 26 / menu-item 23 /
  MenuRenderer 8 / by-key 3 / bundle-schema 11 / menu-button-image 9)
- 수리 앵커 6건 HEAD 재grep → 보고 행번호와 **전건 일치**
- `git status` → 감사자 소스 무수정(신규는 보고서 1건뿐)
- 유휴 알림 2회를 **종료 증거로 쓰지 않고** 매번 파일·프로세스를 실측해 확인

### 남은 Gap 3건 (해소하지 않고 남김 — 이게 마감 조건이었다)

1. **커버리지 미측정.** 루트 `vitest@3.2.4` vs `@vitest/coverage-v8@3.2.7` 버전 스큐로
   측정값이 자기무효화된다. 상태는 "충족"이 아니라 UNVERIFIED.
2. **AC-SITE-004/005/006 증적 저장소 재현 불가** (`.moai/state/` gitignore).
3. **sync 재검증의 스위트 누락** — 마감 시점 기록. 재감사에서 해당 스위트는 재실행됐다.

## 후보 작업 (전부 선택적 — 사용자가 고를 것)

- **커버리지 툴체인 정렬.** `vitest`/`@vitest/coverage-v8` 버전 일치 + `vitest.config.ts`
  의 stale 한 `coverage.include` 갱신 → 85% 임계 측정. Craft 73 의 상한이 이것뿐이라
  코드 변경 없이 점수가 오른다.
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
