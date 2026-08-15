# 다음 세션 시작점 (paste-ready resume message)

> 다른 컴퓨터에서 이어서 작업할 때 이 문서 내용을 그대로 붙여넣으세요.
> 갱신: 2026-08-15 (재크롤 완료 + SPEC-LEGACY-PARITY-001 draft 작성)
> source_session_id: 2dedd070-9771-4c30-a4f7-3ec403e093d3

## 붙여넣을 메시지

```text
ultrathink. SPEC-LEGACY-PARITY-001 run-phase M1부터 진행.
applied lessons: feedback-stale-triage-doc-reverify,
feedback-dont-trust-completion-marking, feedback-verify-typecheck-claims-broadly

전제 검증:
1) docker.exe ps → rhymix-app(8080)/rhymix-db(3307)/rhymix-ts-db(5444) 3개 Up
2) git log --oneline -1 → 8492c60 이후 SHA, main == origin/main
3) curl -s -o /dev/null -w "%{http_code}" localhost:8080/ → 200
4) .moai/specs/SPEC-LEGACY-PARITY-001/ → spec/plan/acceptance/research 4개 존재

실행: /moai run SPEC-LEGACY-PARITY-001 — M1(격차 가설 실측 재확인)부터.

후속: 002 회원 → 003 콘텐츠 → 004 즐겨찾기 → 005 설정 → 006 고급
```

## 오늘 한 일 (2026-08-15)

커밋 3건, main == origin/main.

```
8492c60 docs(spec): SPEC-LEGACY-PARITY-001 사이트 제작/편집 영역 작성
49e0794 docs(report): 레거시 관리자 화면 지도 재크롤 — 그룹 귀속 정정
158a718 fix(e2e): 크롤러 공통 껍데기 패스의 변경성 act 차단
```

### 1. 재크롤 완료 — 그룹 귀속 정정됨

`사이트 제작/편집` 6 → **2**, `공통(헤더/푸터)` 그룹 4개 신설. 나머지 5개 그룹은 무변화
(회원 17 / 콘텐츠 67 / 즐겨찾기 24 / 설정 6 / 고급 44). 총 164개, act 집합 신구 완전 일치.

**중간에 결함 1건 더 발견하고 고쳤다.** 1차 재크롤에서 `procAdminLogout`을 방문해 세션이
끊겼고, 그 뒤 순서였던 2개 화면이 관리자 화면이 아니라 **로그인 페이지로 기록**됐다.
개수만 보면 165개로 "정상"이라 그냥 넘어갈 자리였다.

원인: `MUTATING_ACT` 필터가 그룹 순회 루프(`crawl-admin.ts:448`)에만 걸려 있고,
마지막 공통 껍데기 수집 패스(`:494`)는 링크 disposition 경로를 안 타서 필터를 통과하지 않았다.
로그아웃은 모든 화면 푸터에 있어 `detectChrome()`이 정확히 껍데기로 분류했고, 그래서 오히려
방문 대상이 됐다. 공통 패스에도 같은 필터를 걸어 해결(`158a718`).

### 2. SPEC-LEGACY-PARITY-001 작성 (draft, Tier M)

`.moai/specs/SPEC-LEGACY-PARITY-001/` — research/spec/plan/acceptance 4개.

**판정 결과**: 화면 2건은 **둘 다 뉴버전에 대응 화면이 있다.** 격차는 화면 부재가 아니라
`/admin/menu` 안의 기능 4건이다.

| 격차 | 내용 | 결정 |
|---|---|---|
| G1 | 메뉴 아이템 복제 (레거시 복사/붙여넣기) | 구현 — 복제 버튼 1개로 단순화 |
| G2 | 버튼 이미지 업로드 UI (normal/hover/active) | 구현 — 스키마·서버액션은 이미 있고 **UI만 없음** |
| G3 | 메뉴 아이템 다국어 텍스트 | 범위 밖 — 스키마 변경 + 전역 다국어 정책 필요 |
| G4 | 메뉴 검색 | 유예 유지 — SPEC-MENU-001 REQ-MENU-051로 이미 백로그 |

`dispMenuAdminSiteDesign` → `/admin/site/design`은 **격차 0건**. 오히려 뉴버전이 넓다
(테마 지정, 디자인 토큰 — 레거시에 없음). REQ-LGP-005에 따라 보존 대상.

**SPEC-MENU-001 Slice D 잔여분은 목록을 그대로 믿지 않고 재검증했다.**
"Footer.tsx/Utility.tsx가 죽은 코드"라던 항목은 **이미 해소돼 있었다** — `Footer.tsx`는
`FooterMenuSlot.tsx`로 대체됐고 `app/layout.tsx:10-11, 69, 73`에서 정상 렌더된다.
승계는 런타임 미검증 3건(슬롯 3종 동시 배정 / 중첩 트리 렌더 / groupIds ACL)만 한다.

**별건 발견**: SPEC-MENU-001은 frontmatter가 `status: completed`인데 본문은
`Status: in-progress`다(spec.md:4 vs :353). REQ-SITE-009로 이 SPEC 완료 시 `superseded`
마킹하며 해소된다.

## 다음 작업

1. **M1 — 격차 가설 실측 재확인** (첫 작업, 나머지 전부의 선행)

   research.md의 격차 판정은 **정적 코드 확인까지가 근거**다. 구현 전에 양쪽 사이트를
   나란히 띄우고 확인한다. 확인 항목 5개는 `plan.md §A.1 M1` 표 참조.

   격차가 실재하지 않는 것으로 드러나면 해당 REQ를 즉시 철회하고 기록한다 —
   없는 결함을 구현하지 않는다. (과거 3회 연속으로 "미구현" 기록이 이미 해소돼 있었다.)

2. M2 버튼 이미지 UI → M3 아이템 복제 → M4 승계 검증 고정

3. 이후 002 회원 → 003 콘텐츠(Tier L 최대) → 004 즐겨찾기 → 005 설정 → 006 고급

## 미해결로 남긴 것

- **크롤 산출물의 공통 그룹 4개 화면은 링크 `disposition`이 전부 기본값 `queued`**다.
  마지막 껍데기 수집 패스가 `inspect()`만 부르고 링크 분류 루프를 안 타기 때문.
  `skippedMutatingCount`가 187→181로 준 것도 같은 원인. 화면 지도·그룹 귀속·이벤트
  대응표에는 영향 없어서 손대지 않았다. 고칠지는 판단 필요.
- OQ-3 관련: SPEC-MENU-001 Open Question Q3(ACL 서버 컴포넌트 캐싱 경계)는 M4에서 확정 또는 유예.

## 환경 메모

- 레거시 DB 접속(컨테이너 내부 기준): host `db`, port 3306, `rhymix`/`rhymixpass`, prefix `rx_`
- 뉴버전 DB: `127.0.0.1:5444`, `rhymix`/`rhymix`, DB `rhymix_ts`
- 뉴버전 `users` 테이블 컬럼은 camelCase 인용 필요: `SELECT "userId", "emailAddress" FROM users;`
- 양쪽 관리자 계정 동일: `admin` / `admin@example.com` / `Rhymix!2026`
- dev 서버 첫 컴파일 약 204초
- `tsx` 미설치 — `pnpm dlx tsx` 로 받아 쓴다
- `.git/index.lock` 잔재가 종종 남는다. `ps aux`로 살아있는 git 프로세스 없음 확인 후 `rm`
