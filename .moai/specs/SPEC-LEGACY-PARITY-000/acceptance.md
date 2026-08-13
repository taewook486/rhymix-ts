# SPEC-LEGACY-PARITY-000 — acceptance

각 AC는 대응 REQ의 GEARS 패턴을 그대로 반영한다. 본 SPEC은 제품 코드를 변경하지 않으므로
검증은 **파일 존재·내용 검사**와 **영역 SPEC 감사 시점의 규칙 적용**으로 이루어진다.
런타임 테스트가 없는 것은 누락이 아니라 SPEC 성격에 따른 것이다(spec.md §4 참고).

| AC | REQ | GEARS 검증 기준 | 기계 검증 명령 |
|----|-----|------------------|------------------|
| AC-LGP-001 | REQ-LGP-001 | **The** 시리즈 **shall** `SPEC-LEGACY-PARITY-001`~`006` 6개로 구성되며 각 디렉터리의 `spec.md` frontmatter `id`가 번호와 일치한다. | `ls -d .moai/specs/SPEC-LEGACY-PARITY-00[1-6] \| wc -l` 이 6이고, `grep -h "^id:" .moai/specs/SPEC-LEGACY-PARITY-00[1-6]/spec.md` 결과가 001~006과 1:1 대응 |
| AC-LGP-002 | REQ-LGP-002 | **The** 각 영역 SPEC의 모든 REQ **shall** 근거 자료의 구체적 항목(화면 `act` / 폼 `module.act` / 핸들러 이름)을 최소 1개 인용한다. | 영역 SPEC별로 `grep -c "disp[A-Za-z]*\|proc[A-Za-z]*\|events.md" spec.md` ≥ REQ 수. 인용 없는 REQ는 plan-auditor가 must-fix로 지적 |
| AC-LGP-003 | REQ-LGP-003 | **The** 각 영역 SPEC **shall** 자기 그룹의 레거시 화면 전건에 대해 대응있음/격차/의도적제외 중 하나를 판정한 표를 포함하며, 판정 수가 `index.json`의 해당 그룹 `pageCount`와 일치한다. | `python3` 로 `index.json` 의 그룹별 `pageCount` 와 영역 SPEC 판정표 행 수를 대조 (완료 판정 전 필수) |
| AC-LGP-004 | REQ-LGP-004 | **The system shall not** `AdminSidebar.tsx` 의 그룹 순서·소속을 변경한다. 시리즈 착수 전후로 그룹 헤더 순서와 그룹별 href 집합이 동일하다. | `grep -oP "section: '\K[^']+" apps/web/components/admin/AdminSidebar.tsx` 결과가 시리즈 전/후 동일. 영역 SPEC이 그룹 구조를 바꾸면 이 명령의 diff로 즉시 드러남 |
| AC-LGP-005 | REQ-LGP-005 | **The system shall not** 레거시에 없다는 이유만으로 뉴버전 고유 기능을 제거한다. 각 영역 SPEC은 발견한 뉴버전 고유 기능을 "개선점"으로 기록한 절을 갖는다. | 영역 SPEC에 `Out of Scope — 레거시 회귀 금지` 또는 동등한 절이 존재(`grep -l "회귀 금지" .moai/specs/SPEC-LEGACY-PARITY-00[1-6]/spec.md`) |
| AC-LGP-006 | REQ-LGP-006 | **When** 영역 SPEC이 `completed` 가 되면 **the system shall** 흡수된 선행 SPEC의 frontmatter `status` 를 `superseded` 로 바꾸고 본문에 흡수 SPEC ID를 남긴다. | `SPEC-LEGACY-PARITY-003` completed 시점에 `grep "^status:" .moai/specs/SPEC-CONTENT-PARITY-001/spec.md` 가 `superseded` 이고 `grep -c "SPEC-LEGACY-PARITY-003" .moai/specs/SPEC-CONTENT-PARITY-001/spec.md` ≥ 1 |
| AC-LGP-007 | REQ-LGP-007 | **While** 레거시가 크롤 시각 이후 변경되었으면 **the system shall** 영역 SPEC 작성·감사 전에 크롤을 다시 실행한다. | 영역 SPEC 감사 시 `index.json` 의 `crawledAt` 과 레거시 최종 변경 시각(`git -C /mnt/d/project/rhymix log -1 --format=%cI` 또는 파일 mtime)을 비교 |
| AC-LGP-008 | REQ-LGP-008 | **The system shall not** 크롤로 레거시 상태를 변경한다. 크롤러는 클릭 호출이 없고 변경성 act 를 방문하지 않는다. | (a) `grep -c "\.click(" apps/web/e2e/legacy-crawl/crawl-admin.ts` 가 0. (b) `python3` 로 `pages/*.json` 전건의 `act` 중 `MUTATING_ACT` 패턴 일치가 0건. (c) 크롤 전후 `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='rhymix'` 동일 |

## Edge Cases

- **그룹에 화면이 1개뿐인 영역** — `index.json` 기준 `사이트 제작/편집` 6개, `설정` 6개처럼
  적게 잡힌 그룹이 있다. 이는 GNB 마크업으로 소속이 확정된 화면만 그 그룹의 진입점으로
  세었기 때문이며, 하위 화면은 순회 중 발견되어 같은 그룹으로 귀속된다. AC-LGP-003의 판정 수
  대조는 `index.json` 의 `pageCount`(순회 결과) 기준이지 GNB 진입점 수 기준이 아니다.
- **한 화면이 두 그룹에서 도달 가능** — 크롤러는 먼저 순회한 그룹이 소유하고 이후 그룹에서는
  `skipped-other-group` 으로 기록한다. 영역 SPEC이 자기 그룹 밖 화면을 다뤄야 한다면 그 사실을
  명시하고 소유 그룹의 SPEC과 교차 참조한다(위젯 시스템 귀속 충돌 선례 참고).
- **변경성 act 만 있는 기능** — 예: 삭제 전용 버튼. 화면 판정표에는 나타나지 않으므로
  `events.md` 의 핸들러 대응표를 근거로 삼는다(REQ-LGP-002가 핸들러 이름 인용을 허용하는 이유).
- **크롤 이후 레거시를 다시 초기화한 경우** — `crawledAt` 은 갱신되지만 데이터가 비어
  목록형 화면의 링크 수가 달라질 수 있다. 화면 **존재** 판정에는 영향이 없으나 링크 수를
  근거로 쓴 요구사항은 재확인이 필요하다.
