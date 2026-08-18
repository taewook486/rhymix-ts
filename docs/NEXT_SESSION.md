# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-18 (SPEC-LEGACY-PARITY-001 sync 마감 후 감사 FAIL — 후속 수리 대기)
> source_session_id: 372f1946-fbb9-4e02-a9cb-dcdc2e9ba6cf

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. SPEC-LEGACY-PARITY-001 감사 FAIL 후속 수리 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-stale-triage-doc-reverify, feedback-dont-trust-completion-marking
source_session_id: 372f1946-fbb9-4e02-a9cb-dcdc2e9ba6cf

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
   — SPEC 산출물 최종은 56822fc. 그 위 docs 커밋은 진입에 무관하므로
     HEAD 가 더 앞서 있어도 정상이다. 미커밋은 MoAI 하네스 템플릿
     배포분(.claude/·.moai/config/·.github/·CLAUDE.md)뿐이며 소스는 clean.
2) grep "^status:" .moai/specs/SPEC-LEGACY-PARITY-001/spec.md → completed
   grep "^status:" .moai/specs/_archive/SPEC-MENU-001/spec.md → superseded
3) cat .moai/plans/ancient-imagining-riddle.md → 감사 FAIL 후속 계획 (승인 완료)
   — sync-auditor 판정 FAIL(61.2/100). Security must-pass 미달.
     002 는 이 수리 뒤로 밀렸다
4) docker.exe ps → rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444) 3개 Up
   — 죽어 있으면 Docker Desktop 먼저 기동, rhymix-ts-db 는 별도 start 필요
     (admin@example.com / Rhymix!2026 — 레거시 localhost:8080 대조 가능)

실행: /moai plan "SPEC-LEGACY-PARITY-001-FIX 감사 지적 보안 결함 수리" (계획서 기반)

후속: 수리 후 sync-auditor 재판정(이번엔 기다릴 것) → SPEC-LEGACY-PARITY-002 회원
      (SPEC-MEMBER-PARITY-001 재검증만이 범위) → 003 콘텐츠 → 004~006

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-18)

SPEC-LEGACY-PARITY-001 sync phase 완주. AC 11건(AC-SITE-001~011)을 전건 PASS 로 판정하고
`status: completed` 로 마감했다. 커밋 4건 전부 push(`2e2da78..56822fc`, divergence `0 0`).

> **단, 이 판정은 이후 감사에서 뒤집혔다.** 아래 "sync-auditor 독립 판정" 절을 먼저 읽을 것 —
> 감사는 AC 3건(004/005/006)을 `unverified-here` 로 재분류했고 Security must-pass 미달로
> 전체 FAIL 을 냈다. 위 표는 마감 시점의 기록이지 최종 상태가 아니다.

| 커밋 | 내용 |
|---|---|
| `34c1386` | lint 결함 수리 — `eslint-disable` 위치 오류 |
| `93dc1fb` | AC-SITE-009 — `_archive/SPEC-MENU-001` → `status: superseded` |
| `53cd137` | sync 마감 — progress.md §E.4 + spec.md completed + CHANGELOG |
| `56822fc` | §E.4 `sync_commit_sha` backfill |

### 게이트 재실행 실측 (에이전트 자체 보고 미사용)

증적 `.moai/state/verify/372f1946/`.

| 검증 | 결과 |
|---|---|
| typecheck `apps/web` / `packages/admin` | 각 exit 0 / 0건 |
| 단위 web 4스위트 | `31 passed (31)`, 230.97s |
| 단위 admin `menu-button-image.test.ts` | `5 passed (5)` |
| AC-SITE-007/008 PRESERVE 앵커 diff (`a9e637a..HEAD`) | 각 0행 |
| AC-SITE-009 기계 검증 | `status: superseded` + 커밋 `93dc1fb` |
| eslint SPEC 범위 5파일 | 에러 1건 발견·수리 → 0, 경고 4건 유예 |

### sync-auditor 독립 판정 — **FAIL (61.2 / 100)**

세션 마감 직후에 판정이 도착했다. **must-pass 차원인 Security 가 High 1건으로 임계를
넘지 못해 전체 FAIL.** 즉 `status: completed` 로 push 된 이 SPEC 은 **감사에 실패한
상태**다. 후속 계획은 `.moai/plans/ancient-imagining-riddle.md` (승인 완료).

차원별: Functionality 75 / Security 50(FAIL) / Craft 50 / Consistency 75 → 조화평균 61.2.

오케스트레이터가 소스로 직접 재확인한 2건:

- **D1 (High)** — `updateMenuItemAction`(`apps/web/app/admin/menu/actions.ts:266`)에
  진입부 권한 검사가 없고 `apps/web` 에 `middleware.ts` 도 없다. 파일 쓰기(`:301` →
  `:125`)가 유일한 게이트인 tRPC 호출(`:321`)보다 **먼저** 실행된다. `groupIds` 를 뺀
  요청은 무인증으로 디스크 쓰기에 도달한다. **런타임 재현은 미실시 — 수리 전 첫 단계다.**
- **D4 (major)** — `reorder`(`menu-item.ts:130`)가 `parentId` 를 조상 검증 없이 받고
  파일 전체에 순환·깊이 가드가 0건. 사이클이 생기면 `duplicate` 재귀뿐 아니라 **공개
  페이지의 `buildMenuTree`(`MenuRenderer.tsx:88`)도 무한 재귀**해 사이트가 렌더 불가가 된다.

나머지: D2 실패 시 고아 파일 잔류 / D3 구 텍스트영역 JSON 값이 1건이라도 있으면 import
전량 실패 / D5 MIME 매직바이트 미검사 / D6 nosniff 헤더 부재.

**§E.4 자체의 오류도 지적됐다** — 인용한 lint 로그가 수리 **이전** 것(`1 error` 포함),
`sync_phase_commit_count: 3` 이 실제 4, 경고 수 과소집계, 커버리지가 SPEC 전 기간
한 번도 측정되지 않음(프로파일 임계 85% 대비 UNVERIFIED). 정정은 계획 5단계.

## 이번 세션이 잡아낸 것

### 1. `§E.3` 자기보고가 재실행으로 반증됨

progress.md §E.3 은 `new_warnings_or_lints_introduced: 0` 이라고 적어 뒀는데
사실이 아니었다. M4 커밋 `37b5817` 이 넣은
`eslint-disable-next-line @typescript-eslint/no-explicit-any` 가 실제 대상인
244행 `} as any,` 가 아니라 228행 `data: {` 위에 놓여 있었다. 결과는 두 갈래 —
228행은 "덮을 게 없는 미사용 디렉티브" 경고, 244행은 미보호 `Unexpected any`
**에러**. sync 게이트에서 eslint 를 직접 돌려서 발견했고 `34c1386` 에서 수리했다.

교훈은 이미 메모리에 있는 것과 같다: **요약 문구는 증거가 아니다.** 다만 이번
건은 "테스트 통과" 주장이 아니라 **lint 카운터 필드**였다 — 자기보고 중 재실행
대상으로 삼아야 할 항목이 테스트만이 아니라는 뜻이다.

### 2. CHANGELOG 와 아카이브 문서가 서로 다른 상태를 말하고 있었음

CHANGELOG 의 SPEC-MENU-001 항목은 `status: in-progress`, 아카이브
`_archive/SPEC-MENU-001/spec.md` 는 `status: completed` 였다. 어느 쪽도
supersede 를 반영하지 않은 상태였고, 이번 전환으로 양쪽을 `superseded` 로 정리했다.
**상태 표기는 SPEC 문서 · CHANGELOG · 아카이브 세 군데에 흩어져 있으니
전환할 때 셋 다 확인할 것.**

### 3. plan.md §A.6 이탈이 문서에서 "계획 변경" 처럼 읽히고 있었음

§A.6 은 Tier L 재판정에 따라 커밋 전략을 PR 흐름으로 **바꿨다**. 그런데 실제 run 은
마일스톤별 main 직접 커밋(Route A)으로 갔고, progress.md §E.2 M4 는 이를
"§A.6 의 Tier-L PR 플로우 주석은 브리프로 대체됨" 이라고 적어 마치 계획이 개정된
것처럼 서술해 뒀다. 사실은 **계획과 다르게 실행된 것**이다. sync HUMAN GATE 에서
사용자가 Route A 유지를 선택했고(이미 push 되어 지금 PR 을 열면 코드 diff 가 없는
빈 PR 이 된다), §E.4 와 spec.md HISTORY 에 이탈로 명시해 남겼다.

## 남은 부채 (제품 결함 아님 — progress.md 기록됨)

1. 복제 대상을 정하는 읽기가 `$transaction` **밖** — 쓰기 원자성만 덮인다(TOCTOU).
2. `$transaction` 타임아웃 미지정 — Prisma 기본 5초, 노드 많은 서브트리는 초과 가능.
3. `duplicateMenuItemAction` 이 UI 에 미배선 — 버튼은 tRPC 훅 직접 호출(중복 진입점).
4. `createdCount` 가 트랜잭션 클로저 밖 변수.
5. `<img>` 경고 4건 (`MenuItemEditor.tsx:339`, `MenuRenderer.tsx:177/184/192`) —
   버튼 이미지가 임의 외부 URL 을 허용해 `next/image` 전환이 remote-domain
   화이트리스트 설정을 동반한다. 범위 밖 후속 후보.
6. (별건) `apps/web/lib/modules/registry.test.ts` B-101 — 실측 160~182초 vs 예산
   180초 경계선. 부하가 튀면 빨개져 "회귀인가" 의심 비용을 만든다.

### 증거 결함 — 후속 실행 시 주의 (이월)

`.moai/state/verify/m4/verify.sql` **(5) 쿼리가 `id = 1` 을 하드코딩**한다.
원 실행에서는 원본 루트가 우연히 id 1 이라 통과했지만, 재실행하면 시퀀스가 이어져
`src` 가 비고 CROSS JOIN 이 0행 — 5개 무결성 검증이 아무것도 평가하지 않는다.
**무결성이 실제로 깨져도 같은 0행**이라 거짓 음성 채널이다. 원본=최소 id /
사본=차순 id 로 파라미터화한 판정을 쓸 것(`m4-orch/o5-integrity-fixed.txt`).

## 환경 함정 (재발 방지 — 계속 유효)

- **`npx` 가 Windows 바이너리로 잡힌다.** PATH 가 미번역 윈도우 경로로 오염돼 있어
  `npx`/`tsc`/`vitest` 이름 조회가 cmd.exe 로 새고 한글 깨진 에러가 나온다.
  `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"` 를 앞에 붙이고,
  도구는 `node_modules/.bin/<tool>` 로 직접 지목할 것. `eslint` 는 루트가 아니라
  `apps/web/node_modules/.bin/` 에 있다.
- **Bash 도구의 cwd 는 호출 간 유지된다.** 앞 호출에서 `cd apps/web` 했으면 다음
  호출도 거기서 시작한다. 매 호출을 절대경로 `cd` 로 시작할 것.
- **stale `.git/index.lock` 상시 발생** — 미커밋 600여 경로 때문에
  `git status --porcelain` 이 느리고, statusline 이 이를 반복 폴링해 경합한다.
  이번 세션에서도 22분 묵은 0바이트 lock 이 `git add` 를 막았다. `ps` 로 **쓰기 계열**
  git 프로세스 부재를 확인하고 lock 나이가 120초를 넘으면 제거할 것
  (`git status` 는 읽기라 보유자가 아니다).
- **dev 서버 staleness**: `/mnt/d`(drvfs)에서 inotify 가 안 떠 Turbopack 이 변경을
  놓친다. 구현 후 반드시 재기동하고, 로그에서 `Local: http://localhost:3000` 을 확인할 것.
  기존 서버가 살아 있으면 새 서버가 3001 로 밀린 뒤 `.next/dev/lock` 획득 실패로 죽고,
  그 상태로 테스트를 돌리면 **낡은 번들 서버를 측정**한다.
- **`next dev` 부모만 죽여선 포트가 안 풀린다** — `next-server (v16.0.0)` 자식이
  3000 을 계속 점유한다. 종료 후 `.next/dev/lock` 도 지울 것.
- **`pkill -f 'next dev'` 는 자기 자신을 죽인다**(패턴이 Bash 도구 커맨드라인에
  들어감, exit 144). 브래킷 회피: `'next[ ]dev'`.
- **vitest/playwright 출력은 `\r` 로 뭉친다** — `tr '\r' '\n'` 필요.
- **단위 테스트는 레포 루트 기준** — `apps/web` 에서 돌리면 "No test files found".
- **jsdom 스위트는 WSL2 에서 느리다** — environment 만 166초, 4스위트 231초. hang 아님.
- **커밋은 명시 pathspec 으로만** — 작업 트리에 MoAI 하네스 템플릿 배포분 600여
  경로가 미커밋으로 상주한다. `git add -A` / `git add .` 는 이것을 통째로 삼킨다.
