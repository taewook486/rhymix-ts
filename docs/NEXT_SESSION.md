# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-18 (SPEC-LEGACY-PARITY-001 sync 마감 — status: completed)
> source_session_id: 372f1946-fbb9-4e02-a9cb-dcdc2e9ba6cf

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. SPEC-LEGACY-PARITY-002 plan-phase 진입.
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
3) grep "^status:" .moai/specs/SPEC-MEMBER-PARITY-001/spec.md → completed
   — SPEC-LEGACY-PARITY-000 §2.3 이 002 의 범위를 "재검증만" 으로 못박았다.
     신규 구현부터 계획하지 말 것
4) docker.exe ps → rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444) 3개 Up
   — 죽어 있으면 Docker Desktop 먼저 기동, rhymix-ts-db 는 별도 start 필요
     (admin@example.com / Rhymix!2026 — 레거시 localhost:8080 대조 가능)

실행: /moai plan "SPEC-LEGACY-PARITY-002 회원 영역 — SPEC-MEMBER-PARITY-001 재검증"

후속: 003 콘텐츠(SPEC-CONTENT-PARITY-001 in-progress 흡수) → 004 즐겨찾기
      (SPEC-ADMIN-MENU-PARITY-001 재검증) → 005 설정 → 006 고급

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-18)

SPEC-LEGACY-PARITY-001 sync phase 완주. **AC 11건(AC-SITE-001~011) 전건 PASS**,
`status: completed`. 커밋 4건 전부 push(`2e2da78..56822fc`, divergence `0 0`).

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

### sync-auditor 독립 판정 — **미수령**

`sync-auditor` 를 띄웠으나 세션을 마감하는 시점까지 판정이 돌아오지 않았고, 기다리지 않고
종료했다. **따라서 이 SPEC 의 sync 게이트는 독립 감사를 거치지 않은 상태다** —
`status: completed` 는 오케스트레이터 자체 재검증(위 표)만을 근거로 한다.

판정이 필요하면 다음 세션에서 다시 돌릴 것:

```
/moai review SPEC-LEGACY-PARITY-001 --deep
```

감사에 넘길 때 재실행 대상으로 지목했던 두 지점을 그대로 유지할 것 —
(1) AC-SITE-007/008 의 앵커 diff 가 실제로 하중을 받는지(경로가 바뀌었다면 비어 있지
않은지 대조 실행으로 증명), (2) 업로드 입력 검증·`duplicate` 프로시저 인가·재귀 깊이
상한 등 이번 run 이 새로 연 표면의 보안 렌즈.

미수령을 "이상 없음" 으로 읽지 말 것 — 증거 부재는 통과의 증거가 아니다.

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
