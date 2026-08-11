# SPEC-FRONT-PARITY-001 — 레거시 방문자 화면 전수 분석 (research)

- 조사일: 2026-08-11
- 조사 방법: 양쪽 DB 초기화 → 첫 설치 재실행 → Playwright로 양쪽 방문자 화면의 DOM 구조를
  동일 기준(섹션 태그·클래스·텍스트·컨트롤·CSS 로드 목록)으로 수집·대조.
- 레거시: Rhymix 2.1.33 (http://localhost:8080/, XEDITION 테마)
- 뉴버전: rhymix-ts (http://localhost:3000/), **연결 버그 3건 수정 후(`30acfeb`) 정상 기준선 상태**
- 관리자 계정(양쪽 동일): admin / Admin1234! / comfit99@gmail.com

## 0. 기준선 주의 (본 조사의 전제)

본 조사 직전, 뉴버전 첫 화면이 깨져 보이던 원인 3건이 수정·검증되었다(`30acfeb`). 수정 전
상태로 비교했다면 "메뉴 없음·레이아웃 없음·표 깨짐"이 *디자인 격차*로 잘못 기록되었을 것이다.
아래 격차 목록은 **연결 버그가 해소된 정상 화면**을 기준으로 한다.

수정된 3건(참고): `domains.defaultLayoutId` 미연결 / `menu_slot_assignments` 0행 /
게시판 `<table>` CSS 클래스 전무. 재설치 검증에서 `[Layout] no layout resolved` 경고가
30회 → **0회**로 해소됨을 확인.

## 1. 가장 큰 구조적 차이 — 인덱스 모듈의 종류

| 항목 | 레거시 | 뉴버전 |
|---|---|---|
| 첫 화면에 표시되는 모듈 | **page 모듈**(디자인된 환영 페이지, `module_srl=49`) | **board 모듈**(게시판 목록) |
| 게시판 내용 | **비어 있음**("등록된 글이 없습니다") | 샘플 글 1건 |
| 샘플 콘텐츠 시딩 위치 | page 본문(HTML) | board 문서 |

**이것이 첫인상 격차의 근본 원인이다.** 레거시는 설치 직후 방문자에게 "디자인된 소개 페이지"를
보여주고, 뉴버전은 "빈 게시판 목록"을 보여준다. 뉴버전에도 page 모듈은 구현되어 있으므로
(SPEC-PAGE-001, 위젯 토큰 포함) 이는 기능 부재가 아니라 **설치 시드의 선택 문제**다.

## 2. 레거시 메인 페이지 구조 (실측)

DOM 상위 섹션 순서:

| # | 요소 | 내용 | 정량 |
|---|---|---|---|
| 1 | `div.container.fixed_header` | 고정 헤더 래퍼 | — |
| 2 | `header.header.main` | 로고(XEDITION) + 검색 + 관리 기어 + 회원 드롭다운 | 드롭다운 9항목 |
| 3 | `nav.gnb.pc-gnb` | GNB 메뉴 | Welcome/Free Board/Q&A/Notice |
| 4 | `div.visual.swiper-container` | **히어로 캐러셀** | **슬라이드 6개** |
| 5 | `section.intro` | HELLO, WORLD! / WELCOME TO RHYMIX + 설명 + 스크린샷 이미지 | — |
| 6 | `section.guide` | GET STARTED / BUILD YOUR SITE | **카드 6개** |
| 7 | `section.connect` | CONNECT WITH US / GET INVOLVED | **카드 4개** |
| 8 | `footer.footer` | 라이선스 문구 + Terms/Privacy | — |
| 9 | `section.login_widget` | 로그인 위젯(아이디/비밀번호/로그인 유지) | — |
| 10 | `div.xe-widget-wrapper` | 관리자 바(로그아웃/최근 로그인/관리) | 로그인 시만 |

히어로 슬라이드 문구(4개 확인): "CREATE A GOOD DESIGN WITH THE POSSIILITY OF TECHNOLOGY",
"SHARING, PUBLISHING. & PLEASURE.", "MAKING WEB CULTURES", "EVOLUTION & INNOVATION TOGETHER".

로드되는 CSS(테마/스킨 계층 구조):
`layout.css`, `welcome.css`, `webfont.css`, `idangerous.swiper.css`, `widget.login.css`,
`xeicon.min.css`, 컴파일된 `*.rhymix.scss.min.css`, 모듈 스킨
`modules/board/skins/xedition/board.default.css`.

## 3. 뉴버전 메인 페이지 구조 (실측, 수정 후)

| # | 요소 | 내용 |
|---|---|---|
| 1 | `header.border-b.bg-white.shadow-sm` | 로고(Rhymix-TS) + 메뉴 + 다크모드 토글 + 사용자/로그아웃 |
| 2 | `nav` | Board / Notice / Q&A ✅ (수정으로 정상 렌더) |
| 3 | `main` (온보딩) | "설치가 성공적으로 완료되었습니다" + 사이트 구성 가이드 카드 5개 (관리자 로그인 시만) |
| 4 | `main.container.mx-auto.px-4.py-8` | 게시판 목록 ✅ (수정으로 컨테이너 정상) |
| 5 | `footer` × 3 | ⚠️ 아래 §4 G4 참고 |

- 히어로/캐러셀: **없음**(`[class*=hero|carousel|swiper|visual]` 매치 0)
- 게시판 표 헤더: 번호/제목/작성자/작성일/조회수/추천수 (6컬럼)

## 4. 격차 인벤토리

| # | 항목 | 레거시 | 뉴버전 | 분류 | 판정 |
|---|---|---|---|---|---|
| G1 | 인덱스 모듈 종류 | page(디자인 환영 페이지) | board(게시판 목록) | **구조** | 격차 — 시드 선택 문제 |
| G2 | 히어로 캐러셀 | swiper 6슬라이드 | 없음 | 디자인 | 격차 |
| G3 | 메인 콘텐츠 섹션 | intro + guide(6카드) + connect(4카드) | 없음 | 디자인 | 격차 |
| G4 | 푸터 개수 | 1개 | **3개**(“Powered by Rhymix-TS” 2회 중복) | **버그** | 격차 — 즉시 수정 대상 |
| G5 | `<main>` 중첩 | 1개 | **3개(2단 중첩)** | **버그/접근성** | 격차 — 즉시 수정 대상 |
| G6 | 게시판 목록 컬럼 | 번호/제목/글쓴이/날짜/조회 수/(빈) | 번호/제목/작성자/작성일/조회수/추천수 | 동등 | **격차 없음**(라벨만 상이) |
| G7 | 게시판 상단 컨트롤 | 쓰기·태그·설정·게시물 관리 + 카테고리/대상 검색 | 글쓰기·검색(제목/내용/작성자)·정렬(최신/추천/조회)·카드형 | 부분 | 부분 격차(태그·게시물 관리 부재 / 정렬·카드형은 뉴버전 우위) |
| G8 | 모듈 스킨 시스템 | 모듈별 스킨 CSS(`skins/xedition/…`) | 테마 시스템 존재(SPEC-THEME-001)하나 방문자 화면에 스킨 미적용 | 구조 | 격차 |
| G9 | 로그인 위젯(메인 노출) | `section.login_widget` 존재 | 헤더 링크만 | 위젯 | 격차(우선순위 낮음) |
| G10 | 웹폰트 | `webfont.css` | 없음(시스템 폰트) | 디자인 | 격차 |
| G11 | 관리자 바 | 하단 고정 바(로그아웃/최근 로그인/관리) | 온보딩 패널로 대체(성격 다름) | 다름 | 격차 아님 — 설계 차이 |
| G12 | 다크모드 | 없음(`color_scheme_light` 고정) | 토글 지원 | — | **뉴버전 우위 — 유지** |

## 5. 판정 요약

- **버그(G4, G5)**: 푸터 3중 렌더·`<main>` 3중 중첩. 디자인과 무관한 마크업 결함으로,
  작업량이 작고 접근성·SEO에 직접 영향. 최우선.
- **구조(G1, G8)**: 인덱스 모듈을 page로 시딩할지 여부 + 방문자 화면 스킨 적용 경로.
  결정이 필요한 항목이며 이후 디자인 작업의 전제가 된다.
- **디자인(G2, G3, G10)**: 히어로·섹션·웹폰트. 실제 디자인 자산 제작이 필요한 영역으로
  작업 성격이 앞의 둘과 다르다.
- **격차 없음/우위(G6, G11, G12)**: 게시판 컬럼은 이미 동등, 다크모드는 뉴버전 우위.
  레거시로의 퇴행을 금지해야 하는 항목.

## 6. 다음 단계 제안

G4·G5(버그)를 먼저 마감하고, G1(인덱스 모듈 정책)을 사용자 결정으로 확정한 뒤,
G2·G3·G10(디자인)은 별도 마일스톤으로 분리하는 것을 권장한다. G6·G12는 spec.md의
Out of Scope(퇴행 금지)로 명시한다.
