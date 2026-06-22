# 레거시 Rhymix vs rhymix-ts — 첫 설치 Gap 분석 보고서

- 작성일: 2026-06-21
- 비교 대상:
  - 레거시: `D:\project\rhymix` (PHP, http://localhost:8080, MariaDB 10.11 / docker-compose)
  - 신버전: `D:\project\rhymix-ts` (Next.js 16 + Prisma, http://localhost:3000, PostgreSQL 16 / docker)
- 방법: 양쪽 모두 DB를 완전 초기화(볼륨 삭제 후 재생성)한 뒤, Playwright MCP로 설치 마법사부터 admin 계정(`admin` / `swbin046@`)으로 끝까지 진행하며 화면·이벤트를 비교
- 스크린샷: `legacy/`, `rhymix-ts/` 하위 디렉터리 참조

## 1. 설치 마법사 단계 비교

| 단계 | 레거시 (4단계) | rhymix-ts (4단계) | 비교 |
|---|---|---|---|
| 1 | 사용권 동의 | 라이선스 동의 | 동일 구조. rhymix-ts는 화면이 1페이지로 더 간결 (다국어 셀렉터, GPL 본문 풀텍스트 없음) |
| 2 | 설치 환경 확인 (PHP 버전/DB지원/퍼미션/세션/curl/gd/iconv/json/mcrypt/xml/mod_rewrite, 총 11항목) | 환경 자가진단 (Node 버전/env 변수 4종/uploads 쓰기/next-cache 쓰기/prisma client/SMTP/middleware.rewrite, 총 8항목) | rhymix-ts는 PHP 확장 모듈 체크 대신 Node/env/파일시스템 체크로 대체됨. **`middleware.rewrite` 항목이 WARN(timeout after 1500ms)으로 항상 실패** — 레거시의 `mod_rewrite` 체크(단순 정보성 `—`)보다 진단 실패율이 높음. 안내문도 "다음 단계 진행 가능 여부"에 대한 명시적 안내가 레거시보다 약함 |
| 3 | DB 정보 입력 (호스트/포트/ID/비밀번호/DB명/테이블 접두사) | 데이터베이스 설정 (호스트/포트/사용자/비밀번호/DB/스키마) | 구조는 동일. **rhymix-ts는 `.env`에 `DATABASE_URL`이 이미 있고 2단계에서 "OK"로 확인했음에도, 3단계에서 다시 수동 입력을 요구** — 입력값과 실제 사용 중인 env 값이 불일치할 경우의 동작이 불명확함 (UX상 중복/혼란 소지) |
| 4 | 관리자 계정 생성 (이메일/비밀번호/비밀번호 확인/닉네임/아이디/표준시간대/SSL/사이트잠금) | 관리자 계정 (이메일/사용자ID/비밀번호/비밀번호 확인/닉네임/시간대/SSL/SiteLock) | 필드 구성 거의 동일. SSL 기본값이 rhymix-ts는 **"항상 HTTPS 사용"이 기본 선택** — 로컬 http 개발 환경에서는 사용자가 매번 수동으로 "HTTPS 미사용"으로 바꿔야 함 (레거시는 기본값이 "아니오") |

공통 이슈: **양쪽 모두 브라우저 자동완성이 DB/관리자 비밀번호 필드에 의도하지 않은 값을 채워 넣음** (`autocomplete="off"` 또는 `new-password` 힌트 누락 추정). 레거시 콘솔에도 "Input elements should have autocomplete attributes" 경고가 실제로 출력됨.

## 2. 설치 완료 후 동작 비교 (핵심 Gap)

| 항목 | 레거시 | rhymix-ts | Gap |
|---|---|---|---|
| 설치 완료 후 자동 로그인 | **자동 로그인됨** (`설치 완료` → 즉시 admin 세션으로 메인 진입) | **자동 로그인 안 됨** (`/install/complete` → 로그인 링크/대시보드 링크 클릭 필요) | 🔴 기능 누락 |
| 설치 직후 홈페이지 | 기본 XEDITION 테마 적용, 배너/HELLO WORLD 위젯/GNB 메뉴(Welcome, Free Board, Q&A, Notice) 표시 | **"No index module configured for this domain."** 만 표시, GNB 메뉴 빈 목록 | 🔴 핵심 기능 누락 — 도메인의 index 모듈/메뉴 연결이 설치 과정에 없음 |
| 기본 콘텐츠 시드 | 샘플 게시글 2건 자동 생성 ("Welcome to Rhymix", "Welcome to Mobile Rhymix") | 문서 0건 (모듈 인스턴스만 3개 생성: board/qna/notice) | 🟡 모듈은 생성되나 콘텐츠/메뉴 바인딩 누락 |
| 메뉴 구성 | 설치 시 사이트맵 자동 구성 (Welcome/Free Board/Q&A/Notice) | `/admin/menu` → "등록된 메뉴가 없습니다" | 🔴 메뉴 자동 생성 누락 |
| 로그인 후 세션 반영 | 상단 헤더에 즉시 `admin` 닉네임 + 로그아웃 메뉴 표시 | **로그인 성공(POST /login → 303) 후에도 공개 헤더는 계속 "로그인" 링크 표시.** `/admin` 진입 시에는 사이드바 우측에 "관리자 1 / 로그아웃"이 표시되어 인증은 되어 있음 — **공개 레이아웃 헤더와 관리자 레이아웃 헤더의 세션 표시가 불일치** | 🔴 UI 버그 — 세션 상태 동기화 결함 |
| 세션 쿠키 만료/보안 | 설치마다 새 세션 발급 | `NEXTAUTH_SECRET`이 `.env`에 고정되어 있어, **DB를 초기화해도 이전 Playwright 세션의 JWT 쿠키가 여전히 유효한 사용자(`admin@e2e.local`)로 인식됨** — `/login` 접근 시 307로 홈으로 리다이렉트되어 로그인 폼 자체에 도달 불가했음 (쿠키 삭제 후에야 재현 가능) | 🟡 운영 관점 주의사항 — 시크릿 로테이션 없이 DB만 초기화하면 graceful하지 않은 "유령 세션"이 남음 |

## 3. 관리자 화면 구조 비교

| 영역 | 레거시 GNB | rhymix-ts 사이드바 |
|---|---|---|
| 대시보드 | 대시보드 (회원/최근 글/최근 댓글 카드) | 대시보드 (사이트 현황 4종/업데이트 알림/방문자 통계/모듈 인스턴스 수/최근 문서/최근 댓글) — **항목 수와 정보량이 더 풍부함** (업데이트 알림, 30일 통계 등 레거시에 없는 위젯 포함) |
| 콘텐츠 | 사이트 제작/편집, 회원, 콘텐츠 (단일 메뉴들의 평면 구조) | 콘텐츠(게시판/위젯/페이지/문서/댓글/설문), 사이트 설정(일반/메뉴/디자인/알림/보안/내보내기/가져오기), 회원, 시스템(로그/헬스/캐시) — **카테고리 그룹화가 더 체계적이고 항목 수도 많음** (위젯 시스템, 시스템 헬스, 캐시 관리, 내보내기/가져오기는 레거시 GNB 1depth에 없음) |
| 회원 관리 | 회원 메뉴 하나로 진입 후 세부 탐색 | 회원 관리/회원 그룹/회원 등록/회원 설정으로 사전 세분화 | rhymix-ts가 네비게이션 depth를 줄이는 방향으로 재설계됨 |
| 관리자 유틸리티 | 하단 푸터에 "관리자 메뉴 초기화 \| 캐시파일 재생성 \| 세션 정리 \| 코어 파일 정리 \| 서버 환경 표시 \| 버그 리포트" | 우측 패널에 "관리자 메뉴 초기화 / 세션 정리" 2종 + 각 기능 설명 텍스트 포함 | 레거시 대비 유틸리티 항목 수가 줄었음 (캐시파일 재생성/코어 파일 정리/서버 환경 표시 동급 기능이 안 보임 — `/admin/system`, `/admin/system/cache`로 재배치된 것으로 추정되나 직접 미확인) |

## 4. 발견된 버그/결함 (우선순위순)

1. **[🔴 Critical] 설치 후 도메인에 index 모듈/메뉴가 연결되지 않음** — 신규 설치 사이트는 첫 화면에 에러성 문구("No index module configured for this domain.")만 노출되어 실사용 불가. 레거시는 기본 테마+메뉴+콘텐츠가 즉시 동작.
2. **[🔴 Critical] 공개 페이지 헤더가 로그인 상태를 반영하지 못함** — 로그인 성공 및 `/admin` 인증은 정상이나, 공개 레이아웃의 헤더 컴포넌트가 세션을 다시 읽지 않아 "로그인" 링크가 계속 노출됨 (캐싱 또는 세션 컨텍스트 미갱신 의심).
3. **[🟡 Major] 설치 완료 후 자동 로그인 누락** — 레거시 대비 UX 단계가 하나 더 필요함.
4. **[🟡 Major] 설치 2단계 환경진단의 `middleware.rewrite` 체크가 항상 WARN/timeout** — 진단 신뢰도 저하.
5. **[🟢 Minor] DB 설정 단계가 이미 검증된 `.env`의 `DATABASE_URL`을 재사용하지 않고 재입력을 요구.**
6. **[🟢 Minor] SSL 기본값이 "항상 HTTPS 사용"** — 로컬 개발 시 매번 수동 전환 필요 (레거시는 기본 "아니오").
7. **[🟢 Info] `NEXTAUTH_SECRET` 고정 + DB만 초기화 시 이전 테스트 세션 쿠키가 유효한 상태로 남음** — 테스트/스테이징 환경 운영 가이드에 "시크릿 로테이션 또는 쿠키 전체 삭제" 안내 필요.

## 5. 상대적으로 개선된 점 (rhymix-ts가 레거시보다 우수)

- 설치 환경 자가진단이 env 변수, 파일시스템 쓰기 권한, Prisma 클라이언트 로드까지 구조적으로 점검 (레거시는 PHP 확장 존재 여부만 단순 체크)
- 관리자 대시보드의 정보량이 더 풍부함 (방문자 통계 30일 집계, 업데이트 매니페스트 체크 등)
- 관리자 사이드바 카테고리 구조가 더 체계적 (콘텐츠/사이트 설정/회원/시스템으로 명확히 분리)
- 관리자 유틸리티에 기능 설명 텍스트(REQ 번호 포함)가 함께 노출되어 운영자 이해도가 높음

## 6. 스크린샷 목록

- `legacy/01-home-after-install.png` — 레거시 설치 완료 후 홈
- `legacy/02-admin-dashboard.png` — 레거시 관리자 대시보드
- `rhymix-ts/01-license.png` ~ `04-admin-config.png` — 설치 마법사 1~4단계
- `rhymix-ts/05-install-complete.png` — 설치 완료 화면 (자동 로그인 없음)
- `rhymix-ts/06-home-no-index-module.png` — 설치 후 홈 ("No index module" 에러성 문구)
- `rhymix-ts/07-login.png` — 로그인 화면
- `rhymix-ts/08-admin-dashboard.png` — 관리자 대시보드
- `rhymix-ts/09-admin-members.png` — 회원 관리
- `rhymix-ts/10-admin-menu.png` — 메뉴 관리 (메뉴 없음)
- `rhymix-ts/11-admin-modules.png` — 모듈 인스턴스 (board/qna/notice 3개, 메뉴 미연결)
