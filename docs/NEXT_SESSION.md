# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-17 (SPEC-LEGACY-PARITY-001 M3 마감 + M4 완료·독립 검증 완료)
> source_session_id: 7b1c29bc-46f2-469d-b463-9f6bbcd4f727

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. SPEC-LEGACY-PARITY-001 sync-phase 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-flaky-failures-need-repeated-runs, feedback-no-parallel-git-commits
source_session_id: 7b1c29bc-46f2-469d-b463-9f6bbcd4f727

전제 검증:
1) main == origin/main (0 0) + 작업 트리 clean (미커밋은 .claude/ 하네스 배치뿐)
   — 이 문서 갱신 시점 HEAD 는 683b7d7, SPEC 산출물 최종은 3d3aeb6.
     그 위 docs 커밋은 sync 진입에 무관하므로 HEAD 가 더 앞서 있어도 정상이다.
2) docker.exe ps → rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444) 3개 Up
   — 죽어 있으면 Docker Desktop 먼저 기동, rhymix-ts-db는 별도 start 필요
3) DB 설치 기준선: menus 0 / menu_items 0 / sites 1
   (admin@example.com / Rhymix!2026 — 레거시 localhost:8080 대조 가능)
4) spec.md status → in-progress, progress.md §E.3 run_status: complete

실행: /moai sync SPEC-LEGACY-PARITY-001

후속: AC-SITE-009 전환(SPEC-MENU-001 → superseded, manager-spec 소관) →
      SPEC-LEGACY-PARITY-002 회원 → 003 콘텐츠

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-17)

### 완료

- **M3 마감** (`cacf0e2`) — 인계 기록 모순 해소. 미해결로 남아 있던 e2e 1건은
  제품 결함이 아니었다(아래 "인계 기록이 틀렸던 건" 참조).
- **M4 메뉴 항목 복제** (`37b5817` 구현 → `7450ba3` e2e 로케이터 수리 →
  `742b7c6` 마감 기록 → `3d3aeb6` 독립 검증 기록). tRPC `duplicate` 프로시저 +
  `duplicateMenuItemAction` + UI 복제 버튼 + 단위 28건 + e2e 1건.
- `apps/web/uploads/` gitignore 추가 — 추적 소스 0인 런타임 디렉터리가 무시
  목록에 없어 넓은 `git add` 가 업로드 파일을 삼킬 수 있었다.
- 고아 worktree `.claude/worktrees/agent-20260628-194949` 삭제
  (아카이브: `~/rhymix-ts-stale-worktree-20260628.tar.gz` 483K/430파일).

### 오케스트레이터 독립 재검증 (13/13 통과)

에이전트 자체 보고를 근거로 쓰지 않고 전 항목 재실행. 증적 `.moai/state/verify/m4-orch/`.

| 검증 | 결과 |
|---|---|
| 단위 3스위트 재실행 | 28 passed, exit 0 |
| typecheck web / admin | 각 exit 0 / 0건 |
| e2e 재실행 (시드→dev 재기동→UI 왕복) | 1 passed, exit 0 |
| 실 DB verify 재실행 | 사본 4행, `parentId\|listOrder` 중복 **0 rows**, `btn_is_sql_null=t` |
| PRESERVE 앵커 diff | 경로 실존(`git ls-files`) 확인 후 diff 0 |
| 공허 통과 판별 (주입 2건) | 시프트 제거 → 중복 검출 / 재귀 차단 → 4행→1행 검출 |

### 검증이 잡아낸 증거 결함 — 후속 실행 시 주의

`.moai/state/verify/m4/verify.sql` **(5) 쿼리가 `id = 1` 을 하드코딩**한다.
원 실행에서는 원본 루트가 우연히 id 1 이라 통과했지만, 재실행하면 시퀀스가 이어져
`src` 가 비고 CROSS JOIN 이 0행 — 5개 무결성 검증이 아무것도 평가하지 않는다.
**무결성이 실제로 깨져도 같은 0행**이라 거짓 음성 채널이다. 원본=최소 id /
사본=차순 id 로 파라미터화한 판정을 쓸 것(`m4-orch/o5-integrity-fixed.txt`).

### 남은 부채 (제품 결함 아님, progress.md 기록됨)

1. 복제 대상을 정하는 읽기가 `$transaction` **밖** — 쓰기 원자성만 덮인다(TOCTOU).
2. `$transaction` 타임아웃 미지정 — Prisma 기본 5초, 노드 많은 서브트리는 초과 가능.
3. `duplicateMenuItemAction` 이 UI 에 미배선 — 버튼은 tRPC 훅 직접 호출.
4. `createdCount` 가 트랜잭션 클로저 밖 변수.
5. (별건) `apps/web/lib/modules/registry.test.ts` B-101 — 실측 160~182초 vs 예산
   180초 경계선. 부하가 튀면 빨개져 "회귀인가" 의심 비용을 만든다.

### 인계 기록이 틀렸던 건 (M3)

이전 인계 노트는 AC-SITE-002/003 e2e 를 "실패 — 미해결" 로 남겼는데, 같은 세션
증적(`m3-fix/d1-m3-e2e.txt`, 23:56)은 2건 전부 통과였고 노트 작성이 1시간 뒤(01:07)였다.
재실행 3회 전부 통과 + 결함 주입(`toButtonPatch` 의 DbNull 변환 무력화)으로 보고된
실패를 동일 라인·동일 형태로 재현. 결론: **dev 서버가 수정 이전 번들을 들고 있던
상태에서만 나오는 실패**였고 소스에는 결함이 없었다. 전임 세션이 자기가 적어둔
함정(WSL2 inotify 미작동 → 재기동 필수)에 자기가 걸린 것.

### 환경 함정 (재발 방지)

- **dev 서버 staleness**: `/mnt/d`(drvfs)에서 inotify 가 안 떠 Turbopack 이 변경을
  놓친다. 구현 후 반드시 재기동하고, 로그에서 `Local: http://localhost:3000` 을 확인할 것.
  기존 서버가 살아 있으면 새 서버가 3001 로 밀린 뒤 `.next/dev/lock` 획득 실패로 죽고,
  그 상태로 테스트를 돌리면 **낡은 번들 서버를 측정**한다.
- **`next dev` 부모만 죽여선 포트가 안 풀린다** — `next-server (v16.0.0)` 자식이
  3000 을 계속 점유한다. 종료 후 `.next/dev/lock` 도 지울 것.
- **`pkill -f 'next dev'` 는 자기 자신을 죽인다**(패턴이 Bash 도구 커맨드라인에
  들어감, exit 144). 브래킷 회피: `'next[ ]dev'`.
- **stale `.git/index.lock` 상시 발생** — statusline 이 `git status --porcelain` 을
  반복 폴링해 경합한다. `fuser .git/index.lock` 로 실제 보유자 확인 후 제거, 커밋은
  재시도 루프로 감쌀 것.
- **vitest/playwright 출력은 `\r` 로 뭉친다** — `tr '\r' '\n'` 필요.
- **단위 테스트는 레포 루트 기준** — `apps/web` 에서 돌리면 "No test files found".
- **jsdom 스위트는 WSL2 에서 느리다** — environment 만 166초. hang 아님.

### 이번 세션 판단 오류 기록

1. `m4-develop` 의 autocompact 스래싱 알림(`idleReason: "failed"`)을 **종료로 오독**.
   실제로는 compact 후 5시간 반 계속 일했다. 그 오독으로 (a) 같은 파일군에 두 번째
   에이전트를 띄워 writer 경합을 만들고, (b) 살아 있는 트리에 `git checkout` 을 걸어
   그 에이전트의 UI 변경을 지웠다. 교훈: **유휴/실패 알림은 종료의 증거가 아니다** —
   살아 있는 writer 판정은 `ps -p <pid>` 실측으로 하고, 그 전에는 트리를 건드리지 않는다.
2. 두 번째 에이전트(m4a)가 경합을 감지해 진행을 거부한 판단이 내 것보다 정확했다.
   "그냥 진행" 선택지를 스스로 제외했다.
3. 첫 M4 위임이 컨텍스트 스래싱으로 죽었다 — SPEC 4종 통독 + 대형 소스 + 전체 스위트를
   한 에이전트에 몰아준 프롬프트가 원인. 재위임에서 범위를 쪼개고 SPEC 내용을 프롬프트에
   직접 박고 출력 리다이렉트를 의무화했다.
4. e2e 실패를 회차별로 비교해야 갈렸다 — run1 은 `browser has been closed`(환경),
   run5 는 `Expected 3 / Received 28`(로케이터 모호성). **앞의 것이 뒤의 것을 가리고
   있었다.** 형태 변화를 본 것이 진단을 결정했다.
