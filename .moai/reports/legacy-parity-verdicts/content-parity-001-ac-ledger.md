# SPEC-CONTENT-PARITY-001 AC 원장 (003 흡수 입력)

- 작성: moai3 (보조 세션), 읽기 전용 대조
- 기준: `acceptance.md` 의 AC 번호(001~016) 를 정본으로 삼는다. `progress.md` 의 판정은 내용(제목) 기준으로 대응시켰다.
- 수행하지 않은 것: 저장소 파일 수정, git 쓰기, 전체 테스트·빌드
- 참고: `lgp-003-content.md` §2.2 가 같은 불일치(AC-CPAR-006 중복, AC-CPAR-014 단독 행 없음, §E.3 집계)를 이미 지적했다. 이 원장은 줄 단위 근거와 정확한 집계를 덧붙인다.

## 1. AC 전수 표 (acceptance 번호 기준)

판정 값은 `progress.md` 에 실제로 적힌 것이다. "미기록" 은 같은 번호로 판정이 적히지 않았다는 뜻이다.

| AC 번호 | 내용 (한 줄) | progress 판정 | progress 번호가 acceptance 와 다른가 | 근거 줄 (acceptance / progress) |
|---|---|---|---|---|
| AC-CPAR-001 | 사이드바 '콘텐츠' 섹션 구성 (파일·휴지통·스팸필터 링크, 레거시 순서) | PASS | 아니오 | acc L10 / prog L20 |
| AC-CPAR-002 | 스팸필터 공통 내비게이션 (6화면 상호 이동, 검토 큐 포함) | PASS | 아니오 | acc L20 / prog L21 |
| AC-CPAR-003 | 휴지통 목록 + 전체/문서/댓글 타입 필터 | PASS | 아니오 | acc L29 / prog L27 |
| AC-CPAR-004 | 휴지통 복원 영속 (새로고침 후 유지, AuditLog) | **미기록 (번호 004 행은 다른 내용)** — 복원 내용은 번호 005 행에 PASS-WITH-DEBT | **예** | acc L36 / prog L28(004 = '타입 필터 While/When', PASS), L29(005 = '복원 영속', PASS-WITH-DEBT) |
| AC-CPAR-005 | 개별 영구 삭제 + 비우기 (확인 다이얼로그, 댓글 purge FK 격리 DB 검증) | PASS-WITH-DEBT — 번호 006 행에 기록 | **예** | acc L43 / prog L30(006 = '개별 영구 삭제 + 비우기', PASS-WITH-DEBT) |
| AC-CPAR-006 | 문서 필터 배선 (게시판·상태·검색, URL 파라미터, 북마크 가능) | PASS — 단 같은 번호 006 이 prog L30 의 영구 삭제 행에도 쓰였다 | **번호 충돌** (006 이 두 내용에 사용) | acc L54 / prog L36(PASS), L30(영구 삭제에 006 사용) |
| AC-CPAR-007 | 문서 일괄 작업 영속 (휴지통 이동, 선택 0건 안내) | PASS-WITH-DEBT | 아니오 | acc L63 / prog L37 |
| AC-CPAR-008 | TEMP 복구·삭제 + 페이지네이션 + IP 필터 + 신고 링크 | PASS-WITH-DEBT | 아니오 | acc L71 / prog L38 |
| AC-CPAR-009 | 댓글 필터 + 공개/비밀 상태 필터 (`isSecret`) | PASS | 아니오 | acc L81 / prog L39 |
| AC-CPAR-010 | 댓글 일괄 삭제 영속 (AuditLog, 더 보기, 신고 링크) | PASS-WITH-DEBT | 아니오 | acc L87 / prog L40 |
| AC-CPAR-011 | 파일 검색·타입 필터·정렬 (방향 토글) | PASS-WITH-DEBT | 아니오 | acc L96 / prog L60 |
| AC-CPAR-012 | 파일 일괄 삭제 영속 (cascade, AuditLog) | PASS-WITH-DEBT | 아니오 | acc L102 / prog L61 |
| AC-CPAR-013 | 모듈 편집 dead link 해소 (`/admin/modules/[id]/edit`, 제목 저장 유지) | PASS | 아니오 | acc L111 / prog L67 |
| AC-CPAR-014 | per-board 링크 (분류·확장변수·권한·피드, page 타입엔 미노출) | **PASS 이나 번호 013 으로 기록** — 번호 014 의 판정 행은 없다 | **예** | acc L118 / prog L68 (제목은 'AC-CPAR-013 per-board 링크 노출') |
| AC-CPAR-015 | 전역 알림 게이트 + 영속 + 개인 설정 우선 + AdminLog | PASS (행 3개: 게이트, 설정 UI, AdminLog) | 아니오 | acc L127 / prog L76, L77, L78 |
| AC-CPAR-016 | 메일 발송 기록(성공·실패) + 관리자 목록 + 영속 | PASS | 아니오 | acc L138 / prog L86 |

### 1-A. 번호 기준 집계 (16 AC 전부 한 번씩 세었다)

| 판정 (내용 기준) | 개수 | AC 번호 |
|---|---:|---|
| PASS | 9 | 001, 002, 003, 006, 009, 013, 014, 015, 016 |
| PASS-WITH-DEBT | 7 | 004, 005, 007, 008, 010, 011, 012 |
| 미기록 (번호 기준) | 0 | (004·005·014 는 다른 번호 행에 판정이 있어 '내용 기준'으로는 기록됨) |
| 합계 | 16 | |

주의: AC-CPAR-004 와 005 의 PASS-WITH-DEBT 는 progress 의 **005·006 번호** 행에 적혀 있다. 003 이 이 목록을 그대로 쓰면 번호 밀림이 생긴다. 아래 2절의 정정 매핑을 따른다.

## 2. 번호 불일치 목록 (정정 매핑)

| progress 번호 (현재 표기) | progress 내용 | 올바른 acceptance 번호 | 줄 |
|---|---|---|---|
| AC-CPAR-004 | 타입 필터 While/When | **acceptance 에 없는 항목** (REQ-CPAR-004 의 While 절을 가리키는 것으로 보임). acceptance 004 는 '복원 영속' | prog L28 |
| AC-CPAR-005 | 복원 영속 | **AC-CPAR-004** | prog L29 |
| AC-CPAR-006 (첫 번째) | 개별 영구 삭제 + 비우기 | **AC-CPAR-005** | prog L30 |
| AC-CPAR-006 (두 번째) | 문서 필터 배선 | AC-CPAR-006 (정상) | prog L36 |
| AC-CPAR-013 (두 번째, per-board) | per-board 링크 노출 | **AC-CPAR-014** | prog L68 |

위 표의 결과: progress 의 번호 체계는 group B 에서 acceptance 보다 한 칸 앞서 있고, 003 이 흡수할 때 현재 번호를 그대로 쓰면 틀린다.

## 3. §E.3 집계 대조

`progress.md` §E.3 (L92~L108) 의 값과 실제 나열을 대조했다.

| 필드 | 기록된 값 | 기록된 나열 | 실제 나열 수 | 판정 |
|---|---:|---|---|---|
| `ac_pass_count` (L96) | **11** | `AC-CPAR-001,002,003,004(M1/M2) + AC-CPAR-006,009(M3) + AC-CPAR-013(M5) + AC-CPAR-015(M6) + AC-CPAR-016(M7)` | **9 개 번호** (001,002,003,004,006,009,013,015,016). PASS 행 자체는 12개(013 두 행, 015 세 행). 어떤 세기 방식으로도 11 이 되지 않음 | **불일치** |
| `ac_pass_with_debt_count` (L97) | **7** | `AC-CPAR-005,006(M2 FK) + 007,008,010(M3) + 011,012(M4)` | 7 개 번호 (005,006,007,008,010,011,012) — 개수는 맞으나 005·006 은 progress 번호이고 acceptance 로는 004·005 | **개수는 맞고 번호는 틀림** |
| 같은 번호가 두 목록에 중복 | — | 006 이 `ac_pass_count` 와 `ac_pass_with_debt_count` 양쪽에 있음 (필터 배선 PASS, 영구 삭제 WITH-DEBT) | — | 번호 충돌의 결과 |

재계산 (acceptance 번호 기준, 내용 판정 그대로):
- `ac_pass_count` 올바른 값: **9** (001, 002, 003, 006, 009, 013, 014, 015, 016)
- `ac_pass_with_debt_count` 올바른 값: **7** (004, 005, 007, 008, 010, 011, 012)
- 합 16 = 전체 AC 수. 누락 없음, 중복 없음.

추가 불일치 (같은 파일 안):
- **§E.2 헤더 L14 "부분 진행 — M1~M3 완료. M4~M7 은 미착수"** 는 §E.3 (L93 "M1~M7 전체 완료", L95 `run_status: complete`) 과 충돌한다. §E.2 헤더가 갱신되지 않았다.
- **§E.4 (L112) `_<pending sync-phase>_`**: sync 단계가 마감되지 않았다. 003 흡수 전 이 상태를 명시해야 한다.
- **Definition of Done (acceptance L158~L166)**: `[ ] REQ-CPAR-001~030 전체 AC PASS` 체크박스가 비어 있다. DoD 의 "런타임 영속 기준 실화면 재현" 항목(L161)도 미체크다. PASS-WITH-DEBT 7건이 이 항목에 걸린다.

## 4. M7 `[staged]` 자리표시자

| 항목 | 값 | 근거 |
|---|---|---|
| 위치 | `progress.md` **L88** (§E.2 M7 하단, "메일 로그 관련 커밋" 줄) | `grep -n "\[staged\]" progress.md` → `88:` |
| 표기 내용 | `` `[staged]` (testTimeout 30000 조정, 진단 서술 갱신) `` | 같은 줄 |
| 실제 커밋 | **`baf71b3`** — `docs(SPEC-CONTENT-PARITY-001): M7 testTimeout 조정 + 진단 서술 갱신` | `git log --oneline -S"[staged]" -- progress.md` → `baf71b3` |
| 같은 커밋의 실제 변경 | `apps/web/server/api/routers/admin/mail-log.test.ts` (+11/−1, `timeout: 30000` 추가) 과 `progress.md` (4줄) | `git show --stat baf71b3` |
| 정정 방법 | L88 의 `[staged]` 를 `baf71b3` 으로 바꾼다 (commit SHA 백필) | — |

참고: 이 커밋 ID 는 M7 의 다른 SHA 목록 (`64fc5c0` 등)과 달리 **문서 커밋**이다. M7 구현 커밋 `64fc5c0` 과 구분해 적어야 한다.

## 5. 003 흡수 시 쓸 목록

003 이 "이전 SPEC 의 미완 AC 전량 이관"을 할 때는 **acceptance 번호 기준 PASS-WITH-DEBT 7건**을 쓴다.

| acceptance 번호 | 내용 | 미완 사유 (progress 본문) |
|---|---|---|
| AC-CPAR-004 | 휴지통 복원 영속 | 런타임 실제 클릭 재현 미실시 (mock 기반) — prog L29 |
| AC-CPAR-005 | 개별 영구 삭제 + 비우기 | 댓글 purge FK cascade 를 격리 임시 DB 실제 실행으로 검증하지 않음 — prog L30 |
| AC-CPAR-007 | 문서 일괄 작업 영속 | 브라우저 재현 미실시 — prog L37 |
| AC-CPAR-008 | TEMP 복구·삭제·IP·신고 | 런타임 재현 미실시 — prog L38 |
| AC-CPAR-010 | 댓글 일괄 삭제 영속 | 런타임 재현 미실시 — prog L40 |
| AC-CPAR-011 | 파일 검색·필터·정렬 | 런타임 재현 미실시 — prog L60 |
| AC-CPAR-012 | 파일 일괄 삭제 | 런타임 재현 미실시 — prog L61 |

추가 이관 후보 (progress 본문의 잔여 항목, AC 번호와 별개):
- `purgeDocument` 가 AdminLog 를 기록하지 않음 (`packages/document/src/trash.ts`). progress §M3 L51~L54 가 "잔여 항목"으로 기록.
- 문서·댓글 작성자 필터가 닉네임 텍스트 검색이 아니라 숫자 ID 입력 (레거시 UX 와 다름). progress §M3 L46~L49.
- M7 메일 로그 테스트의 `testTimeout 30000` 우회 (WSL2 cold-start). progress L88 과 `mail-log.test.ts:61`.

## 6. 미검증 (Gaps)

- acceptance 의 "런타임 영속" 판정은 소스·테스트 기준으로만 읽었다. progress 가 PASS 라고 적은 항목을 실제 화면에서 재현하지 않았다.
- `spec.md` 의 REQ 목록과 AC 의 매핑 (REQ-CPAR-001~030 ↔ AC 16건)은 대조하지 않았다. acceptance 번호 기준 원장만 만들었다.
- progress §E.2 M5 의 per-board 행이 실제로 `/admin/modules/[id]/page.tsx` 의 링크를 검증했는지는 본문만 읽었고 코드는 확인하지 않았다.

## 6-1. 주의

- 이 원장은 `progress.md` 와 `acceptance.md` 의 텍스트만 대조했다. `progress.md` 를 고치지 않았다(지시대로 저장소 파일 수정 금지).
- 정정은 003 의 SPEC 작성 단계에서 반영하도록 권한다. 특히 §E.3 의 `ac_pass_count` 는 11 → 9, §E.2 헤더 L14 는 "M1~M7 완료"로 갱신이 필요하다.
