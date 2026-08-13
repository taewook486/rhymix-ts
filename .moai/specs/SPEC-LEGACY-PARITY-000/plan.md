# SPEC-LEGACY-PARITY-000 — plan

## §0. 설계 요약

제품 코드 변경이 없다. 산출물은 이 SPEC 문서 3개(spec/plan/acceptance)와 `INDEX.md` 등록,
그리고 영역 SPEC 001~006이 따를 규약이다. 기준선과 근거 자료는 이미 만들어져 커밋돼 있다
(`3a9411c` 도구, `8476774` 리포트).

## §1. 파일별 변경 계획

### M1 — 시리즈 규약 문서화 (REQ-LGP-001~008)

파일: `.moai/specs/SPEC-LEGACY-PARITY-000/{spec,plan,acceptance}.md`

- 기준선(§2.1), 근거 자료(§2.2), 시리즈 구성(§2.3), 이미 충족된 항목(§2.4)을 기록.
- 상태: 완료(본 커밋).

### M2 — INDEX.md 등록

파일: `.moai/specs/INDEX.md`

- Phase 진척 매트릭스에 `Phase 15 — 관리자 레거시 parity 시리즈` 행 추가(SPEC 수 7 = 우산 1 + 영역 6).
- SPEC 목록에 `SPEC-LEGACY-PARITY-000`~`006` 등록. 001~006은 착수 전이므로 `⬜ 미착수`로 표기.

### M3 — 영역 SPEC 001 작성 (사이트 제작/편집)

파일: `.moai/specs/SPEC-LEGACY-PARITY-001/{spec,plan,acceptance,research}.md`

- `research.md`: `.moai/reports/legacy-admin-map/` 에서 `사이트 제작/편집` 그룹 화면을 추출해
  뉴버전 대응 라우트와 대조한 판정표(REQ-LGP-003)를 만든다.
- 흡수 대상: `SPEC-MENU-001` Slice D 잔여분(Footer/Utility/ACL — 관리자 로그인 필요로 미검증
  상태로 남아 있음).
- 본 SPEC 범위 밖 — 별도 착수.

## §2. 영역 SPEC 착수 순서와 의존

```
000 (규약, 본 SPEC)
 └─ 001 사이트 제작/편집   ← MENU-001 Slice D 잔여 흡수
     └─ 002 회원            ← MEMBER-PARITY-001 재검증
         └─ 003 콘텐츠      ← CONTENT-PARITY-001 흡수 (Tier L, 가장 큼)
             └─ 004 즐겨찾기 ← ADMIN-MENU-PARITY-001 재검증
                 └─ 005 설정
                     └─ 006 고급
```

순차 의존은 기술적 의존이 아니라 **작업 순서 약속**이다(지정된 순서). 다만 003은
`CONTENT-PARITY-001`(in-progress)을 흡수하므로 착수 전에 그 SPEC의 잔여 항목을 확정해야 한다.

## §3. 리스크

| 리스크 | 영향 | 완화 |
|---|---|---|
| 크롤 지도의 그룹 귀속이 레거시 LNB와 다를 수 있음 | 영역 SPEC이 남의 그룹 화면을 다룸 | GNB 마크업 기준이라 진입점 귀속은 정확. 하위 화면은 순회 경로 상속이므로 영역 SPEC에서 육안 확인 후 교차 참조 |
| `CONTENT-PARITY-001` 흡수 시 진행 중이던 작업 유실 | 003 착수 지연 | 흡수 전 `progress.md` 의 미완 AC를 003의 요구사항으로 전량 이관하고, 이관 목록을 003 HISTORY에 기록 |
| 변경성 액션(`proc*`)의 동작이 근거에 없음 | 기능 누락을 못 잡음 | `events.md` 핸들러 대응표로 보완. 그래도 불확실하면 해당 영역 SPEC이 격리 환경에서 개별 확인 |
| 레거시 재초기화로 목록형 화면의 링크 수 변동 | 링크 수 기반 요구사항이 흔들림 | 화면 **존재** 기준으로 요구사항을 쓰고, 개수는 근거로 쓰지 않는다(acceptance.md Edge Cases) |

## §4. 검증 방법

`acceptance.md` 의 AC-LGP-001~008. 이 중 001·004·005·008은 지금 바로 검증 가능하고,
002·003·006·007은 영역 SPEC이 생긴 뒤에 적용되는 **지속 규칙**이다 — 영역 SPEC의
plan-auditor 감사 체크리스트에 포함시킨다.
