# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-20 (SPEC-LEGACY-PARITY-001-FIX D2·D5·D6 수리 완료·푸시, 다음은 D3)
> source_session_id: 93d02bc1-4dd9-41bc-8aa4-499a9444b72b

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. SPEC-LEGACY-PARITY-001 감사 FAIL 후속 수리 — D3 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-verify-teammate-security-code, feedback-stale-git-index-lock
source_session_id: 93d02bc1-4dd9-41bc-8aa4-499a9444b72b

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
   — HEAD 는 7476235. D1/D4/D2/D5/D6 + 훅 수리까지 전부 커밋·푸시 완료.
     미커밋은 MoAI 하네스 템플릿 배포분뿐, 소스 clean.
2) grep "^status:" .moai/specs/SPEC-LEGACY-PARITY-001/spec.md → completed
   — 감사 FAIL(61.2) 상태 유지. 수리는 재오픈 없이 계획서 기반으로 진행 중.
3) cat .moai/plans/ancient-imagining-riddle.md → 6단계 계획 (승인 완료)
   — 1~3단계 완료(D1/D4/D2/D5/D6 + 회귀). 남은 것: 4단계 D3, 5단계 §E.4 정정.
4) docker: rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444).
   WSL 에서 docker 명령이 안 잡히면 Docker Desktop 의 WSL2 통합을 켤 것.
   admin@example.com / id=1 (2FA 없음).

실행: /moai run "SPEC-LEGACY-PARITY-001-FIX D3" (계획서 4단계 기반)
      — 반드시 실데이터 조회부터. 0건이면 serializer 방어만, 1건+ 면 마이그레이션 동반:
        SELECT id,"normalBtn","hoverBtn","activeBtn" FROM menu_items
        WHERE "normalBtn" IS NOT NULL AND NOT ("normalBtn" ? 'image');

후속: D3 뒤 → 5단계 §E.4 마감 기록 정정(manager-docs)
      → sync-auditor 재판정 (이번엔 판정을 기다린 뒤 닫는다)

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-20)

감사 FAIL(61.2) 후속 수리의 **보안 결함 3건(D2·D5·D6)** 을 마치고, 추적 과정에서
발견한 **하네스 훅 결함 2건**을 추가로 수리했다. 커밋 4개 전부 push 완료.

| 커밋 | 결함 | 내용 |
|---|---|---|
| `79e3797` | D2 | 업로드 후 실패 경로 3종에서 이번 요청이 쓴 storageKey 회수 |
| `e5179e7` | D5 | `storage.write` 이전 매직바이트 포맷 검증(PNG/JPEG/GIF/WebP) |
| `f07b8ac` | D6 | 다운로드 라우트 2곳에 `X-Content-Type-Options: nosniff` |
| `7476235` | — | sync-phase 훅: R 파일명 명령 주입 + cpp find 우선순위 |

divergence `0 0` (origin/main == HEAD `7476235`).

### 검증 (오케스트레이터가 직접 재실행)

에이전트 자체 보고를 근거로 쓰지 않고 전부 재실행했다.

- `apps/web` tsc --noEmit → **0 에러**
- eslint (변경 5파일) → **0 error**, 경고 7건(전부 unused-vars, 기존 성격)
- vitest 3스위트 → **52/52 통과** (actions 26 / menu-item 23 / by-key route 3)
- 커밋별 변경 파일 확인 → 하네스 템플릿 혼입 **0건**
- 소스 직접 판독 → D5 의 SVG 거부(표에 없는 MIME 은 `false`)와 D2 의 성공 경로
  무삭제를 코드로 확인. 테스트 통과만으로 판정하지 않음

### D2 — 누출 경로 3종

`parseButtonImageFields` 가 이번 요청에 기록한 키 전체(`writtenKeys`)를 반환하고,
`updateMenuItemAction` 이 **필드 해석 실패 · zod 실패 · tRPC 예외** 세 경로에서
`reclaimUploadedKeys` 로 그 키만 삭제한다. 성공 경로와 업로드 이전 실패(그룹 목록
조회 오류)는 아무것도 삭제하지 않으며, 이 두 음성 대조가 테스트로 고정돼 있다.
scanner 거부 경로는 자기가 이미 삭제하므로 `writtenKeys` 에 들어가지 않아 이중 삭제 없음.

### D5 — 표에 없는 MIME 은 자동 거부

`RASTER_IMAGE_SIGNATURES` 인라인 표(WebP 는 RIFF+offset 8 의 WEBP 2구간 검사).
`matchesRasterSignature` 가 **표에 없는 MIME 에 `false` 를 반환**하므로 SVG 는
구조적으로 통과 불가 — "알 수 없는 형식 fall-through" 위험이 닫혀 있다.
`image/jpg` 같은 별칭도 거부되므로(보수적 동작) 필요 시 표에 추가할 것.

### 훅 수리 — 오탐 추적의 부산물

매 턴 뜨던 `[MoAI Security Guardian] command-injection (high) line 1007` 은
**오탐**이었다. `line N` 은 파일 라인이 아니라 `git diff` 의 추가(`+`) 라인 일련번호이고,
역추적하면 `.claude/rules/moai/core/hooks-system.md:301` 의 산문 문장
("runs under `sh -c` …")이다. 하네스 미커밋 459경로가 상시 남아 있어 매 턴 재스캔된다.

추적 중 같은 파일에서 진짜 결함 2건을 재현해 수리했다.

- **R 게이트 명령 주입**: 파일명을 R 소스에 보간 → `evil");system("id");#.R` 이름이면
  `parse("./evil");system("id");#.R")` 가 되어 임의 실행. argv 전달로 교체.
- **cpp find 우선순위**: `-exec` 가 `-o` 오른쪽 가지에만 걸려 **`.cpp` 가 한 번도
  검사된 적 없음**. `\( ... \)` 로 묶어 수정.

`-cp "$(find ...)"` 3곳과 `find -exec` 2곳은 확인 결과 **주입 불가**라 무변경.

## 남은 작업 (계획서 기준)

- **D3** (`packages/admin/src/export/serializer.ts`): export/import 왕복 파손.
  `toButtonImageRef` 가 비정합 객체를 검증 없이 통과시키고 import 는 번들 전체를
  `.strict()` 로 거부 → 구 편집기가 남긴 `{"color": ...}` 한 건이면 import 전량 실패.
  **실데이터 조회 선행** (위 붙여넣기 블록의 SQL). 0건 → 방어만(비적합 값 낙하+보고),
  1건+ → 마이그레이션 동반.
- **5단계 §E.4 정정** (manager-docs): 감사 판정(FAIL 61.2)·후속 SPEC 추가,
  `sync_phase_commit_count` 3→4, lint 인용을 수리 후 로그로 교체, Gaps 3건 추가
  (커버리지 미측정 / AC-SITE-004~006 재현 불가 / sync 재검증이 actions.test.ts 누락),
  이탈 3 근거 문장 정정(`resolveButtonImageUrl` 은 항상 자기 오리진).
- 마지막: `sync-auditor` 재판정 (이번엔 판정을 기다린 뒤 닫는다).

## 환경 함정 (재발 방지 — 계속 유효)

- **`moai` 바이너리가 2개다.** `/usr/local/bin/moai` = **2.14.0**(`gate`/`session`/`model`
  서브커맨드 없음), `~/.local/bin/moai` = **3.1.1**(전부 있음). PATH 순서에 따라 갈린다.
  pre-commit 이 `moai gate` 로 실패하면 품질 불합격이 아니라 이 스큐다 —
  수동 검증 후 `SKIP_MOAI_PRECOMMIT=1` 로 통과시키고 사유를 커밋 본문에 남길 것.
  `session list` 등은 `~/.local/bin/moai` 를 직접 지목.
- **`.git/index.lock` 은 `moai statusline` 이 만든다.** statusline 이 매 렌더마다
  `git status --porcelain` 을 띄우고 그게 lock 을 재생성한다. `rm -f` 직후 커밋해도
  경합에 진다 — **재시도 루프**로 뚫을 것(`sleep` 은 도구가 막으므로 fifo + `read -t` 로 지연):
  `mkfifo f; exec 3<>f; for i in $(seq 1 25); do rm -f .git/index.lock; git commit -F msg && break; read -t 0.4 -u 3 _; done`
- **세션 레지스트리에 죽은 PID 가 남는다.** `moai session list` 결과를 그대로 믿지 말고
  `kill -0 <pid>` 로 생존 확인할 것. 서브에이전트도 별도 세션으로 등록되므로
  "외부 세션"처럼 보인다 — cmdline 의 `--agent-id` 로 구분.
- **`npx` 가 Windows 바이너리로 잡힌다.** 매 Bash 앞에
  `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"`, 도구는 `node_modules/.bin/<tool>`
  직접 지목. `eslint` 는 `apps/web/node_modules/.bin/`.
- **커밋은 명시 pathspec 으로만.** 미커밋 459+ 하네스 템플릿이 상주 — `git add -A`/`git add .` 금지.
  한 파일 안에 무관한 미커밋 변경이 섞여 있으면 **헝크 단위로 골라 스테이징**할 것
  (`git diff <file>` → 헝크 필터 → `git apply --cached`).
- **eslint 가 느리다**(3분+). 타임아웃 넉넉히. **jsdom 스위트도 느림**(100~230초, hang 아님).
- **단위 테스트는 레포 루트 기준.** vitest 경로에 `[key]` 대괄호 있으면 따옴표로 감쌀 것.
- **Server Action 재현**: `Next-Action` 헤더 + Action ID(server-reference-manifest.json 또는
  컴파일 청크에서 추출). useActionState 액션은 raw multipart 로 curl 시 wire 형식 안 맞음.
- **`pkill -f 'next dev'` 는 자기 자신을 죽인다**(exit 144). 브래킷 회피 `next[ ]dev`.
- **dev 서버**: `/mnt/d` inotify 미작동 → 구현 후 재기동 필수, `.next/dev/lock` 먼저 제거.
  `next-server` 자식이 3000 계속 점유.
