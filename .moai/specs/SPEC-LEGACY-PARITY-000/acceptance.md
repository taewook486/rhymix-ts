# SPEC-LEGACY-PARITY-000 — acceptance

각 AC 는 대응 REQ 를 Given-When-Then 으로 검증한다. 본 SPEC 은 제품 코드를 변경하지 않으므로
검증은 **파일 존재·내용 검사**, **근거 자료 대조**, **영역 SPEC 감사 시점의 규칙 적용**으로 이루어진다.
런타임 테스트가 없는 것은 누락이 아니라 SPEC 성격에 따른 것이다(spec.md §4 참고).
모든 명령은 저장소 루트(`/mnt/d/project/rhymix-ts`)에서 실행한다.

| AC | REQ | Given-When-Then | 검증 명령 / 파일 검사 |
|----|-----|-----------------|------------------------|
| AC-LGP-001 | REQ-LGP-001 | **Given** spec.md §2.3 의 영역 표가 있을 때, **When** 시리즈의 영역 SPEC 디렉터리를 세면, **Then** `SPEC-LEGACY-PARITY-001`~`010` 이 정확히 10개이고 각 `spec.md` 의 `id` 가 디렉터리 번호와 1:1 로 맞으며, 영역 이름이 §2.3 순서와 같다. | (a) `grep -c "^\| SPEC-LEGACY-PARITY-0" .moai/specs/SPEC-LEGACY-PARITY-000/spec.md` 가 10. (b) 영역 SPEC 이 모두 생긴 뒤: `ls -d .moai/specs/SPEC-LEGACY-PARITY-0{0[1-9],10} \| wc -l` 이 10 이고 `grep -h "^id:" .moai/specs/SPEC-LEGACY-PARITY-0{0[1-9],10}/spec.md` 가 001~010 과 1:1 대응. 2026-11-28 기준 001 만 존재 — (b) 는 영역 SPEC 작성에 따라 순차 충족 |
| AC-LGP-002 | REQ-LGP-002 | **Given** 영역 SPEC 의 요구사항 목록이 있을 때, **When** 각 REQ 의 근거 인용을 검사하면, **Then** 모든 REQ 가 지도 근거(`disp*`/`proc*` act, `module.act`, `events.md` 핸들러) 또는 010 에 한해 레거시 소스 경로를 1개 이상 인용한다. | 영역 SPEC 마다 `grep -cE "(disp\|proc)[A-Z][A-Za-z_]*\|events\.md\|modules/[a-z_]+/" spec.md` ≥ REQ 수. 인용 없는 REQ 는 plan-auditor 가 must-fix 로 지적 |
| AC-LGP-003 | REQ-LGP-003 | **Given** `coverage.md` 의 선언 액션 표와 `legacy-front-map/summary.md` 가 있을 때, **When** 영역 SPEC 의 판정표를 대조하면, **Then** §2.3 이 그 영역에 배정한 고유 act 집합과 판정표의 act 집합이 같고, 모든 행의 판정이 `대응 있음`/`격차`/`의도적 제외` 중 하나이며, 레거시 오류 화면 행에는 오류 내용이 적혀 있다. | 아래 §검증 스크립트 S-003 이 출력하는 두 목록(배정됐으나 판정표에 없는 act / 판정표에만 있는 act)이 모두 비어 있다. 오류 화면(`coverage.md` "보충 방문 결과"의 오류 8건 + 방문자 오류 화면)은 판정표 비고에 오류 문구가 있다 |
| AC-LGP-004 | REQ-LGP-004 | **Given** 시리즈 착수 전 `AdminSidebar.tsx` 의 그룹 헤더 순서가 기록돼 있을 때, **When** 어떤 영역 SPEC 이 완료되면, **Then** 그룹 헤더 순서와 그룹별 href 집합이 착수 전과 같다. 007(메일·알림) 같은 영역 신설이 사이드바 그룹을 만들지 않는다. | `grep -oP "section: '\K[^']+" apps/web/components/admin/AdminSidebar.tsx` 결과가 `대시보드 / 사이트 제작/편집 / 회원 / 콘텐츠 / 설정 / 고급` 순서 그대로(2026-11-28 확인값). 영역 SPEC 이 그룹 구조를 바꾸면 이 명령의 diff 로 즉시 드러남 |
| AC-LGP-005 | REQ-LGP-005 | **Given** 영역 SPEC 이 뉴버전 고유 기능을 발견했을 때, **When** 그 SPEC 을 감사하면, **Then** 해당 기능이 제거 대상이 아니라 "개선점"으로 기록된 절이 있다. | `grep -l "회귀 금지" .moai/specs/SPEC-LEGACY-PARITY-0{0[1-9],10}/spec.md` 가 존재하는 영역 SPEC 전부를 나열 |
| AC-LGP-006 | REQ-LGP-006 | **Given** 선행 SPEC 을 흡수하는 영역 SPEC 이 있을 때, **When** 그 영역 SPEC 이 `completed` 가 되면, **Then** 흡수된 선행 SPEC 의 `status` 가 `superseded` 이고 본문에 흡수 SPEC ID 가 남는다. | 001: `grep "^status:" .moai/specs/_archive/SPEC-MENU-001/spec.md` 가 `superseded` (전환 커밋 `93dc1fb`). 003 completed 시점: `grep "^status:" .moai/specs/SPEC-CONTENT-PARITY-001/spec.md` 가 `superseded` 이고 `grep -c "SPEC-LEGACY-PARITY-003" .moai/specs/SPEC-CONTENT-PARITY-001/spec.md` ≥ 1 |
| AC-LGP-007 | REQ-LGP-007 | **Given** 영역 SPEC 이 관리자 지도 또는 방문자 지도를 인용할 때, **When** 그 SPEC 을 작성하거나 감사하면, **Then** 인용한 지도의 `crawledAt` 이 레거시 저장소 HEAD 커밋 시각보다 뒤다. | `python3 -c "import json,subprocess,datetime as d;h=d.datetime.fromisoformat(subprocess.check_output(['git','-C','/mnt/d/project/rhymix','log','-1','--format=%cI'],text=True).strip());[print(p,d.datetime.fromisoformat(json.load(open(p))['crawledAt'].replace('Z','+00:00'))>h) for p in ['.moai/reports/legacy-admin-map/index.json','.moai/reports/legacy-front-map/index.json']]"` 가 두 줄 모두 `True`. 2026-11-28 확인값: 레거시 HEAD `2026-11-20T19:55:21+09:00`, 관리자 `2026-11-28T05:11:24Z`, 방문자 `2026-11-28T07:27:29Z` |
| AC-LGP-008 | REQ-LGP-008 | **Given** 세 크롤 스크립트와 두 지도의 페이지 파일이 있을 때, **When** 크롤 도구와 방문 기록을 검사하면, **Then** 클릭 호출이 없고, `proc*` act 방문이 0건이며, 변경성 낱말이 든 `disp*` act 방문은 소스 확인을 거친 허용 목록 안에 있다. | (a) `grep -c "\.click(" apps/web/e2e/legacy-crawl/crawl-{admin,supplement,front}.ts` 가 모두 0. (b)·(c) 아래 §검증 스크립트 S-008 이 `proc 0` 을 출력하고(`proc*` 방문 0건), 변경성 낱말 일치 act 를 허용 목록과 비교한 차이가 없다. 허용 목록 — 관리자: `dispAdminInsertDomain`, `dispBoardAdminDeleteBoard`, `dispBoardAdminInsertBoard`, `dispLayoutAdminInsert`, `dispMemberAdminInsert`, `dispMemberAdminInsertJoinForm`, `dispPageAdminDelete` / 방문자: `dispBoardDelete`, `dispBoardDeleteComment`, `dispBoardDeleteTrackback`, `dispBoardUpdateLog`, `dispBoardUpdateLogView`, `dispNcenterliteInsertUnsubscribe` (2026-11-28 확인값). 목록 밖 act 가 나오면 소스 확인 기록 없이 방문한 것이므로 FAIL |
| AC-LGP-009 | REQ-LGP-009 | **Given** 영역 SPEC 이 시드한 레거시 레코드로 근거를 수집했을 때, **When** 그 SPEC 을 감사하면, **Then** 덤프 파일 이름·넣은 레코드·복원 후 확인값이 SPEC 에 기록돼 있고, 레거시 DB 가 기준선 값으로 돌아와 있다. | (a) 영역 SPEC 의 `research.md` 또는 `progress.md` 에서 `grep -E "\.sql\|복원 후" ` 가 덤프 파일명과 복원 후 확인값을 각각 1건 이상 찾는다. (b) `docker exec rhymix-db mariadb -urhymix -prhymixpass rhymix -N -e "SELECT (SELECT COUNT(*) FROM rx_documents),(SELECT COUNT(*) FROM rx_comments),(SELECT COUNT(*) FROM rx_member)"` 가 기준선 값(2026-11-28 복원 후: `2 0 1`)과 같다. 본 SPEC 의 2026-11-28 시드 기록은 spec.md §2.1 에 있다 |

## 검증 스크립트

### S-003 — 영역 배정 act 와 판정표 대조 (AC-LGP-003)

`MODULES` 는 §2.3 의 해당 영역 소속 모듈로, `TABLE` 은 영역 SPEC 의 판정표 파일로 바꿔 실행한다.
방문자 영역(008·009)은 `coverage.md` 대신 `legacy-front-map/summary.md` 를 읽는다.

```bash
python3 - <<'EOF'
import re
MODULES = {"member", "point"}                       # 예: 002 회원
SRC = ".moai/reports/legacy-admin-map/coverage.md"
TABLE = ".moai/specs/SPEC-LEGACY-PARITY-002/research.md"
rows = re.findall(r"^\| (\w+) \| `(disp\w+)`", open(SRC).read(), re.M)
assigned = {act for mod, act in rows if mod in MODULES}
judged = set(re.findall(r"`(disp\w+)`", open(TABLE).read()))
print("missing", sorted(assigned - judged))
print("extra", sorted(judged - assigned))
EOF
```

### S-008 — 크롤 방문 기록의 변경성 act 검사 (AC-LGP-008)

```bash
python3 - <<'EOF'
import glob, json, re
MUT = re.compile(r"delete|insert|update|remove|reset|restore|purge|logout", re.I)
ALLOW = {
  "dispAdminInsertDomain", "dispBoardAdminDeleteBoard", "dispBoardAdminInsertBoard",
  "dispLayoutAdminInsert", "dispMemberAdminInsert", "dispMemberAdminInsertJoinForm",
  "dispPageAdminDelete",
  "dispBoardDelete", "dispBoardDeleteComment", "dispBoardDeleteTrackback",
  "dispBoardUpdateLog", "dispBoardUpdateLogView", "dispNcenterliteInsertUnsubscribe",
}
acts = set()
for f in glob.glob(".moai/reports/legacy-*-map/pages/*.json"):
    acts.add(json.load(open(f)).get("act") or "")
print("proc", sum(a.startswith("proc") for a in acts))
print("outside-allow", sorted({a for a in acts if MUT.search(a)} - ALLOW))
EOF
```

기대 출력: `proc 0`, `outside-allow []`.

## Edge Cases

- **영역 이름과 사이드바 그룹 이름이 같은데 범위가 다름** — 005 설정은 레거시 GNB '즐겨찾기'로 수집된
  시스템 설정 7개를 포함하고, 006 고급은 GNB '콘텐츠'로 수집된 page 화면을 포함한다. 판정표 대조
  (AC-LGP-003)는 수집 그룹이 아니라 §2.3 의 소속 모듈 배정으로 한다.
- **레거시 자체가 오류를 내는 화면** — `dispModuleAdminModuleGrantSetup`(TypeError),
  `dispLayoutAdminLayoutModify`(템플릿 없음), `dispAdminConfigFtp`(기능 폐기) 등은 판정에서 빼지 않는다.
  폐기된 기능은 대개 `의도적 제외` 후보이고, 레거시 결함 화면은 기능 의도(소스 기준)로 판정한다.
- **레코드가 없어 내용을 못 본 화면** — `dispTrashAdminView`, `dispPollAdminResult`, `dispFileAdminEdit` 는
  화면 존재만 확인됐다. 내용 수준 판정이 필요하면 REQ-LGP-009 절차로 표본을 넣어 다시 수집한다.
- **한 화면이 두 그룹에서 도달 가능** — 크롤러는 먼저 순회한 그룹이 소유하고 이후 그룹에서는
  `skipped-other-group` 으로 기록한다. 영역 배정은 소속 모듈로 하므로 이 기록은 판정에 영향이 없다.
- **변경성 act 만 있는 기능** — 예: 삭제 전용 버튼. 선언 화면이 없으므로 판정표에는 나타나지 않는다.
  `events.md` 의 핸들러 대응표를 근거로 삼는다(REQ-LGP-002 가 핸들러 이름 인용을 허용하는 이유).
  004 즐겨찾기 UI 가 이 경우다.
- **크롤 이후 레거시를 다시 초기화한 경우** — `crawledAt` 은 갱신되지만 데이터가 비어
  목록형 화면의 링크 수가 달라질 수 있다. 화면 **존재** 판정에는 영향이 없으나 링크 수를
  근거로 쓴 요구사항은 재확인이 필요하다.
- **크롤 중 컨테이너 재시작** — 연결 오류가 1건이라도 기록된 실행은 지도로 채택하지 않는다
  (plan.md §3 리스크).

## Definition of Done (본 개정)

- spec.md 가 REQ-LGP-001~009 를 담고 `tier: M`, `version: "0.2.0"` 이다.
- AC-LGP-001(a)·004·007·008 이 현재 상태에서 통과한다.
- `INDEX.md` Phase 15 가 SPEC 수 11, 완료 1/11 로 표기된다.
