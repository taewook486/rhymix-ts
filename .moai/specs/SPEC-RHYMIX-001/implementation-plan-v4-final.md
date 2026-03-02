# SPEC-RHYMIX-001 최종 구현 계획

**버전:** 4.0.0 (Final)
**작성일:** 2026-03-01
**상태:** 승인 대기
**방법론:** Hybrid (TDD + DDD)
**예상 기간:** 9주 (3개 스프린트)

---

## 1. 실행 요약

### 1.1 현재 상태 vs 목표 상태

| 구분 | ASIS (Rhymix PHP) | TOBE (현재) | 목표 |
|------|-------------------|-------------|------|
| 백엔드 모듈 | 32개 모듈 | 21/23 구현 (91.3%) | 100% 핵심 기능 |
| 프론트엔드 컴포넌트 | 스킨 시스템 | 116개 컴포넌트 | 통합 완료 |
| 라우팅 | 쿼리 파라미터 | 파일 기반 (부분) | 전체 라우트 작동 |
| UI/UX | XEDITION 테마 | Tailwind + shadcn | ASIS 기능 매칭 |

### 1.2 전체 완성도

```
전체 완성도: 70%

├── 백엔드 구현:     91.3% ████████████████████░
├── 프론트엔드 구현:  80%   ████████████████░░░░
├── 라우팅 통합:      40%   ████████░░░░░░░░░░░░
├── 컴포넌트 통합:    50%   ██████████░░░░░░░░░░
└── 비주얼 요소:      30%   ██████░░░░░░░░░░░░░░
```

### 1.3 주요 발견 사항

1. **라우팅 불일치**: `/ko/boards` (복수) vs `/ko/board` (단수) 라우트 충돌로 404 발생
2. **컴포넌트 존재**: 대부분의 컴포넌트가 이미 구현됨, 통합만 필요
3. **네비게이션 비어있음**: 메뉴 항목이 데이터베이스에 있지만 UI에 표시되지 않음
4. **비주얼 요소 누락**: 히어로 슬라이더, 웰컴 가이드 섹션 미구현

---

## 2. 긴급 이슈 (P0 - 즉시 조치 필요)

### P0-01: 게시판 목록 404 오류

**현상:** `/ko/boards` 접근 시 404 에러 발생
**원인:** 라우트가 `/ko/board` (단수)로 정의됨
**해결 방안:**

```
옵션 A: 리다이렉트 추가 (권장)
/ko/boards → /ko/board (301 리다이렉트)

옵션 B: 복수 라우트 생성
app/[locale]/(main)/boards/page.tsx 생성
```

**수정 파일:**
- `middleware.ts` (리다이렉트 로직 추가)
- 또는 `app/[locale]/(main)/boards/page.tsx` (새 파일)

**완료 기준:**
- [ ] `/ko/boards` 접근 시 게시판 목록 페이지 표시
- [ ] HTTP 상태 코드 200 반환

---

### P0-02: 로그인 페이지 404 오류

**현상:** `/ko/members/login` 접근 시 404 에러
**원인:** 로그인 경로가 `/ko/signin`으로 변경됨
**해결 방안:**

```typescript
// middleware.ts에 추가
if (pathname.includes('/members/login')) {
  return NextResponse.redirect(new URL('/ko/signin', request.url))
}
```

**수정 파일:**
- `middleware.ts`

**완료 기준:**
- [ ] `/ko/members/login` → `/ko/signin` 자동 리다이렉트
- [ ] 기존 북마크 호환성 유지

---

### P0-03: 네비게이션 메뉴 비어있음

**현상:** 헤더 네비게이션에 메뉴 항목 없음
**원인:** 메뉴 데이터 페칭 로직 미연결
**해결 방안:**

```typescript
// components/layout/MainNav.tsx 수정
// 데이터베이스에서 메뉴 항목 조회 후 렌더링
const menuItems = await getMenuItems('header')
```

**수정 파일:**
- `components/layout/MainNav.tsx`
- `lib/actions/menu.ts` (필요시)

**완료 기준:**
- [ ] Welcome, Free Board, Q&A, Notice 메뉴 표시
- [ ] 현재 페이지 활성 상태 표시
- [ ] 모바일 햄버거 메뉴 작동

---

### P0-04: 홈페이지 비주얼 요소 누락

**현상:** 히어로 슬라이더/이미지 없음
**원인:** 미구현
**해결 방안:**

```
옵션 A: Swiper 슬라이더 (ASIS 호환)
- Swiper 라이브러리 사용
- 4개 슬라이드 구현

옵션 B: 모던 히어로 섹션 (권장)
- 정적 히어로 이미지 + 텍스트 오버레이
- 성능 최적화
```

**생성 파일:**
- `components/home/HeroSection.tsx`
- `components/home/HeroSlider.tsx` (옵션 A)

**수정 파일:**
- `app/[locale]/(main)/home/page.tsx`

**완료 기준:**
- [ ] 홈페이지 상단에 비주얼 요소 표시
- [ ] 반응형 디자인 적용
- [ ] LCP (Largest Contentful Paint) < 2.5초

---

## 3. 디자인 시스템 요구사항

### 3.1 컬러 토큰 마이그레이션

| ASIS (XEDITION) | TOBE (Tailwind) | 용도 |
|-----------------|-----------------|------|
| Primary Blue | `--primary: 221.2 83.2% 53.3%` | CTA, 링크 |
| Background White | `--background: 0 0% 100%` | 페이지 배경 |
| Text Dark | `--foreground: 222.2 84% 4.9%` | 본문 텍스트 |
| Border Gray | `--border: 214.3 31.8% 91.4%` | 테두리 |
| Error Red | `--destructive: 0 84.2% 60.2%` | 에러, 삭제 |

### 3.2 타이포그래피 시스템

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `text-xs` | 12px | 작은 라벨 |
| `text-sm` | 14px | 본문 작은, 설명 |
| `text-base` | 16px | 본문 기본 |
| `text-lg` | 18px | 큰 본문 |
| `text-xl` | 20px | 섹션 헤더 |
| `text-2xl` | 24px | 카드 제목 |
| `text-3xl` | 30px | 페이지 제목 |

**폰트:** Inter (Google Fonts) - 이미 적용됨

### 3.3 스페이싱 스케일

| 클래스 | 값 | 용도 |
|--------|-----|------|
| `p-2` | 8px | 컴팩트 패딩 |
| `p-4` | 16px | 기본 패딩 |
| `p-6` | 24px | 카드 패딩 |
| `p-8` | 32px | 섹션 패딩 |
| `gap-4` | 16px | 기본 간격 |
| `gap-6` | 24px | 섹션 간격 |

### 3.4 컴포넌트 매핑 (ASIS → TOBE)

#### 네비게이션 컴포넌트
| ASIS | TOBE | 상태 | 액션 |
|------|------|------|------|
| Header navigation | `MainNav.tsx` | 존재 | UPDATE - 메뉴 항목 추가 |
| Mobile menu | 미구현 | 없음 | CREATE - `MobileNav.tsx` |
| Sub-header | 미구현 | 없음 | CREATE - `SubHeader.tsx` |

#### 홈페이지 컴포넌트
| ASIS | TOBE | 상태 | 액션 |
|------|------|------|------|
| Visual Slider | 미구현 | 없음 | CREATE - `HeroSlider.tsx` |
| Welcome Guide | 미구현 | 없음 | CREATE - `WelcomeGuide.tsx` |
| Login Widget | `LoginFormWidget.tsx` | 존재 | INTEGRATE - 사이드바 |
| Recent Posts | `RecentPostsWidget.tsx` | 존재 | INTEGRATE - 홈페이지 |
| Notice Widget | `NoticeWidget.tsx` | 존재 | INTEGRATE - 홈페이지 |

#### 게시판 컴포넌트
| ASIS | TOBE | 상태 | 액션 |
|------|------|------|------|
| Board list table | `BoardList.tsx` | 존재 | VERIFY - 라우트 작동 |
| Post form | `PostForm.tsx` | 존재 | VERIFY - 통합 확인 |
| Search form | `PostSearch.tsx` | 존재 | VERIFY - 통합 확인 |
| Pagination | `Pagination.tsx` | 존재 | VERIFY - 통합 확인 |

#### 인증 컴포넌트
| ASIS | TOBE | 상태 | 액션 |
|------|------|------|------|
| Login form | `SignInForm.tsx` | 존재 | ADD - 로그인 유지 옵션 |
| Signup form | `SignUpForm.tsx` | 존재 | VERIFY - 작동 확인 |
| OAuth buttons | `OAuthButtons.tsx` | 존재 | VERIFY - 작동 확인 |
| Password reset | `ResetPasswordForm.tsx` | 존재 | VERIFY - 작동 확인 |

---

## 4. 스프린트 분해

### Sprint 1: 긴급 라우팅 및 비주얼 (1~3주)

**목표:** P0 이슈 해결, 기본 사용성 확보

#### Week 1: 라우팅 수정

| 일차 | 작업 | 파일 | 완료 기준 |
|------|------|------|----------|
| 1-2 | P0-01: 게시판 라우트 수정 | `middleware.ts` 또는 새 페이지 | `/ko/boards` 200 응답 |
| 2-3 | P0-02: 로그인 리다이렉트 | `middleware.ts` | `/ko/members/login` 리다이렉트 |
| 3-4 | 라우트 테스트 작성 | `__tests__/routes.test.ts` | 85% 커버리지 |

#### Week 2: 네비게이션 및 메뉴

| 일차 | 작업 | 파일 | 완료 기준 |
|------|------|------|----------|
| 1-2 | P0-03: 네비게이션 활성화 | `components/layout/MainNav.tsx` | 4개 메뉴 표시 |
| 3-4 | 모바일 메뉴 구현 | `components/layout/MobileNav.tsx` | 햄버거 메뉴 작동 |
| 5 | 메뉴 활성 상태 | `components/layout/MainNav.tsx` | 현재 페이지 하이라이트 |

#### Week 3: 홈페이지 비주얼

| 일차 | 작업 | 파일 | 완료 기준 |
|------|------|------|----------|
| 1-2 | P0-04: 히어로 섹션 | `components/home/HeroSection.tsx` | 비주얼 요소 표시 |
| 3-4 | 위젯 통합 | `app/[locale]/(main)/home/page.tsx` | RecentPosts, Notice 위젯 |
| 5 | 스프린트 1 QA | 전체 | 모든 P0 완료 |

**Sprint 1 인수 테스트:**
- [ ] `/ko/boards` 접근 가능
- [ ] `/ko/members/login` 리다이렉트 작동
- [ ] 네비게이션 4개 메뉴 표시
- [ ] 홈페이지 비주얼 요소 표시
- [ ] 테스트 커버리지 85% 이상

---

### Sprint 2: 콘텐츠 기능 (4~6주)

**목표:** 콘텐츠 생성/관리 기능 완성

#### Week 4: WYSIWYG 에디터

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| 에디터 통합 | `components/editor/WysiwygEditor.tsx` | TipTap/ProseMirror 작동 |
| 미디어 업로드 | `components/editor/MediaUploader.tsx` | 이미지 업로드 작동 |
| 자동저장 | `components/editor/AutosaveIndicator.tsx` | 30초마다 자동저장 |

#### Week 5: 쪽지 시스템

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| 쪽지 목록 | `components/messages/MessageList.tsx` | 목록 표시 |
| 쪽지 상세 | `components/messages/MessageDetail.tsx` | 상세 보기 |
| 쪽지 작성 | `components/messages/MessageForm.tsx` | 발송 작동 |
| 실시간 알림 | `components/messages/MessageBell.tsx` | 새 메시지 알림 |

#### Week 6: 알림 센터

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| 알림 벨 | `components/notifications/NotificationBell.tsx` | 카운트 표시 |
| 알림 목록 | `app/[locale]/notifications/page.tsx` | 목록 표시 |
| 알림 설정 | `app/[locale]/notifications/settings/page.tsx` | 설정 저장 |
| 초안 관리 | `app/member/drafts/page.tsx` | 초안 목록 |

**Sprint 2 인수 테스트:**
- [ ] WYSIWYG 에디터 작동
- [ ] 이미지 업로드 작동
- [ ] 쪽지 송수신 작동
- [ ] 알림 실시간 표시
- [ ] 초안 저장/불러오기 작동

---

### Sprint 3: UI 폴리시 및 관리자 (7~9주)

**목표:** UI 완성도 향상, 관리자 기능 보강

#### Week 7: 레이아웃 빌더

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| 레이아웃 에디터 | `app/(admin)/admin/layout/page.tsx` | 드래그앤드롭 |
| 위젯 배치 | `components/widgets/WidgetContainer.tsx` | 위치 변경 |
| 레이아웃 미리보기 | `app/(admin)/admin/layout/preview/[layoutId]/page.tsx` | 미리보기 |

#### Week 8: 관리자 로그 UI

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| 로그 필터 | `components/admin/logs/LogFilter.tsx` | 필터 작동 |
| 로그 목록 | `components/admin/logs/LogList.tsx` | 페이지네이션 |
| 로그 상세 | `components/admin/logs/LogDetail.tsx` | 상세 보기 |
| CSV 내보내기 | `app/(admin)/admin/logs/page.tsx` | 내보내기 작동 |

#### Week 9: 최종 폴리시

| 작업 | 파일 | 완료 기준 |
|------|------|----------|
| 서브헤더 컴포넌트 | `components/layout/SubHeader.tsx` | 배경 이미지 |
| 웰컴 가이드 | `components/home/WelcomeGuide.tsx` | 가이드 섹션 |
| 접근성 개선 | 전체 | WCAG 2.1 AA |
| SEO 최적화 | 전체 | 메타 태그, 구조화 데이터 |
| 최종 QA | 전체 | TRUST 5 통과 |

**Sprint 3 인수 테스트:**
- [ ] 레이아웃 빌더 작동
- [ ] 관리자 로그 조회/내보내기
- [ ] 서브헤더 배경 이미지 표시
- [ ] 접근성 WCAG 2.1 AA 준수
- [ ] SEO 메타 태그 완료

---

## 5. 파일별 구현 맵

### Sprint 1 파일

#### 생성 파일
```
components/
├── home/
│   ├── HeroSection.tsx          # 히어로 섹션
│   └── HeroSlider.tsx           # 슬라이더 (옵션)
├── layout/
│   └── MobileNav.tsx            # 모바일 네비게이션
└── __tests__/
    └── routes.test.ts           # 라우트 테스트
```

#### 수정 파일
```
middleware.ts                    # 리다이렉트 로직
components/
├── layout/
│   └── MainNav.tsx             # 메뉴 항목 추가
app/
└── [locale]/
    └── (main)/
        └── home/
            └── page.tsx         # 위젯 통합
```

### Sprint 2 파일

#### 생성 파일
```
app/
├── [locale]/
│   └── notifications/
│       ├── page.tsx             # 알림 목록
│       └── settings/
│           └── page.tsx         # 알림 설정
lib/
└── actions/
    └── notification.ts          # 알림 액션
```

#### 수정 파일
```
components/
├── editor/
│   ├── WysiwygEditor.tsx        # 에디터 완성
│   └── MediaUploader.tsx        # 업로드 로직
├── messages/
│   ├── MessageList.tsx          # 스타일 개선
│   └── MessageDetail.tsx        # 스타일 개선
app/
└── member/
    └── drafts/
        └── page.tsx             # 초안 관리
```

### Sprint 3 파일

#### 생성 파일
```
components/
├── home/
│   └── WelcomeGuide.tsx         # 웰컴 가이드
├── layout/
│   └── SubHeader.tsx            # 서브헤더
app/
└── [locale]/
    └── (admin)/
        └── admin/
            └── layout/
                └── preview/
                    └── [layoutId]/
                        └── page.tsx  # 레이아웃 미리보기
```

#### 수정 파일
```
app/
├── (admin)/admin/
│   ├── layout/
│   │   └── page.tsx             # 레이아웃 빌더
│   └── logs/
│       └── page.tsx             # CSV 내보내기
components/
├── admin/logs/
│   ├── LogFilter.tsx            # 필터 개선
│   ├── LogList.tsx              # 페이지네이션
│   └── LogDetail.tsx            # 상세 보기
└── widgets/
    └── WidgetContainer.tsx      # 드래그앤드롭
```

---

## 6. 컴포넌트 매핑 테이블

### 네비게이션
| ASIS 컴포넌트 | TOBE 컴포넌트 | 액션 | 스프린트 |
|---------------|---------------|------|----------|
| Header navigation | `MainNav.tsx` | UPDATE | Sprint 1 |
| Mobile menu | `MobileNav.tsx` | CREATE | Sprint 1 |
| Sub-header | `SubHeader.tsx` | CREATE | Sprint 3 |
| Skip link | 미구현 | CREATE | Sprint 3 |

### 홈페이지
| ASIS 컴포넌트 | TOBE 컴포넌트 | 액션 | 스프린트 |
|---------------|---------------|------|----------|
| Visual Slider | `HeroSlider.tsx` | CREATE | Sprint 1 |
| Hero Section | `HeroSection.tsx` | CREATE | Sprint 1 |
| Welcome Guide | `WelcomeGuide.tsx` | CREATE | Sprint 3 |
| Login Widget | `LoginFormWidget.tsx` | INTEGRATE | Sprint 2 |
| Recent Posts | `RecentPostsWidget.tsx` | INTEGRATE | Sprint 1 |
| Notice Widget | `NoticeWidget.tsx` | INTEGRATE | Sprint 1 |

### 게시판
| ASIS 컴포넌트 | TOBE 컴포넌트 | 액션 | 스프린트 |
|---------------|---------------|------|----------|
| Board list | `BoardList.tsx` | VERIFY | Sprint 1 |
| Post item | `PostItem.tsx` | VERIFY | Sprint 1 |
| Post form | `PostForm.tsx` | VERIFY | Sprint 1 |
| Search | `PostSearch.tsx` | VERIFY | Sprint 1 |
| Pagination | `Pagination.tsx` | VERIFY | Sprint 1 |
| Category filter | `CategoryFilter.tsx` | VERIFY | Sprint 1 |

### 인증
| ASIS 컴포넌트 | TOBE 컴포넌트 | 액션 | 스프린트 |
|---------------|---------------|------|----------|
| Login form | `SignInForm.tsx` | UPDATE | Sprint 1 |
| Signup form | `SignUpForm.tsx` | VERIFY | Sprint 1 |
| OAuth buttons | `OAuthButtons.tsx` | VERIFY | Sprint 1 |
| Password reset | `ResetPasswordForm.tsx` | VERIFY | Sprint 1 |
| Remember me | `SignInForm.tsx` | ADD | Sprint 2 |

### 에디터
| ASIS 컴포넌트 | TOBE 컴포넌트 | 액션 | 스프린트 |
|---------------|---------------|------|----------|
| WYSIWYG editor | `WysiwygEditor.tsx` | UPDATE | Sprint 2 |
| Media uploader | `MediaUploader.tsx` | UPDATE | Sprint 2 |
| Autosave | `AutosaveIndicator.tsx` | UPDATE | Sprint 2 |
| Draft manager | `DraftManager.tsx` | UPDATE | Sprint 2 |

### 메시징
| ASIS 컴포넌트 | TOBE 컴포넌트 | 액션 | 스프린트 |
|---------------|---------------|------|----------|
| Message list | `MessageList.tsx` | UPDATE | Sprint 2 |
| Message detail | `MessageDetail.tsx` | UPDATE | Sprint 2 |
| Message form | `MessageForm.tsx` | UPDATE | Sprint 2 |
| Message bell | `MessageBell.tsx` | UPDATE | Sprint 2 |

### 알림
| ASIS 컴포넌트 | TOBE 컴포넌트 | 액션 | 스프린트 |
|---------------|---------------|------|----------|
| Notification bell | `NotificationBell.tsx` | UPDATE | Sprint 2 |
| Notification list | `app/[locale]/notifications/page.tsx` | UPDATE | Sprint 2 |
| Notification settings | `app/[locale]/notifications/settings/page.tsx` | UPDATE | Sprint 2 |

---

## 7. 인수 기준

### Sprint 1 인수 기준

#### 라우팅
- [ ] `/ko/boards` 접근 시 HTTP 200 응답
- [ ] `/ko/members/login` → `/ko/signin` 리다이렉트
- [ ] 모든 라우트에 대한 E2E 테스트 통과

#### 네비게이션
- [ ] Welcome, Free Board, Q&A, Notice 메뉴 표시
- [ ] 현재 페이지 활성 상태 시각적 표시
- [ ] 모바일 햄버거 메뉴 작동
- [ ] 키보드 네비게이션 작동

#### 비주얼
- [ ] 홈페이지 히어로 섹션 표시
- [ ] RecentPosts 위젯 최신 5개 표시
- [ ] Notice 위젯 최신 3개 표시

#### 품질
- [ ] 테스트 커버리지 85% 이상
- [ ] Lighthouse Performance 90+
- [ ] 타입 에러 0개
- [ ] 린트 에러 0개

### Sprint 2 인수 기준

#### 에디터
- [ ] WYSIWYG 에디터 텍스트 편집 작동
- [ ] 이미지 업로드/삽입 작동
- [ ] 30초마다 자동저장
- [ ] 초안 저장/불러오기 작동

#### 메시징
- [ ] 쪽지 송수신 작동
- [ ] 읽음/안읽음 상태 표시
- [ ] 실시간 새 메시지 알림
- [ ] 쪽지 검색 작동

#### 알림
- [ ] 알림 벨 카운트 표시
- [ ] 알림 클릭 시 관련 콘텐츠 이동
- [ ] 알림 설정 저장 작동
- [ ] 이메일 알림 (옵션) 작동

#### 품질
- [ ] 테스트 커버리지 85% 이상
- [ ] E2E 테스트 주요 시나리오 통과
- [ ] 보안 취약점 0개

### Sprint 3 인수 기준

#### 레이아웃
- [ ] 레이아웃 빌더 드래그앤드롭 작동
- [ ] 위젯 위치 변경/저장 작동
- [ ] 레이아웃 미리보기 작동
- [ ] 반응형 레이아웃 지원

#### 관리자
- [ ] 관리자 로그 필터링 작동
- [ ] 로그 페이지네이션 작동
- [ ] CSV 내보내기 작동
- [ ] 로그 상세 보기 작동

#### UI/UX
- [ ] 서브헤더 배경 이미지 표시
- [ ] 웰컴 가이드 섹션 표시
- [ ] WCAG 2.1 AA 준수
- [ ] 다크 모드 지원

#### SEO
- [ ] 모든 페이지 메타 태그 완료
- [ ] Open Graph 태그 완료
- [ ] 구조화 데이터 (JSON-LD) 완료
- [ ] sitemap.xml 생성

#### 최종 품질
- [ ] TRUST 5 게이트 통과
- [ ] 테스트 커버리지 85% 이상
- [ ] Lighthouse 모든 항목 90+
- [ ] Core Web Vitals 통과

---

## 8. 위험 및 대응 계획

### 기술적 위험

| 위험 | 영향 | 확률 | 대응 계획 |
|------|------|------|----------|
| 라우팅 복잡도 증가 | 높음 | 중간 | 미들웨어 철저 분석 후 접근 |
| 컴포넌트 통합 이슈 | 중간 | 높음 | 점진적 통합, 롤백 계획 |
| 성능 저하 | 중간 | 낮음 | 성능 모니터링, 최적화 |
| 타입 에러 | 낮음 | 중간 | strict 모드, 점진적 수정 |

### 일정 위험

| 위험 | 영향 | 확률 | 대응 계획 |
|------|------|------|----------|
| 예상보다 복잡한 작업 | 높음 | 중간 | 버퍼 시간 확보, 우선순위 조정 |
| 의존성 지연 | 중간 | 낮음 | 병렬 작업, 대안 준비 |
| 리소스 부족 | 높음 | 낮음 | 작업 분산, 외부 지원 |

---

## 9. 승인 요청

### 결정 필요 사항

#### 1. 히어로 섹션 구현 방식
- **옵션 A:** Swiper 슬라이더 (ASIS 호환)
- **옵션 B:** 모던 히어로 섹션 (성능 최적화)
- **권장:** 옵션 B (모던 히어로 섹션)

#### 2. 게시판 라우트 처리
- **옵션 A:** `/ko/boards` → `/ko/board` 리다이렉트
- **옵션 B:** `/ko/boards` 라우트 별도 생성
- **권장:** 옵션 A (리다이렉트)

#### 3. 스프린트 기간
- **제안:** 3주 × 3스프린트 = 9주
- **대안:** 2주 × 4스프린트 = 8주 (집중)
- **권장:** 3주 스프린트 유지

### 승인 체크리스트

- [ ] 기술 스택 승인
- [ ] 스프린트 구조 승인
- [ ] 위험 대응 계획 승인
- [ ] 인수 기준 승인
- [ ] 구현 시작 승인

---

## 10. 다음 단계

### 승인 후 실행 계획

1. **컨텍스트 초기화:** `/clear` 실행
2. **Sprint 1 시작:** P0-01 (게시판 라우트) 작업
3. **진행 추적:** TodoWrite로 일일 업데이트
4. **주간 회고:** 매주 금요일 진행 상황 검토

### 핸드오버 정보

```xml
<implementation_plan>
  <metadata>
    <spec_id>SPEC-RHYMIX-001</spec_id>
    <created_date>2026-03-01</created_date>
    <spec_version>4.0.0</spec_version>
    <agent_in_charge>manager-ddd</agent_in_charge>
  </metadata>

  <handover>
    <tag_chain>
      <tag id="TAG-001" name="routing-fix" dependencies="">
        게시판/로그인 라우트 수정
      </tag>
      <tag id="TAG-002" name="navigation-activation" dependencies="TAG-001">
        네비게이션 메뉴 활성화
      </tag>
      <tag id="TAG-003" name="hero-section" dependencies="TAG-002">
        홈페이지 비주얼 요소
      </tag>
      <tag id="TAG-004" name="editor-integration" dependencies="TAG-003">
        WYSIWYG 에디터 통합
      </tag>
      <tag id="TAG-005" name="messaging-system" dependencies="TAG-004">
        쪽지/알림 시스템
      </tag>
      <tag id="TAG-006" name="layout-builder" dependencies="TAG-005">
        레이아웃 빌더
      </tag>
      <tag id="TAG-007" name="admin-logging" dependencies="TAG-005">
        관리자 로그 UI
      </tag>
      <tag id="TAG-008" name="ui-polish" dependencies="TAG-006,TAG-007">
        최종 UI 폴리시
      </tag>
    </tag_chain>

    <library_versions>
      <library name="Next.js" version="15.x" reason="App Router 지원" />
      <library name="React" version="19.x" reason="최신 기능" />
      <library name="Tailwind CSS" version="3.4.x" reason="유틸리티 퍼스트" />
      <library name="shadcn/ui" version="latest" reason="컴포넌트 라이브러리" />
      <library name="TipTap" version="2.x" reason="WYSIWYG 에디터" />
      <library name="Swiper" version="11.x" reason="슬라이더 (옵션)" />
    </library_versions>

    <key_decisions>
      <decision id="DEC-001">
        모던 히어로 섹션 선택 (Swiper 대신 정적 이미지)
      </decision>
      <decision id="DEC-002">
        리다이렉트 방식으로 라우트 호환성 확보
      </decision>
      <decision id="DEC-003">
        3주 스프린트로 품질 보장
      </decision>
    </key_decisions>
  </handover>
</implementation_plan>
```

---

**문서 버전:** 4.0.0
**작성자:** core-planner (Philosopher Framework 적용)
**검토 필요:** 승인 후 manager-ddd에게 전달
