# SPEC-RHYMIX-001 전체 구현 계획 v3

**작성일:** 2026-02-28 (Updated)
**기준:** SPEC-RHYMIX-001 + Deep Research Analysis
**현재 진행률:** 70% Complete (P1 기능 30% 미구현)

---

## 📋 실행 요약 (업데이트)

| 단계 | 작업 | 우선순위 | 상태 | 예상 시간 |
|------|------|----------|------|----------|
| 1 | 기본 설정 및 코어 아키텍처 | P0 | ✅ 완료 | - |
| 2 | 게시판/문서/댓글 모듈 | P0 | ✅ 완료 | - |
| 3 | 회원/인증 시스템 | P0 | ✅ 완료 | - |
| 4 | 메뉴/페이지/위젯 | P1 | ✅ 완료 | - |
| 5 | 관리자 패널 기본 | P1 | ✅ 완료 | - |
| 6 | **WYSIWYG 에디터** | **P1** | **❌ 미구현** | 3-5일 |
| 7 | **개인 메시지 시스템** | **P1** | **❌ 미구현** | 5-7일 |
| 8 | **알림센터 UI** | **P1** | **❌ 미구현** | 3-5일 |
| 9 | **레이아웃 빌더** | **P1** | **❌ 미구현** | 5-7일 |
| 10 | **관리자 로깅 UI** | **P1** | **❌ 미구현** | 2-3일 |
| 11 | **임시 저장/드래프트** | **P1** | **❌ 미구현** | 2-3일 |
| 12 | 통합 검색 | P1 | 🔄 부분 완료 | 1-2일 |
| 13 | 테마/레이아웃 관리 | P2 | 🔄 UI만 완료 | 2-3일 |
| 14 | 기타 P2 기능 | P2 | ❌ 미구현 | 1-2주 |

---

## ✅ 완료된 작업 (70%)

### Phase 1: Foundation Setup
- ✅ Next.js 16 App Router 설정
- ✅ TypeScript 5.9+ strict mode
- ✅ Tailwind CSS + shadcn/ui
- ✅ Supabase client 연결
- ✅ ESLint와 Prettier

### Phase 2: Core Architecture
- ✅ Supabase PostgreSQL 16 데이터베이스 (30+ 테이블)
- ✅ Row-Level Security (RLS)
- ✅ 사용자 인증 세션
- ✅ Server Actions (167개 함수)

### Phase 3-7: 완전히 구현된 모듈 (15개)
- ✅ 게시판 모듈 (CRUD, 카테고리, 검색)
- ✅ 회원 모듈 (가입, 로그인, 프로필)
- ✅ 문서 모듈 (버전 관리 포함)
- ✅ 댓글 시스템 (중첩 댓글)
- ✅ 메뉴 관리
- ✅ 페이지 관리
- ✅ 위젯 시스템 (DB/Actions)
- ✅ 투표 시스템
- ✅ 파일 첨부
- ✅ 태그 시스템
- ✅ 스크랩/북마크
- ✅ 포인트 시스템
- ✅ RSS 피드
- ✅ 스팸 필터
- ✅ 설치 마법사

### Phase 10: 관리자 패널
- ✅ 대시보드 (`/admin`)
- ✅ 설정 관리 (`/admin/settings`)
- ✅ 회원 관리 (`/admin/members`)
- ✅ 게시판 관리 (`/admin/boards`)
- ✅ 메뉴 관리 (`/admin/menus`)
- ✅ 그룹 관리 (`/admin/groups`)
- ✅ 권한 관리 (`/admin/permissions`)
- ✅ 모듈 관리 (`/admin/modules`)
- ✅ 위젯 관리 (`/admin/widgets`)
- ✅ 페이지 관리 (`/admin/pages`)
- ✅ 테마 관리 (`/admin/themes`)
- ✅ 번역 관리 (`/admin/translations`)
- ✅ 미디어 관리 (`/admin/media`)
- ✅ 분석 대시보드 (`/admin/analytics`)

### 다국어 지원
- ✅ `/ko`, `/en`, `/ja`, `/zh` 경로 지원
- ✅ 번역 시스템 (DB 기반)

---

## ❌ 누락된 P1 기능 (30%)

### Phase 11: WYSIWYG 에디터 (NEW)
**상태:** ❌ 미구현
**우선순위:** P1 (높음)
**예상 시간:** 3-5일

**필요 작업:**
1. TipTap 또는 ProseMirror 통합
2. 에디터 컴포넌트 (`components/editor/`)
3. 미디어 업로더
4. 이미지 삽입/크기 조정
5. 코드 하이라이팅
6. 자동저장 인디케이터 UI

**파일 구조:**
```
components/editor/
  ├── WysiwygEditor.tsx       # 메인 에디터 컴포넌트
  ├── MediaUploader.tsx        # 미디어 업로드
  ├── CodeBlock.tsx            # 코드 블록
  └── toolbar/
      ├── FormatToolbar.tsx    # 서식 도구모음
      └── InsertMenu.tsx       # 삽입 메뉴

app/actions/editor.ts
  ├── autosaveContent()        # 자동저장
  ├── uploadMedia()            # 미디어 업로드
  └── getAutosaves()           # 자동저장 목록
```

**데이터베이스:** `editor_autosave` 테이블 이미 존재

---

### Phase 12: 개인 메시지 시스템 (NEW)
**상태:** ❌ 미구현
**우선순위:** P1 (높음)
**예상 시간:** 5-7일

**필요 작업:**
1. 메시지 테이블 생성
2. 메시지 작성/송신 UI
3. 받은편지함/보낸편지함
4. 읽음 상태 표시
5. 메시지 알림
6. 차단 기능

**파일 구조:**
```
app/messages/
  ├── page.tsx                 # 받은편지함
  ├── sent/page.tsx            # 보낸편지함
  ├── new/page.tsx             # 메시지 작성
  └── [id]/page.tsx            # 메시지 상세

components/messages/
  ├── MessageList.tsx          # 메시지 목록
  ├── MessageItem.tsx          # 메시지 아이템
  └── MessageForm.tsx          # 메시지 작성 폼

app/actions/message.ts
  ├── sendMessage()            # 메시지 전송
  ├── getMessages()            # 메시지 목록
  ├── markAsRead()             # 읽음 표시
  └── blockUser()              # 사용자 차단
```

**데이터베이스 스키마 (추가 필요):**
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

---

### Phase 13: 알림센터 UI (NEW)
**상태:** DB만 완료, UI 미구현
**우선순위:** P1 (높음)
**예상 시간:** 3-5일

**필요 작업:**
1. 알림 센터 컴포넌트
2. 알림 배지 표시
3. 알림 드롭다운
4. 알림 설정 페이지
5. 읽음 상태 동기화
6. 실시간 알림 (Supabase Realtime)

**파일 구조:**
```
components/notifications/
  ├── NotificationCenter.tsx   # 알림 센터
  ├── NotificationBadge.tsx    # 알림 배지
  ├── NotificationItem.tsx     # 알림 아이템
  └── NotificationSettings.tsx # 알림 설정

app/notifications/
  ├── page.tsx                 # 알림 목록
  └── settings/page.tsx        # 알림 설정

app/actions/notifications.ts
  ├── getNotifications()       # (기존)
  ├── markAsRead()             # (기존)
  ├── markAllAsRead()          # 추가 필요
  └── updatePreferences()      # 추가 필요
```

**데이터베이스:** `notifications` 테이블 이미 존재

---

### Phase 14: 레이아웃 빌더 (NEW)
**상태:** ❌ 미구현
**우선순위:** P1 (높음)
**예상 시간:** 5-7일

**필요 작업:**
1. 드래그앤드롭 레이아웃 빌더
2. 위젯 배치 에디터
3. 다중 컬럼 지원
4. 레이아웃 프리뷰
5. 레이아웃 저장/로드
6. 반응형 레이아웃

**파일 구조:**
```
app/admin/layout/
  ├── page.tsx                 # 레이아웃 빌더
  ├── preview/page.tsx         # 레이아웃 프리뷰
  └── [id]/edit/page.tsx       # 레이아웃 편집

components/layout-builder/
  ├── LayoutBuilder.tsx        # 메인 빌더
  ├── Canvas.tsx               # 캔버스
  ├── WidgetLibrary.tsx        # 위젯 라이브러리
  ├── DraggableWidget.tsx      # 드래그 가능 위젯
  └── PropertyEditor.tsx       # 속성 에디터

app/actions/layout.ts
  ├── saveLayout()             # 레이아웃 저장
  ├── getLayouts()             # 레이아웃 목록
  └── deleteLayout()           # 레이아웃 삭제
```

**데이터베이스 스키마 (추가 필요):**
```sql
CREATE TABLE public.layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  layout_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Phase 15: 관리자 로깅 UI (NEW)
**상태:** DB만 완료, UI 미구현
**우선순위:** P1 (높음)
**예상 시간:** 2-3일

**필요 작업:**
1. 활동 로그 뷰어
2. 로그 필터링
3. 로그 내보내기 (CSV)
4. 로그 보존 정책
5. 감사 추적

**파일 구조:**
```
app/admin/logs/
  ├── page.tsx                 # 로그 목록
  ├── [id]/page.tsx            # 로그 상세
  └── export/route.ts          # 로그 내보내기 API

components/admin/logs/
  ├── LogList.tsx              # 로그 목록
  ├── LogFilter.tsx            # 로그 필터
  └── LogDetail.tsx            # 로그 상세
```

**데이터베이스:** `activity_log` 테이블 이미 존재

---

### Phase 16: 임시 저장/드래프트 (NEW)
**상태:** DB만 완료, UI 미구현
**우선순위:** P1 (높음)
**예상 시간:** 2-3일

**필요 작업:**
1. 자동저장 인디케이터
2. 드래프트 관리자
3. 드래프트 복구 기능
4. 다중 드래프트 지원

**파일 구조:**
```
components/editor/
  ├── AutosaveIndicator.tsx    # 자동저장 표시
  └── DraftManager.tsx         # 드래프트 관리

app/actions/draft.ts
  ├── saveDraft()              # 드래프트 저장
  ├── getDrafts()              # 드래프트 목록
  ├── restoreDraft()           # 드래프트 복구
  └── deleteDraft()            # 드래프트 삭제
```

**데이터베이스 스키마 (추가 필요):**
```sql
CREATE TABLE public.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  content_type TEXT,
  content_id UUID,
  title TEXT,
  content TEXT,
  autosave_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔵 P2 기능 (선택 사항)

### Phase 17: 통합 검색 개선
- 상태: 기본 검색 완료, 통합 검색 미완료
- 예상 시간: 1-2일

### Phase 18: 테마 스위처
- 상태: DB만 완료
- 예상 시간: 2-3일

### Phase 19: 조회수 추적
- 상태: 미구현
- 예상 시간: 1-2일

### Phase 20: 콘텐츠 스케줄링
- 상태: 미구현
- 예상 시간: 2-3일

### Phase 21: 대시보드 분석
- 상태: UI만 완료
- 예상 시간: 3-5일

### Phase 22: 파일 매니저 UI
- 상태: 미구현
- 예상 시간: 3-5일

---

## 📅 구현 일정

### Week 1-2: P1 핵심 기능
- Day 1-5: WYSIWYG 에디터 (TipTap)
- Day 6-10: 개인 메시지 시스템

### Week 3-4: P1 UI 기능
- Day 1-3: 관리자 로깅 UI
- Day 4-8: 알림센터 UI
- Day 9-12: 임시 저장/드래프트

### Week 5-7: P1 레이아웃
- Day 1-7: 레이아웃 빌더

### Week 8-10: P2 기능
- Week 8: 통합 검색 개선
- Week 9: 테마/조회수/스케줄링
- Week 10: 파일 매니저/대시보드

---

## 🎯 성공 기준

### P1 완료 기준
- [ ] WYSIWYG 에디터로 글 작성 가능
- [ ] 개인 메시지 송수신 가능
- [ ] 알림 센터에서 실시간 알림 확인
- [ ] 레이아웃 빌더로 위젯 배치 가능
- [ ] 관리자 로그 확인 및 내보내기
- [ ] 자동저장 드래프트 관리

### 전체 완료 기준
- [ ] P1 기능 100% 구현
- [ ] 단위 테스트 85%+ 커버리지
- [ ] E2E 테스트 핵심 경로 통과
- [ ] 성능 목표 달성 (P50 < 1s, P95 < 2s)
- [ ] 보안 감사 통과

---

**다음 단계:** P1 Phase 11 (WYSIWYG 에디터)부터 구현 시작
