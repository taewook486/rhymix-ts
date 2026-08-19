# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-20 (SPEC-LEGACY-PARITY-001-FIX D1·D4 수리 완료·푸시, D2/D5/D6 착수 전)
> source_session_id: 4de27f96-ca02-46fd-b04e-eed8f9f1b8d3

## 붙여넣을 메시지

```text
✂──── 여기부터 복사 ────✂

ultrathink. SPEC-LEGACY-PARITY-001 감사 FAIL 후속 수리 — D2/D5/D6 진입.
applied lessons: feedback-agent-test-claims-verify-by-rerun,
feedback-shared-helper-refactor-grep-mocks, feedback-verify-teammate-security-code
source_session_id: 4de27f96-ca02-46fd-b04e-eed8f9f1b8d3

전제 검증:
1) git rev-list --count --left-right origin/main...HEAD → 0 0
   — HEAD 는 308c986(D4). D1(baa571d)·D4(308c986) 커밋+푸시 완료.
     미커밋은 MoAI 하네스 템플릿 배포분뿐, 소스 clean.
2) grep "^status:" .moai/specs/SPEC-LEGACY-PARITY-001/spec.md → completed
   — 감사 FAIL(61.2) 상태 유지. 수리는 재오픈 없이 진행 중(계획서 접근).
3) cat .moai/plans/ancient-imagining-riddle.md → 6단계 계획 (승인 완료)
   — 1단계(D1 재현)·2단계 중 D1/D4 완료. 남은 것: D2/D5/D6, D3, 5단계 §E.4 정정.
4) docker: rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444) — 죽어 있으면
   Docker Desktop 기동, rhymix-ts-db 별도 start. admin@example.com/id=1(2FA 없음).
   dev 서버: apps/web 에서 node_modules/.bin/next dev --turbopack, .next/dev/lock 먼저 제거.

실행: /moai run "SPEC-LEGACY-PARITY-001-FIX D2/D5/D6" (계획서 2단계 기반)
      — D2 업로드 실패 시 storageKey 회수 / D5 매직바이트 포맷 검사 /
        D6 by-key download nosniff 헤더. actions.ts + download route.

후속: D2/D5/D6 뒤 → D3(export/import, 실데이터 SQL 조회 후 마이그레이션 여부 판단)
      → 5단계 §E.4 마감 기록 정정(manager-docs) → sync-auditor 재판정(이번엔 기다림)

✂──── 여기까지 복사 ────✂
```

## 이번 세션 결과 (2026-08-19~20)

감사 FAIL(61.2) 후속 수리에 착수해 **보안 결함 2건(D1·D4)을 수리·검증·푸시**했다.
전부 오케스트레이터가 에이전트 자체 보고를 신뢰하지 않고 직접 재실행으로 검증한 뒤 커밋.

| 커밋 | 결함 | 내용 |
|---|---|---|
| `baa571d` | D1 | 메뉴 Server Action 6종 진입부 인가 게이트(`denyIfNotAdmin`) |
| `308c986` | D4 | 메뉴 트리 순환 가드 — reorder 거부(근본)+copySubtree/buildMenuTree 재귀 가드 |

divergence `0 0`(origin/main == HEAD 308c986).

### D1 — 감사 전제가 실측으로 반증됨 (심각도 재분류)

감사는 "`middleware.ts` 없음 → 무인증 디스크 쓰기(High)"라 판정했으나, **런타임 재현으로
반증**했다. Next 16 은 middleware 를 `proxy.ts`로 개명했고, `apps/web/proxy.ts`가
`protectedRoutes`(`/admin` 등)를 요청 단계에서 차단한다 — 무인증 POST `/admin/menu/1`
→ **307 /login, 파일 0건**(액션 실행 전 차단). 즉 primary 경로는 이미 게이트됨.

다만 (1) 액션 자체 진입부 인증 부재는 소스로 확인, (2) 비보호 경로 `/` 로 동일 액션을
POST 하면 proxy 통과 후 **액션이 무인증으로 실행 진입**함을 확인(React Flight 스트림).
전역 주소지정 서버액션의 인가를 proxy 경로목록에만 의존하는 방어심층 결함.
→ **High→Medium 재분류**, 수리는 진행(진입부 `isAdminSession` 6종). 회귀 7건, 15/15.

> 미검증: 비보호 경로 경유 완전한 파일 쓰기 재현(curl 이 React 서버액션 wire 형식과
> 안 맞아 `Connection closed`)과 관리자 세션 교정 대조는 미실시. 단위 증명은 확고.

### D4 — copySubtree 는 실제 재현, buildMenuTree 는 방어적 커버

- **copySubtree 무한 재귀 실제 재현**(테스트에서 runaway cap 발동) — 진짜 벡터.
- **buildMenuTree 무한 재귀는 재현 못 함** — 단일 `parentId` 불변식상 null-root 도달
  가능한 순수 순환이 성립 불가(고아화). 깊이 상한(100)은 방어심층으로만 추가, 테스트도
  무한재귀가 아니라 깊이 상한만 검증. 이 한계는 커밋 메시지에 명시.
- 근본 원인 `reorder`: proposedParent 그래프에서 부모 사슬 순환 판정 → BAD_REQUEST(쓰기 전).
  회귀 7건, 31/31.

## 남은 작업 (계획서 기준)

- **D2** (`actions.ts`): 업로드 후 실패 경로(부분 실패·zod 실패·tRPC 예외)에서 이번 요청이
  쓴 storageKey 회수. `uploadButtonImage` 의 scanner-reject 경로가 이미 `storage.delete`
  패턴 사용 — 그 형태 재사용. `parseButtonImageFields` 가 쓴 키를 반환하게 하고
  `updateMenuItemAction` 이 실패 시 삭제. **성공 경로는 삭제 금지.**
- **D5** (`actions.ts` `uploadButtonImage`): `storage.write`(현재 ~161행) 이전에 버퍼 선두
  바이트로 실제 포맷 판정(PNG 89 50 4E 47 / JPEG FF D8 FF / GIF "GIF8" / WebP "RIFF"..."WEBP").
  선언 MIME 과 불일치 시 거부. **SVG(스크립트 내포 가능)는 raster 게이트 통과 금지.**
  file-type/sharp dep 없음 → 최소 인라인 시그니처 검사(신규 dep 금지).
- **D6** (`apps/web/app/api/files/by-key/[key]/download/route.ts` ~29행): 응답에
  `X-Content-Type-Options: nosniff` 추가. sibling `[id]/download/route.ts` 도 선택적 동일 추가.
  by-key route 테스트는 없으므로 신규 생성.
- **D3** (`packages/admin/src/export/serializer.ts`): export/import 왕복 파손. 실데이터 조회 선행 —
  `SELECT id,"normalBtn","hoverBtn","activeBtn" FROM menu_items WHERE "normalBtn" IS NOT NULL AND NOT ("normalBtn" ? 'image');`
  0건 → 방어만(비적합 값 낙하+보고), 1건+ → 마이그레이션 동반.
- **5단계 §E.4 정정** (manager-docs): 감사 판정(FAIL 61.2)·후속 SPEC 추가, `sync_phase_commit_count`
  3→실제값, lint 인용을 수리 후 로그로 교체, 커버리지 미측정(임계 85% UNVERIFIED) Gaps 추가.
- 마지막: `sync-auditor` 재판정 (이번엔 판정을 기다린 뒤 닫는다).

> **D2/D5/D6 위임 상태**: 이 세션에서 manager-develop 에 D2/D5/D6 을 위임했으나 세션 종료로
> **반환 전 중단**됐다. primary checkout 에 변경이 하나도 안 남았으니(git status clean) 다음
> 세션은 처음부터 다시 위임하면 된다 — 중간 산출물 없음.

## 환경 함정 (재발 방지 — 계속 유효)

- **`npx` 가 Windows 바이너리로 잡힌다.** 매 Bash 앞에
  `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"`, 도구는 `node_modules/.bin/<tool>`
  직접 지목. `eslint` 는 `apps/web/node_modules/.bin/`.
- **커밋은 명시 pathspec 으로만.** 미커밋 459+ 하네스 템플릿이 상주 — `git add -A`/`git add .` 금지.
- **stale `.git/index.lock` 상시 발생** + statusline 폴링 경합. `ps` 로 쓰기 git 프로세스 부재 확인
  후 나이 120초 초과면 제거. 커밋은 `rm -f .git/index.lock` + add + commit 을 한 호출로 묶어 재시도.
- **eslint 가 느리다**(3분+). 타임아웃 넉넉히. **jsdom 스위트도 느림**(100~230초, hang 아님).
- **단위 테스트는 레포 루트 기준.** vitest 경로에 `[key]` 대괄호 있으면 따옴표로 감싸 글롭 방지.
- **Server Action 재현**: `Next-Action` 헤더 + Action ID(server-reference-manifest.json 또는
  컴파일 청크에서 추출). useActionState 액션은 raw multipart 로 curl 시 wire 형식 안 맞음.
- **`pkill -f 'next dev'` 는 자기 자신을 죽인다**(exit 144). 브래킷 회피 `next[ ]dev`.
- **dev 서버**: `/mnt/d` inotify 미작동 → 구현 후 재기동 필수, `.next/dev/lock` 먼저 제거.
  `next-server` 자식이 3000 계속 점유.
