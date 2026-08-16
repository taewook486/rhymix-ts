# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-16 (SPEC-LEGACY-PARITY-001 M2 완료 + M3 커밋, e2e 1건 미해결)
> source_session_id: 5e8ab9ae-7388-43d9-bddd-74279009edbd

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. SPEC-LEGACY-PARITY-001 run-phase M3 마감부터 진행.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-mocks-and-casts-hide-real-shape, feedback-flaky-failures-need-repeated-runs
source_session_id: 5e8ab9ae-7388-43d9-bddd-74279009edbd

전제 검증:
1) docker.exe ps → rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444) 3개 Up
   — 3종 다 죽어 있으면 Docker Desktop부터 기동, rhymix-ts-db는 별도 start 필요
2) git log --oneline -1 → b39e949, main == origin/main
3) dev 서버 예열: pnpm dev 후 /api/health 200 확인 (WSL2 콜드 컴파일 약 114초)
4) CI_E2E=1 pnpm test:e2e --grep "SPEC-LEGACY-PARITY-001 M2" → 3 passed (회귀 가드)

실행: M3 잔여 e2e 1건 진단 — AC-SITE-002/003 제거 단계 실패
(menu-button-image.spec.ts:190 removeNormalBtn 체크 후 DB 술어 false)

후속: M3 마감 → M4(복제+수명주기) → /moai sync → 002 회원 → 003 콘텐츠

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-16)

### 완료

- **M2 승계 3동작 특성화** (`c3037dd`) — AC-SITE-004/005/006, e2e 3종 GREEN.
  고의 결함 주입 3건으로 공허 통과 아님을 확인.
- **M3 버튼 이미지 전체 범위** (`f9f9c3e`, `b39e949`) — 17파일, +1692/-104.
  업로드 3종 + 상태별 제거 + 공개 렌더링 + 저장 형태 정합화(6개 호출처).

### 오케스트레이터 독립 검증 결과

| 검증 | 결과 |
|---|---|
| 단위 5묶음 (t1~t5) | 34 passed |
| M2 특성화 e2e (회귀 가드) | **3 passed** — 렌더러 +140줄 변경에도 회귀 없음 |
| M3 e2e AC-SITE-010 | **통과** (hover/normal opacity 전환 수정 후) |
| M3 e2e AC-SITE-002/003 | **실패 — 미해결** |

증적: `.moai/state/verify/m3/` (RED 21건), `.moai/state/verify/m3-orch/`,
`.moai/state/verify/m3-fix/`

### 미해결 1건 — 다음 세션 첫 작업

`apps/web/e2e/menu-button-image.spec.ts:190` 제거 단계.
`removeNormalBtn` 체크 → 저장 후 DB 술어
`("normalBtn" IS NULL) AND hoverBtn/activeBtn 이미지 유지`가 30초 폴링에도 false.

**배제된 가설**: 서버 액션의 `Prisma.DbNull` 누락.
`actions.ts`는 Prisma를 직접 호출하지 않고 `caller.admin.menuItem.update`(tRPC)에
위임하며, `menu-item.ts:60`이 이미 `Prisma.DbNull` 변환을 갖고 있다.
라우터 단위 실측(일회성 DB 프로브)으로 3종 격리가 전부 PASS 확인됨(`b39e949`).

**남은 조사 방향**:
1. 복합 술어 3항 중 어느 항이 false인지 분리 (제거가 나머지 2종을 함께 지우는지)
2. 편집기 체크박스 `disabled={!previewUrl}` — 재진입 시 활성화 타이밍
3. 폼 → 서버 액션 경계에서 `removeNormalBtn`이 실제 전달되는지 (FormData 실측)

### 환경 함정 (재발 방지)

- **dev 서버 staleness**: WSL2 `/mnt/d`에서 inotify가 안 먹어 Turbopack이 파일 변경을
  놓친다. 구현 후 서버를 반드시 재기동할 것. 낡은 번들이 실패 원인을 통째로 가린다.
- **콜드 컴파일 114초** > `webServer.timeout` 90초. 사전 예열 필요.
- **vitest 출력은 `\r`로 뭉친다** — `tr '\r' '\n'`으로 펼쳐야 결과가 보인다.
- **단위 테스트 경로는 레포 루트 기준** — `apps/web`에서 돌리면 "No test files found".
- **프로세스 grep 오탐**: `grep -i playwright`가 pnpm 스토어 경로
  (`@playwright+test@1.59.1`)를 잡는다.

### 이번 세션 판단 오류 기록

1. `grep -i playwright` 오탐으로 "러너 정지" 오판 → 실제로는 진행 중
2. vitest `\r` 뭉침을 "빈 증적"으로 오판 → 실제로는 정상 기록
3. 낡은 번들 확인 후 "실패 전부 환경 문제"로 성급히 확정 → 그 아래 진짜 결함
   (hover/normal opacity) 1건이 숨어 있었음. 재실행으로 **실패 형태 변화**를 본 것이
   갈랐다.
4. `actions.ts`의 `Prisma.DbNull` 누락을 결함으로 진단 → 위임 경로라 오진

공통 교훈: 환경 요인 하나로 모든 실패가 설명된다고 닫지 말 것. 조건을 바꿔 재실행하고
실패 형태가 바뀌는지 볼 것.
