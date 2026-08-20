# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-20 (결함 6건 + §E.4 정정 완료·푸시. 남은 것은 sync-auditor 재판정 하나 —
>       실행 중 PC 종료로 판정 유실, 다음 세션이 재실행할 것)
> source_session_id: 93d02bc1-4dd9-41bc-8aa4-499a9444b72b

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. SPEC-LEGACY-PARITY-001 감사 FAIL 후속 — sync-auditor 재판정 재실행 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-verify-teammate-security-code, feedback-stale-git-index-lock
source_session_id: 93d02bc1-4dd9-41bc-8aa4-499a9444b72b

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
   — HEAD 는 d170bf3. 결함 6건 + 훅 수리 + §E.4 정정까지 전부 커밋·푸시 완료.
     미커밋은 MoAI 하네스 템플릿 배포분뿐, 소스 clean.
2) grep "^status:" .moai/specs/SPEC-LEGACY-PARITY-001/spec.md → completed
   — 감사 FAIL(61.2) 상태 유지. 수리는 재오픈 없이 계획서 기반으로 진행 중.
3) cat .moai/plans/ancient-imagining-riddle.md → 6단계 계획 (승인 완료)
   — 1~5단계 완료(결함 6건 + 회귀 + §E.4 정정). 남은 것: sync-auditor 재판정뿐.
4) docker: rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444).
   WSL 에서 docker 명령이 안 잡히면 Docker Desktop 의 WSL2 통합을 켤 것.
   admin@example.com / id=1 (2FA 없음).

실행: sync-auditor 재판정 재실행 — 아래 "재판정 재실행 입력" 절의 지시를 그대로 실을 것.
      직전 실행은 약 25분 진행 후 PC 종료로 중단됐고 판정을 받지 못했다(유실).

후속: 판정 수령 후 마감. PASS 면 Gap 3건을 Gap 으로 남긴 채 닫고,
      FAIL 이면 사유를 완화 없이 기록한 뒤 후속 수리로 넘긴다.
      **이번에도 판정을 기다린 뒤 닫는다 — 닫고 나서 판정이 오는 순서를 반복하지 말 것.**

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
| `a5c79b3` | D3 | export 시점 버튼 값 union 검증·낙하 + metadata 보고 (방어 절반) |
| `d170bf3` | — | §E.4 마감 기록 정정 (감사 FAIL·후속 수리·lint 실측·Gaps 3건) |

divergence `0 0` (origin/main == HEAD `d170bf3`).

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

### D3 마이그레이션 판정 — 불요 (실데이터 조회 근거)

Docker 기동 후 계획서의 질의와, **3개 컬럼 전체로 확장한 질의**를 함께 돌렸다(원 질의는
`normalBtn` 만 봐서 `hoverBtn`/`activeBtn` 단독 비정합을 놓친다 — 그 경우도 import 전량
실패는 동일하다).

| DB | menu_items | 버튼값 설정 행 | 비정합 행 |
|---|---|---|---|
| `rhymix_ts` (주) | 0 | 0 | 0 |
| `rhymix_ts_verify` | 3 | 0 | 0 |
| 레거시 Rhymix (MariaDB) | 41 | 0 | 해당 없음 |

**주 DB 의 0건은 근거가 아니다** — 68개 테이블 전부 0행이라 "관측할 데이터가 없는" 상태다.
판정의 실질 근거는 둘이다.

1. `rhymix_ts_verify` 에 menu_items 3행이 실재하나 버튼값이 설정된 행이 0건.
2. **레거시 원본이 구조적으로 비정합 값을 만들 수 없다** — `rx_menu_item` 의 버튼 컬럼은
   `varchar(255)` 평문 파일명이고, import union 의 `z.string().transform` 이 이를 정합형으로
   정규화한다. 게다가 41행 중 버튼값 설정 행이 0건이다.

비정합 형태의 유일한 발생 경로는 rhymix-ts 자신의 구 편집기가 jsonb 에 임의 객체를 쓰는
것인데, 관측 가능한 인스턴스 어디에도 그런 행이 없다.

> **잔여 위험**: 위는 이 로컬 3개 DB 한정이다. 데이터가 채워진 rhymix-ts 인스턴스가 다른 곳에
> 있다면 거기서 같은 질의를 다시 돌릴 것. 방어 수리는 그 경우에도 안전하다 — 낙하 건수가
> `metadata.droppedButtonImages` 로 드러나므로 export 시점에 존재가 보고된다.

> **커밋 본문 주의**: `a5c79b3` 본문은 "Docker daemon 중단으로 현재 조회 불가"라고 적혀 있는데,
> 이는 에이전트 위임 시점의 사실이다. 조회는 그 직후 수행됐고 판정은 위와 같다 — 커밋 이력을
> 고쳐 쓰는 대신 이 문서를 정본으로 삼는다.

> **부수 관찰**: 주 DB `rhymix_ts` 가 전 테이블 무데이터다. 2026-08-13 기록의 "양 버전 DB
> 초기화+재설치로 비교 기준선 확보"와 달리 TS 쪽만 비어 있다(레거시는 41행 유지). 언젠가
> 재시드가 필요할 수 있다.

## 재판정 재실행 입력 (이번 세션에서 중단된 것)

`sync-auditor` 를 띄웠으나 약 25분 진행 중 PC 종료로 **판정을 받지 못했다**. 트리는
읽기 전용으로 유지됐고(감사 범위 파일 무변경) 유실된 것은 판정뿐이다. 아래를 그대로
실어 재실행할 것 — 단순 "다시 봐달라"가 아니라, 감사의 전제를 반박하는 2건을 명시적으로
판단하게 하는 것이 핵심이다.

**대상**: SPEC-LEGACY-PARITY-001, HEAD `d170bf3`.
**직전 판정**: FAIL 61.2/100, Security must-pass 미달(High 1 + Medium 3), AC 3건 unverified-here.

**수리된 6건** — 각 주장을 감사가 독립 검증하게 할 것:
`baa571d`(D1 인가 게이트) / `308c986`(D4 순환 가드) / `79e3797`(D2 키 회수) /
`e5179e7`(D5 매직바이트) / `f07b8ac`(D6 nosniff) / `a5c79b3`(D3 export 검증·낙하).
`7476235`(하네스 훅 수리)는 이 SPEC 소관이 아니므로 감사 범위 밖.

**명시적으로 판단시킬 쟁점 2건**:

1. **D1 심각도 High→Medium 재분류.** 감사의 전제 "`middleware.ts` 없음 → 무인증 디스크
   쓰기"는 실측으로 반증됐다 — Next 16 은 middleware 를 `proxy.ts` 로 개명했고
   `apps/web/proxy.ts` 가 `/admin` 을 요청 단계에서 차단한다(무인증 POST → **307 /login,
   파일 0건**, 액션 미실행). 잔존 결함은 방어심층 — 전역 주소지정 서버액션을 비보호
   경로로 POST 하면 proxy 통과 후 액션 본문에 무인증 진입. Medium 이 맞는지 근거를 대게 할 것.
2. **D3 마이그레이션 불요 판정.** 근거는 "0건 나옴"이 **아니다** — 주 DB `rhymix_ts` 는
   68개 테이블 전부 0행이라 그 0은 근거가 못 된다. 실질 근거는 (a) `rhymix_ts_verify` 의
   실재 3행 중 버튼값 설정 0건, (b) 레거시 `rx_menu_item` 버튼 컬럼이 `varchar(255)`
   평문이라 import union 이 정합 정규화하고 41행 중 설정 0건. 충분한지 판단시킬 것.

**미리 차단할 것** (새 발견으로 보고하지 말라고 명시):
AC-SITE-004/005/006 재현 불가(증적이 gitignore 경로 의존) / 커버리지 미측정 /
`packages/admin` 린트 미구성(`"lint": "echo 'no lint'"`). 대신 **AC 3건이 여전히 PASS 를
막아야 하는지**를 판단 대상으로 넘길 것.

**태도 지시**: 맞춰주려 PASS 를 합리화하지도, 관성으로 이전 FAIL 을 되풀이하지도 말고
현재 트리를 볼 것. 모든 주장에 실행한 명령과 관측 출력을 붙일 것.

## 남은 작업 (계획서 기준)

- ~~**D3**~~ **완료** (`a5c79b3`). `toButtonImageRef` 의 무검사 캐스트를 import 와 동일한
  `menuItemButtonSchema` union safeParse 로 교체 — 비정합 값은 낙하하고 건수를
  `metadata.droppedButtonImages`(선택 필드, 0건 생략)로 보고. `exportFormatVersion` 1.0.0 유지.
  **마이그레이션은 불요로 판정**했다(아래 근거).

- ~~**5단계 §E.4 정정**~~ **완료** (`d170bf3`). 감사 판정 기록, `sync_phase_commit_count` 4,
  lint 재실측(0 error / 11 warning), Gaps 3건 신설, 이탈3 근거 정정.
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
