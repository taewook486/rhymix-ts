# SPEC-RHYMIX-001 구현 계획 v3.0

**작성일:** 2026-03-01
**기준:** 브라우저 비교 분석 + 갭 분석 + 요구사항 보충
**접근 방식:** 시각적 임팩트 우선순위 (사용자가 먼저 보는 것부터)
**전체 진행률:** 70% 완료 (P1 기능 30% 미구현)

---

## 실행 요약

### 현재 상태 vs 목표 상태

| 구분 | ASIS (Rhymix PHP) | TOBE (Rhymix-TS) | 격차 |
|------|-------------------|------------------|------|
| **홈페이지** | 슬라이더 + 웰컴 가이드 + 로그인 위젯 | 텍스트 히어로만 | 큼 |
| **네비게이션** | 4개 메뉴 활성 | 비어있음 | 큼 |
| **게시판** | 목록/쓰기/검색 작동 | /ko/boards 404 | 큼 |
| **로그인** | /board/login 작동 | /ko/members/login 404 | 큼 |
| **관리자** | 완전한 관리 패널 | 14개 메뉴 완료 | 중간 |
| **백엔드** | 32개 모듈 | 15개 완전 구현, 9개 부분 | 중간 |

### 핵심 발견사항

1. **치명적 문제 (P0)**: 게시판 404, 로그인 라우팅, 네비게이션 비어있음
2. **시각적 격차 (P1)**: 홈페이지 슬라이더, 웰컴 가이드, 사이드바 위젯
3. **기능적 격차 (P1)**: WYSIWYG 에디터, 메시지 시스템, 알림센터 UI
4. **완료된 기능 (70%)**: 핵심 CRUD, 인증, 관리자 패널 기본

---

## Sprint 1: 치명적 시각 기능 (Week 1-3)

**목표:** TOBE를 ASIS와 시각적으로 비교 가능한 상태로 만들기

### Week 1: 네비게이션 & 홈페이지 핵심

#### 1.1 네비게이션 메뉴 컴포넌트 (P0-03)
**요구사항:** REQ-NAV-001 ~ REQ-NAV-004

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/layout/Header.tsx` | 수정 | 네비게이션 메뉴 렌더링 추가 |
| `components/layout/Navigation.tsx` | 생성 | 네비게이션 메뉴 컴포넌트 |
| `components/layout/MobileNav.tsx` | 생성 | 모바일 햄버거 메뉴 |
| `app/actions/menu.ts` | 확인 | getMenus() 함수 확인 |

**구현 내용:**
```
네비게이션 항목:
- Welcome → /
- Free Board → /ko/boards
- Q&A → /ko/qna
- Notice → /ko/notice
```

**완료 조건:**
- [ ] 헤더에 4개 메뉴 표시
- [ ] 현재 페이지 하이라이트
- [ ] 모바일 햄버거 메뉴 작동
- [ ] 메뉴 클릭 시 해당 페이지로 이동

---

#### 1.2 홈페이지 비주얼 슬라이더 (P0-04)
**요구사항:** REQ-HOME-001 ~ REQ-HOME-003

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/home/HeroSlider.tsx` | 생성 | Swiper 기반 슬라이더 |
| `app/[lang]/page.tsx` | 수정 | 슬라이더 컴포넌트 통합 |
| `lib/slider-data.ts` | 생성 | 슬라이드 데이터 |

**기술 선택:**
- Swiper.js (ASIS와 동일) 또는 Embla Carousel (경량)
- 이미지 최적화: Next.js Image 컴포넌트
- 반응형: 모바일/태블릿/데스크톱 대응

**완료 조건:**
- [ ] 4개 슬라이드 표시
- [ ] 자동 재생 (5초 간격)
- [ ] 터치 스와이프 지원
- [ ] JS 비활성화 시 첫 슬라이드 정적 표시

---

#### 1.3 웰컴 가이드 섹션 (P1-01)
**요구사항:** REQ-HOME-004 ~ REQ-HOME-005

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/home/WelcomeGuide.tsx` | 생성 | 웰컴 가이드 섹션 |
| `components/home/GuideItem.tsx` | 생성 | 개별 가이드 아이템 |

**구조:**
```
웰컴 가이드:
├── BUILD YOUR SITE (6개 항목)
│   ├── 사이트 설정 가이드
│   ├── 게시판 생성
│   ├── 메뉴 구성
│   ├── 테마 변경
│   ├── 위젯 배치
│   └── 권한 설정
│
└── GET INVOLVED (4개 링크)
    ├── 커뮤니티 포럼
    ├── GitHub 저장소
    ├── 문서 센터
    └── 기여 가이드
```

**완료 조건:**
- [ ] 10개 가이드 항목 표시
- [ ] 아이콘 + 제목 + 설명 구조
- [ ] 클릭 시 해당 문서/페이지로 이동

---

### Week 2: 게시판 & 로그인 라우팅

#### 2.1 게시판 목록 페이지 404 해결 (P0-01)
**요구사항:** REQ-BOARD-001 ~ REQ-BOARD-006

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/boards/page.tsx` | 생성/수정 | 게시판 목록 페이지 |
| `components/board/BoardList.tsx` | 수정 | 게시물 목록 테이블 |
| `components/board/BoardHeader.tsx` | 생성 | 서브 헤더 (배경 포함) |
| `components/board/BoardSearch.tsx` | 생성 | 검색 폼 |
| `components/board/Pagination.tsx` | 확인 | 페이지네이션 |

**페이지 구조:**
```
/ko/boards (자유게시판)
├── 서브 헤더 (배경 이미지 + "Free Board" 타이틀)
├── 게시물 목록 테이블
│   ├── 번호 | 제목 | 글쓴이 | 날짜 | 조회수
│   └── 정렬 기능 (날짜/조회수)
├── 버튼 영역 (쓰기 | 태그)
└── 검색 폼
```

**완료 조건:**
- [ ] /ko/boards 페이지 정상 로드 (404 해결)
- [ ] 게시물 목록 테이블 표시
- [ ] 쓰기 버튼 표시
- [ ] 검색 기능 작동
- [ ] 정렬 기능 작동

---

#### 2.2 로그인 라우트 리다이렉트 (P0-02)
**요구사항:** REQ-LOGIN-001

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/members/login/page.tsx` | 생성 | /ko/signin으로 리다이렉트 |
| `middleware.ts` | 수정 | 레거시 경로 리다이렉트 처리 |

**리다이렉트 규칙:**
```
/ko/members/login → /ko/signin
/ko/members/signup → /ko/signup
/board/login → /ko/signin (레거시 호환)
```

**완료 조건:**
- [ ] /ko/members/login 접근 시 /ko/signin으로 리다이렉트
- [ ] 301 영구 리다이렉트 적용
- [ ] 기존 쿼리 파라미터 보존 (redirect 등)

---

#### 2.3 로그인 페이지 UI 개선 (P1-로그인)
**요구사항:** REQ-LOGIN-002 ~ REQ-LOGIN-005

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/signin/page.tsx` | 수정 | 로그인 폼 UI 개선 |
| `components/auth/LoginForm.tsx` | 수정 | Remember me 추가 |
| `app/actions/auth.ts` | 확인 | 세션 지속 로직 |

**UI 구조:**
```
로그인 폼:
├── 아이디 입력 필드
├── 비밀번호 입력 필드
├── 로그인 유지 체크박스
├── [로그인] 버튼
└── 하단 링크
    ├── ID/PW 찾기
    └── 회원가입
```

**완료 조건:**
- [ ] Remember me 체크박스 추가
- [ ] 체크 시 30일 세션 지속
- [ ] ID/PW 찾기 링크 표시
- [ ] CSRF 토큰 포함

---

### Week 3: 핵심 게시판 기능

#### 3.1 게시판 쓰기 버튼 & 폼 (P1-04)
**요구사항:** REQ-BOARD-002, REQ-BOARD-004

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/boards/write/page.tsx` | 확인 | 글쓰기 페이지 |
| `components/board/WriteButton.tsx` | 생성 | 쓰기 버튼 컴포넌트 |
| `components/board/PostForm.tsx` | 확인 | 글쓰기 폼 |

**완료 조건:**
- [ ] 쓰기 버튼 클릭 시 /ko/boards/write로 이동
- [ ] 비로그인 시 로그인 프롬프트 표시
- [ ] 글 작성 후 목록으로 리다이렉트

---

#### 3.2 게시판 검색 & 정렬 (P1-05, P1-06)
**요구사항:** REQ-BOARD-003, REQ-BOARD-005

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/board/BoardSearch.tsx` | 생성 | 검색 폼 컴포넌트 |
| `components/board/SortableHeader.tsx` | 생성 | 정렬 가능한 헤더 |
| `app/actions/posts.ts` | 수정 | 검색/정렬 로직 |

**검색 옵션:**
- 제목 검색
- 내용 검색
- 제목+내용
- 글쓴이

**정렬 옵션:**
- 날짜 (기본, 내림차순)
- 조회수 (내림차순)
- 추천수 (내림차순)

**완료 조건:**
- [ ] 검색어 입력 후 결과 필터링
- [ ] 컬럼 헤더 클릭 시 정렬
- [ ] 정렬 상태 표시 (화살표 아이콘)

---

#### 3.3 사이드바 로그인 위젯 (REQ-WIDGET-001)
**요구사항:** REQ-WIDGET-001, REQ-WIDGET-002

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/widgets/LoginWidget.tsx` | 생성 | 로그인 위젯 |
| `components/widgets/MemberWidget.tsx` | 생성 | 회원 정보 위젯 |
| `components/layout/Sidebar.tsx` | 수정 | 위젯 배치 |

**위젯 구조:**
```
비로그인 시 (LoginWidget):
├── 환영 메시지
├── ID 입력
├── PW 입력
├── 로그인 유지
├── [로그인] 버튼
└── ID/PW 찾기 | 회원가입

로그인 시 (MemberWidget):
├── 사용자 이름
├── 프로필 링크
├── 설정 링크
├── 로그아웃 버튼
└── 포인트/등급 표시
```

**완료 조건:**
- [ ] 비로그인 시 로그인 위젯 표시
- [ ] 로그인 시 회원 위젯으로 전환
- [ ] 위젯에서 직접 로그인 가능

---

## Sprint 2: 콘텐츠 기능 (Week 4-6)

**목표:** 콘텐츠 생성/관리 기능 완성

### Week 4: WYSIWYG 에디터

#### 4.1 TipTap 에디터 통합
**요구사항:** REQ-EDT-001 ~ REQ-EDT-004

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/editor/WysiwygEditor.tsx` | 생성 | 메인 에디터 컴포넌트 |
| `components/editor/toolbar/FormatToolbar.tsx` | 생성 | 서식 도구모음 |
| `components/editor/toolbar/InsertMenu.tsx` | 생성 | 삽입 메뉴 |
| `components/editor/MediaUploader.tsx` | 생성 | 미디어 업로드 |
| `components/editor/CodeBlock.tsx` | 생성 | 코드 블록 |
| `app/actions/editor.ts` | 생성 | 에디터 액션 |
| `package.json` | 수정 | TipTap 패키지 추가 |

**에디터 기능:**
- 기본 서식 (굵게, 기울임, 밑줄)
- 제목 (H1-H6)
- 리스트 (순서/비순서)
- 링크 삽입
- 이미지 삽입 (드래그앤드롭)
- 코드 블록 (구문 강조)
- 표 삽입
- 실행 취소/재실행

**완료 조건:**
- [ ] TipTap 에디터 렌더링
- [ ] 이미지 업로드 작동
- [ ] 코드 구문 강조 작동
- [ ] 툴바 모든 기능 작동

---

#### 4.2 자동저장 & 드래프트 (P1-드래프트)
**요구사항:** REQ-EDT-003

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/editor/AutosaveIndicator.tsx` | 생성 | 자동저장 표시 |
| `components/editor/DraftManager.tsx` | 생성 | 드래프트 관리 |
| `app/actions/draft.ts` | 생성 | 드래프트 액션 |

**자동저장 기능:**
- 30초마다 자동 저장
- 저장 상태 표시 ("저장됨", "저장 중...")
- 드래프트 목록 관리
- 드래프트 복구 기능

**완료 조건:**
- [ ] 30초 간격 자동저장
- [ ] 저장 상태 인디케이터
- [ ] 드래프트 복원 가능

---

### Week 5: 메시지 시스템

#### 5.1 개인 메시지 UI
**요구사항:** REQ-MSG-001 ~ REQ-MSG-004

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/messages/page.tsx` | 생성 | 받은편지함 |
| `app/[lang]/messages/sent/page.tsx` | 생성 | 보낸편지함 |
| `app/[lang]/messages/new/page.tsx` | 생성 | 메시지 작성 |
| `app/[lang]/messages/[id]/page.tsx` | 생성 | 메시지 상세 |
| `components/messages/MessageList.tsx` | 생성 | 메시지 목록 |
| `components/messages/MessageForm.tsx` | 생성 | 메시지 작성 폼 |
| `app/actions/message.ts` | 생성 | 메시지 액션 |

**DB 마이그레이션:**
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id),
  subject TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**완료 조건:**
- [ ] 메시지 송수신 가능
- [ ] 읽음/안읽음 상태 표시
- [ ] 받은/보낸편지함 구분
- [ ] 실시간 알림 연동

---

### Week 6: 알림센터 UI

#### 6.1 알림 센터 컴포넌트
**요구사항:** REQ-NTF-001 ~ REQ-NTF-004

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/notifications/NotificationCenter.tsx` | 생성 | 알림 센터 |
| `components/notifications/NotificationBadge.tsx` | 생성 | 알림 배지 |
| `components/notifications/NotificationItem.tsx` | 생성 | 알림 아이템 |
| `app/[lang]/notifications/page.tsx` | 생성 | 알림 목록 |
| `app/[lang]/notifications/settings/page.tsx` | 생성 | 알림 설정 |
| `app/actions/notifications.ts` | 수정 | markAllAsRead, updatePreferences |

**알림 유형:**
- 댓글 알림
- 메시지 알림
- 멘션 알림
- 시스템 알림

**완료 조건:**
- [ ] 헤더에 알림 배지 표시
- [ ] 드롭다운 알림 목록
- [ ] 실시간 알림 (Supabase Realtime)
- [ ] 알림 설정 페이지

---

## Sprint 3: UI 폴리시 & 관리자 (Week 7-9)

**목표:** 시각적 완성도 향상 및 관리자 기능 보강

### Week 7: 레이아웃 & 위젯

#### 7.1 레이아웃 빌더
**요구사항:** REQ-LAY-001 ~ REQ-LAY-004

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/admin/layout/page.tsx` | 생성 | 레이아웃 빌더 |
| `components/layout-builder/LayoutBuilder.tsx` | 생성 | 메인 빌더 |
| `components/layout-builder/Canvas.tsx` | 생성 | 캔버스 |
| `components/layout-builder/WidgetLibrary.tsx` | 생성 | 위젯 라이브러리 |
| `components/layout-builder/DraggableWidget.tsx` | 생성 | 드래그 가능 위젯 |
| `app/actions/layout.ts` | 생성 | 레이아웃 액션 |

**DB 마이그레이션:**
```sql
CREATE TABLE public.layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  layout_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**완료 조건:**
- [ ] 드래그앤드롭 위젯 배치
- [ ] 다중 컬럼 지원
- [ ] 레이아웃 저장/로드
- [ ] 반응형 프리뷰

---

#### 7.2 최근 게시물 & 공지 위젯 (P1-02, P1-03)
**요구사항:** REQ-WIDGET-003, REQ-WIDGET-004

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/widgets/RecentPostsWidget.tsx` | 생성 | 최근 게시물 |
| `components/widgets/NoticesWidget.tsx` | 생성 | 공지사항 |
| `app/actions/widgets.ts` | 수정 | getRecentPosts, getNotices |

**완료 조건:**
- [ ] 최근 5개 게시물 표시
- [ ] 최근 3개 공지 표시
- [ ] 클릭 시 해당 글로 이동

---

### Week 8: 관리자 로깅 & 휴지통

#### 8.1 관리자 로깅 UI
**요구사항:** REQ-LOG-001 ~ REQ-LOG-003

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/admin/logs/page.tsx` | 생성 | 로그 목록 |
| `app/[lang]/admin/logs/[id]/page.tsx` | 생성 | 로그 상세 |
| `app/[lang]/admin/logs/export/route.ts` | 생성 | CSV 내보내기 |
| `components/admin/logs/LogList.tsx` | 생성 | 로그 목록 |
| `components/admin/logs/LogFilter.tsx` | 생성 | 로그 필터 |

**완료 조건:**
- [ ] 활동 로그 목록 조회
- [ ] 날짜/사용자/액션 필터링
- [ ] CSV 내보내기

---

#### 8.2 휴지통/복원 UI
**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/admin/trash/page.tsx` | 생성 | 휴지통 |
| `components/admin/trash/TrashList.tsx` | 생성 | 휴지통 목록 |
| `app/actions/trash.ts` | 생성 | 복원/영구삭제 |

**완료 조건:**
- [ ] 삭제된 콘텐츠 목록
- [ ] 복원 기능
- [ ] 영구 삭제 기능

---

### Week 9: 접근성 & SEO

#### 9.1 접근성 개선
**요구사항:** REQ-A11Y-001 ~ REQ-A11Y-004

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `components/layout/SkipLink.tsx` | 생성 | 스킵 링크 |
| `components/common/AccessibleForm.tsx` | 생성 | 접근성 폼 |
| `app/layout.tsx` | 수정 | 스킵 링크 추가 |

**완료 조건:**
- [ ] 스킵 링크 추가
- [ ] 모든 폼에 label 연결
- [ ] ARIA 속성 보강
- [ ] 색상 대비 4.5:1 달성

---

#### 9.2 SEO 최적화
**요구사항:** REQ-SEO-001 ~ REQ-SEO-003

**파일:**
| 파일 | 작업 | 설명 |
|------|------|------|
| `app/[lang]/layout.tsx` | 수정 | 메타데이터 개선 |
| `components/seo/JsonLd.tsx` | 생성 | 구조화된 데이터 |
| `lib/seo-metadata.ts` | 생성 | SEO 유틸리티 |

**완료 조건:**
- [ ] 페이지별 고유 메타 태그
- [ ] Open Graph 태그
- [ ] JSON-LD 구조화된 데이터

---

## 파일 변경 요약

### Sprint 1 (Week 1-3)

| 파일 | 작업 | 주차 | 우선순위 |
|------|------|------|----------|
| `components/layout/Navigation.tsx` | 생성 | 1 | P0 |
| `components/layout/MobileNav.tsx` | 생성 | 1 | P0 |
| `components/layout/Header.tsx` | 수정 | 1 | P0 |
| `components/home/HeroSlider.tsx` | 생성 | 1 | P0 |
| `components/home/WelcomeGuide.tsx` | 생성 | 1 | P1 |
| `app/[lang]/boards/page.tsx` | 수정 | 2 | P0 |
| `components/board/BoardHeader.tsx` | 생성 | 2 | P0 |
| `components/board/BoardSearch.tsx` | 생성 | 2 | P1 |
| `app/[lang]/members/login/page.tsx` | 생성 | 2 | P0 |
| `middleware.ts` | 수정 | 2 | P0 |
| `components/widgets/LoginWidget.tsx` | 생성 | 3 | P1 |
| `components/widgets/MemberWidget.tsx` | 생성 | 3 | P1 |

### Sprint 2 (Week 4-6)

| 파일 | 작업 | 주차 | 우선순위 |
|------|------|------|----------|
| `components/editor/WysiwygEditor.tsx` | 생성 | 4 | P1 |
| `components/editor/toolbar/*.tsx` | 생성 | 4 | P1 |
| `app/actions/editor.ts` | 생성 | 4 | P1 |
| `app/[lang]/messages/page.tsx` | 생성 | 5 | P1 |
| `components/messages/*.tsx` | 생성 | 5 | P1 |
| `app/actions/message.ts` | 생성 | 5 | P1 |
| `components/notifications/NotificationCenter.tsx` | 생성 | 6 | P1 |
| `app/[lang]/notifications/page.tsx` | 생성 | 6 | P1 |

### Sprint 3 (Week 7-9)

| 파일 | 작업 | 주차 | 우선순위 |
|------|------|------|----------|
| `app/[lang]/admin/layout/page.tsx` | 생성 | 7 | P1 |
| `components/layout-builder/*.tsx` | 생성 | 7 | P1 |
| `components/widgets/RecentPostsWidget.tsx` | 생성 | 7 | P1 |
| `app/[lang]/admin/logs/page.tsx` | 생성 | 8 | P1 |
| `app/[lang]/admin/trash/page.tsx` | 생성 | 8 | P1 |
| `components/layout/SkipLink.tsx` | 생성 | 9 | P2 |
| `components/seo/JsonLd.tsx` | 생성 | 9 | P2 |

---

## 데이터베이스 마이그레이션

### Sprint 2 필요 마이그레이션

```sql
-- Week 5: 메시지 시스템
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, is_read);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- Week 7: 레이아웃 빌더
CREATE TABLE public.layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  layout_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 위험 평가

### 높은 위험 (Critical)

| 위험 | 영향 | 확률 | 완화 방안 |
|------|------|------|----------|
| 게시판 404 미해결 | 핵심 기능 차단 | 낮음 | Week 2 우선 처리 |
| TipTap 통합 복잡도 | 개발 지연 | 중간 | 기존 구현 참조, 단계적 통합 |
| 메시지 실시간 알림 | 기능 불안정 | 중간 | Supabase Realtime 안정적 사용 |

### 중간 위험 (High)

| 위험 | 영향 | 확률 | 완화 방안 |
|------|------|------|----------|
| 레이아웃 빌더 복잡도 | 개발 지연 | 높음 | 기본 기능만 우선 구현 |
| 브라우저 호환성 | UI 깨짐 | 중간 | 크로스 브라우저 테스트 |
| 성능 저하 (슬라이더) | 로딩 지연 | 중간 | 이미지 최적화, lazy loading |

### 낮은 위험 (Medium)

| 위험 | 영향 | 확률 | 완화 방안 |
|------|------|------|----------|
| SEO 개선 효과 미흡 | 검색 노출 저하 | 낮음 | 점진적 개선 |
| 접근성 기준 미달 | 법적 이슈 | 낮음 | WCAG 2.1 AA 준수 |

---

## 성공 기준

### Sprint 1 완료 기준
- [ ] 네비게이션 4개 메뉴 작동
- [ ] 홈페이지 슬라이더 표시
- [ ] /ko/boards 404 해결
- [ ] /ko/members/login 리다이렉트
- [ ] 사이드바 로그인 위젯 작동

### Sprint 2 완료 기준
- [ ] WYSIWYG 에디터로 글 작성 가능
- [ ] 개인 메시지 송수신 가능
- [ ] 알림 센터 실시간 알림
- [ ] 자동저장/드래프트 작동

### Sprint 3 완료 기준
- [ ] 레이아웃 빌더 위젯 배치
- [ ] 관리자 로그 조회/내보내기
- [ ] 접근성 WCAG 2.1 AA 준수
- [ ] SEO 메타 태그 완비

### 전체 완료 기준
- [ ] P0 기능 100% 구현
- [ ] P1 기능 100% 구현
- [ ] 단위 테스트 85%+ 커버리지
- [ ] E2E 테스트 핵심 경로 통과
- [ ] Lighthouse 성능 점수 80+

---

## 다음 단계

1. **즉시 시작:** Sprint 1 Week 1 - 네비게이션 메뉴 컴포넌트
2. **병렬 준비:** 데이터베이스 마이그레이션 스크립트 작성
3. **테스트 계획:** 각 스프린트별 E2E 테스트 시나리오 작성

---

**문서 버전:** 3.0
**마지막 업데이트:** 2026-03-01
**작성자:** core-planner agent
