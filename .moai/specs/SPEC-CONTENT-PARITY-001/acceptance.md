# SPEC-CONTENT-PARITY-001 — 수용 기준 (acceptance)

> [HARD] 판정 기준은 **런타임 영속**(작업 실행 후 새로고침/재조회 시 결과 유지)이다.
> "렌더된다" / "프로시저가 존재한다"는 PASS 근거가 아니다 (spec.md §4).
> 기계 검증 명령은 각 AC에 병기한다. Playwright 실행 시 research.md §0의 상호작용 우회
> 패턴(`el.click()`, `form.requestSubmit()`)을 참고한다.

## A. 그룹 A — 사이드바 (REQ-CPAR-001~002)

### AC-CPAR-001 사이드바 콘텐츠 섹션 구성

- Given: 관리자로 로그인한 상태
- When: `/admin` 진입 후 사이드바 '콘텐츠' 섹션을 확인하면
- Then: 파일(`/admin/files`), 휴지통(`/admin/trash`), 스팸필터 진입 링크가 존재하고,
  항목 순서가 레거시 순서(게시판→페이지→문서→댓글→파일→설문→스팸필터→휴지통)를 반영한다
- 기계 검증:
  `grep -E "/admin/files|/admin/trash" apps/web/components/admin/AdminSidebar.tsx` → 각 1건 이상
  + 사이드바 관련 vitest 통과

### AC-CPAR-002 스팸필터 공통 내비게이션

- Given: 스팸필터 진입점(D-4 확정 형태)
- When: IP/키워드/자동차단/캡챠/URL/검토 큐 각 화면으로 이동하면
- Then: 6개 화면 상호 이동이 공통 내비게이션으로 가능하다
- Edge: 검토 큐(`/admin/spam-review`)도 동일 내비게이션에 포함

## B. 그룹 B — 휴지통 (REQ-CPAR-003~008)

### AC-CPAR-003 휴지통 목록 + 타입 필터

- Given: 문서 1건을 휴지통으로 이동하고 댓글 1건을 삭제(soft delete)한 상태
- When: `/admin/trash`에서 전체/문서/댓글 필터를 각각 선택하면
- Then: placeholder 문구 없이 실제 목록이 표시되고, 필터별로 해당 타입만 남는다
- 기계 검증: `grep -c "구현 예정" apps/web/app/admin/trash/page.tsx` → 0

### AC-CPAR-004 복원 영속

- Given: 휴지통에 문서/댓글이 각 1건 존재
- When: 각 항목을 복원하고 **페이지를 새로고침**하면
- Then: 휴지통 목록에서 사라진 상태가 유지되고, 원본 게시판/문서에서 콘텐츠가 다시 보이며,
  AuditLog에 복원 기록이 남는다

### AC-CPAR-005 개별 영구 삭제 + 비우기

- Given: 휴지통에 항목 2건 이상 존재
- When: (a) 1건을 확인 다이얼로그 승인 후 영구 삭제, (b) 범위 선택 후 비우기를 실행하고
  새로고침하면
- Then: 대상 항목이 DB에서 제거되고(재조회 0건), 취소 선택 시 아무 변화 없음
- Edge: 댓글 purge 시 연관 신고/투표 로그가 FK 오류 없이 함께 정리됨 — 격리 임시 DB에서
  실제 실행으로 검증 (mock 불가)

## C. 그룹 C — 문서 관리 (REQ-CPAR-009~015)

### AC-CPAR-006 필터 배선

- Given: 서로 다른 게시판·상태의 문서가 존재
- When: 게시판/상태/검색 필터를 조합 적용하면
- Then: URL 쿼리 파라미터가 갱신되고 목록이 실제로 필터링되며, 해당 URL 직접 진입 시에도
  동일 결과(북마크 가능)
- 기계 검증: 게시판 select에 하드코딩 빈 목록이 아닌 동적 옵션 렌더 확인
  (`grep -c "Dynamic board options" apps/web/app/admin/documents/page.tsx` → 0)

### AC-CPAR-007 일괄 작업 영속

- Given: 문서 2건 선택
- When: 휴지통 이동을 확인 다이얼로그 승인 후 실행하고 새로고침하면
- Then: 두 문서가 목록에서 사라지고 `/admin/trash`에 나타난다. 이동/상태 변경도 동일
  패턴으로 영속 확인
- Edge: 선택 0건 상태에서 일괄 버튼 실행 시 오류 없이 안내 처리

### AC-CPAR-008 TEMP 복구/삭제 + 페이지네이션 + IP + 신고 링크

- Given: TEMP 문서 1건, 문서 51건 이상(페이지 경계), IP가 기록된 문서
- When: (a) TEMP 복구/삭제 실행, (b) '더 보기' 클릭, (c) IP 클릭, (d) 신고 목록 링크 클릭
- Then: (a) 상태 전환이 영속되고 (b) 다음 cursor 페이지가 로드되며 (c) 해당 IP로 필터된
  목록이 표시되고 (d) `/admin/documents/declared`로 이동한다
- 기계 검증: `grep -c "TODO: Server Action 연동 필요" apps/web/app/admin/documents/page.tsx` → 0

## D. 그룹 D — 댓글 관리 (REQ-CPAR-016~020)

### AC-CPAR-009 필터 + 상태 필터

- Given: 공개/비밀 댓글이 섞여 존재
- When: 게시판/검색/상태(비밀) 필터를 적용하면
- Then: URL 파라미터 연동으로 실제 필터링된다 (`isSecret` 기준)

### AC-CPAR-010 일괄 삭제 영속

- Given: 댓글 2건 선택
- When: 확인 다이얼로그 승인 후 일괄 삭제, 새로고침
- Then: 목록에서 제거 유지 + AuditLog 기록. '더 보기' 페이지네이션 동작,
  신고 목록 링크로 `/admin/comments/declared` 진입 가능

## E. 그룹 E — 파일 (REQ-CPAR-021~023)

### AC-CPAR-011 검색/필터/정렬

- Given: 파일명·타입·크기가 다른 첨부 파일 3건 이상
- When: 파일명 검색, 타입 필터, 정렬(크기/다운로드/등록일)을 각각 적용하면
- Then: 목록이 조건대로 갱신된다 (정렬은 방향 토글 포함)

### AC-CPAR-012 파일 일괄 삭제

- Given: 파일 2건 선택
- When: 확인 다이얼로그 승인 후 일괄 삭제, 새로고침
- Then: 목록·디스크(또는 저장 경로 레코드)에서 제거 유지, 연관 문서의 첨부 목록에서도
  제거(SPEC-FILE-001 cascade 경유), AuditLog 기록

## F. 그룹 F — 모듈 (REQ-CPAR-024~025)

### AC-CPAR-013 모듈 편집 dead link 해소

- Given: 모듈 상세 `/admin/modules/[id]`
- When: '설정 편집'을 클릭해 폼에서 제목을 변경·저장하고 새로고침하면
- Then: 404가 아닌 편집 폼이 열리고, 변경된 제목이 상세/목록에 유지된다
- 기계 검증: `test -f "apps/web/app/admin/modules/[id]/edit/page.tsx"` → exit 0

### AC-CPAR-014 per-board 링크

- Given: board 타입 모듈의 상세 화면
- When: 분류/확장변수/권한/피드 링크를 클릭하면
- Then: `/admin/boards/[mid]/{categories,extra-keys,permissions,feed}` 각 화면으로 이동한다
- Edge: page 타입 모듈 상세에는 해당 링크가 노출되지 않는다

## G. 그룹 G — 알림 매트릭스 (REQ-CPAR-026~028)

### AC-CPAR-015 전역 게이트 + 영속

- Given: 관리자 전역 알림 설정 화면에서 '댓글' 이벤트를 비활성으로 저장
- When: (a) 새로고침하면, (b) 다른 회원 문서에 댓글을 작성하면
- Then: (a) 비활성 상태가 유지되고 (b) 문서 작성자에게 댓글 알림이 생성되지 않는다.
  이벤트를 다시 활성화하면 알림 생성이 재개된다
- Edge: 전역 활성 + 개인 비활성 조합에서는 기존(개인 설정 우선) 동작 유지 —
  `packages/notification` 기존 vitest 전체 통과로 회귀 확인

## H. 그룹 H — 메일 로그 (REQ-CPAR-029~030 — 2026-08-09 포함 확정)

### AC-CPAR-016 발송 기록 + 목록

- Given: SMTP 설정 완료 상태
- When: 테스트 메일 발송(성공 1건) + 잘못된 수신자/설정으로 발송 시도(실패 1건) 후
  관리자 발송 내역 화면을 열면
- Then: 성공/실패 각 1건이 수신자·제목·상태·시각과 함께 표시되고, 실패 건에는 오류
  메시지가 포함되며, 새로고침 후에도 유지된다

---

## 품질 게이트 (전 마일스톤 공통)

| 게이트 | 명령 | 기준 |
|---|---|---|
| 타입 체크 | `pnpm tsc --noEmit` (apps/web + 수정 패키지) | 0 errors |
| 단위 테스트 | `npx vitest run` (수정 패키지 스코프) | 신규 실패 0건 (사전 존재 실패는 SPEC-TEST-DEBT-001 기준 제외) |
| dead link/placeholder 소거 | AC-CPAR-003/008/013의 grep/test 명령 | 전부 통과 |
| AuditLog | 파괴적 작업(복원 제외) 후 AuditLog 레코드 존재 | 쿼리로 확인 |
| 확인 다이얼로그 | 모든 파괴적 일괄 작업 | 승인 전 미실행 |

## Definition of Done

- [ ] REQ-CPAR-001~030 전체 AC PASS (029~030 포함 — 2026-08-09 확정)
- [ ] 런타임 영속 기준으로 각 그룹 최소 1회 실제 화면 재현 확인 (spec.md §4)
- [ ] 품질 게이트 5종 통과
- [ ] 신규 백엔드 프로시저(trash 댓글/empty, file bulkDelete/sort, 알림 전역 게이트)에
      vitest 테스트 존재
- [x] `[NEEDS CLARIFICATION]` 3건 모두 해소 기록 반영 완료 (2026-08-09 — plan.md §4,
      spec.md §8/HISTORY v0.1.1)
