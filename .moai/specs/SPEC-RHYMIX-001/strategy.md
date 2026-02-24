# SPEC-RHYMIX-001 P1 Implementation Strategy

**작성일:** 2026-02-24
**버전:** 1.0.0
**상태:** Ready for Implementation
**담당자:** manager-strategy → manager-ddd

---

## Executive Summary

이 전략 문서는 Rhymix-TS 프로젝트의 P1 우선순위 미구현 기능 6개 Phase에 대한 체계적인 구현 계획을 정의합니다.

**현재 진행률:** 70% 완료
**P1 미구현:** 6개 Phase (Phase 11-16)
**총 예상 시간:** 20-30일 (6주)
**목표 완료일:** 2026-04-07

---

## 1. 구현 순서 및 의존성 분석

### 1.1 최적 구현 순서

| 순서 | Phase | 기능명 | 예상 시간 | 의존성 | 난이도 |
|------|-------|--------|-----------|---------|--------|
| 1 | Phase 15 | 관리자 로깅 UI | 2-3일 | 없음 | 하 |
| 2 | Phase 16 | 임시 저장/드래프트 | 2-3일 | 없음 | 하 |
| 3 | Phase 11 | WYSIWYG 에디터 | 4-6일 | Phase 16 | 중 |
| 4 | Phase 12 | 개인 메시지 시스템 | 6-8일 | 없음 | 중상 |
| 5 | Phase 13 | 알림센터 UI | 4-6일 | Phase 12 | 중 |
| 6 | Phase 14 | 레이아웃 빌더 | 6-8일 | 없음 | 상 |

### 1.2 의존성 다이어그램

```
Phase 15 (관리자 로깅) ─────────────────────┐
                                            │
Phase 16 (임시 저장) ──→ Phase 11 (에디터)  │
                            │              │
                            ↓              │
Phase 12 (메시지) ──→ Phase 13 (알림) ────┘
                                            │
Phase 14 (레이아웃) ─────────────────────────┘
```

### 1.3 순서 결정 근거

1. **관리자 로깅 먼저:** 가장 단순한 CRUD, 독립적 기능, DB 이미 존재
2. **임시 저장 다음:** 단순한 CRUD + 타이머, 에디터와 독립 개발 가능
3. **에디터 그 다음:** 핵심 기능, 드래프트와 연동
4. **메시지 시스템:** 독립적이지만 복잡한 UI, 실시간 기능
5. **알림센터:** 메시지 시스템에서 알림 활용
6. **레이아웃 빌더:** 가장 복잡, 다른 Phase 구현 후 진행

---

## 2. 각 Phase별 세부 작업 분해

### Phase 15: 관리자 로깅 UI (2-3일)

**상태:** DB 존재 (activity_log), UI 미구현
**난이도:** 하
**파일 수:** 8개

**Day 1: 기본 UI**
- [ ] LogList 컴포넌트 (테이블 형태)
- [ ] LogFilter 컴포넌트 (날짜, 사용자, 액션 필터)
- [ ] 페이지네이션
- [ ] `/admin/logs` 페이지

**Day 2: 상세 및 내보내기**
- [ ] LogDetail 컴포넌트
- [ ] CSV 내보내기 API (`/admin/logs/export`)
- [ ] 필터링 로직 최적화
- [ ] `/admin/logs/[id]` 페이지

**Day 3: RLS 및 테스트**
- [ ] 관리자 권한 확인 (middleware)
- [ ] 단위 테스트
- [ ] E2E 테스트

**파일 구조:**
```
app/admin/logs/
  ├── page.tsx                    # 로그 목록
  ├── [id]/page.tsx               # 로그 상세
  └── export/route.ts             # CSV 내보내기 API

components/admin/logs/
  ├── LogList.tsx
  ├── LogFilter.tsx
  ├── LogDetail.tsx
  └── LogExportButton.tsx

app/actions/admin/logs.ts
  ├── getLogs()
  ├── getLogById()
  └── exportLogs()
```

---

### Phase 16: 임시 저장/드래프트 (2-3일)

**상태:** DB 미존재, UI 미구현
**난이도:** 하
**파일 수:** 5개

**Day 1: DB 및 Actions**
- [ ] `drafts` 테이블 생성 (마이그레이션)
- [ ] RLS 정책 설정
- [ ] saveDraft, getDrafts, restoreDraft, deleteDraft Actions
- [ ] 타이머 로직 (30초)

**Day 2: UI 컴포넌트**
- [ ] AutosaveIndicator 컴포넌트
- [ ] DraftManager 컴포넌트
- [ ] 드래프트 목록 페이지

**Day 3: 통합 및 테스트**
- [ ] 텍스트 에디터와 통합
- [ ] 단위 테스트
- [ ] E2E 테스트

**파일 구조:**
```
components/editor/
  ├── AutosaveIndicator.tsx
  └── DraftManager.tsx

app/actions/drafts.ts             # (신규)
  ├── saveDraft()
  ├── getDrafts()
  ├── getDraftById()
  ├── restoreDraft()
  └── deleteDraft()

supabase/migrations/
  └── XXX_create_drafts.sql
```

---

### Phase 11: WYSIWYG 에디터 (4-6일)

**상태:** 미구현
**난이도:** 중
**파일 수:** 10개
**라이브러리:** TipTap, lowlight

**Day 1-2: TipTap 기본 설정**
- [ ] @tiptap/react 설치 및 설정
- [ ] WysiwygEditor 컴포넌트
- [ ] FormatToolbar 컴포넌트
- [ ] 기본 포맷 버튼 (볼드, 이탤릭, 언더라인 등)

**Day 3: 미디어 업로드**
- [ ] MediaUploader 컴포넌트
- [ ] Supabase Storage 연동
- [ ] 이미지 크기 조정
- [ ] uploadMedia Action

**Day 4: 고급 기능**
- [ ] CodeBlock 컴포넌트 (lowlight 하이라이팅)
- [ ] 표, 리스트 삽입
- [ ] 링크 삽입
- [ ] 플레이스홀더

**Day 5-6: 통합 및 테스트**
- [ ] 드래프트(Phase 16)와 통합
- [ ] 단위 테스트
- [ ] E2E 테스트
- [ ] 접근성 테스트

**파일 구조:**
```
components/editor/
  ├── WysiwygEditor.tsx
  ├── MediaUploader.tsx
  ├── CodeBlock.tsx
  ├── toolbar/
  │   ├── FormatToolbar.tsx
  │   ├── InsertMenu.tsx
  │   └── FormatButton.tsx
  └── extensions/
      ├── CustomImage.tsx
      └── CustomCodeBlock.tsx

app/actions/editor.ts
  ├── autosaveContent()           # (기존)
  ├── uploadMedia()               # (신규)
  └── getAutosaves()              # (기존)
```

**필수 라이브러리:**
```json
{
  "@tiptap/react": "^2.1.13",
  "@tiptap/starter-kit": "^2.1.13",
  "@tiptap/extension-image": "^2.1.13",
  "@tiptap/extension-code-block-lowlight": "^2.1.13",
  "@tiptap/extension-link": "^2.1.13",
  "@tiptap/extension-placeholder": "^2.1.13",
  "lowlight": "^3.1.0"
}
```

---

### Phase 12: 개인 메시지 시스템 (6-8일)

**상태:** DB 미존재, UI 미구현
**난이도:** 중상
**파일 수:** 12개

**Day 1: DB 마이그레이션**
- [ ] `messages` 테이블 생성
- [ ] RLS 정책 설정
- [ ] 인덱스 생성
- [ ] 차단 기능 테이블 (user_blocks)

**Day 2-3: 기본 UI**
- [ ] MessageList 컴포넌트
- [ ] MessageItem 컴포넌트
- [ ] 받은편지함 페이지 (`/messages`)
- [ ] 보낸편지함 페이지 (`/messages/sent`)

**Day 4-5: 메시지 작성**
- [ ] MessageForm 컴포넌트
- [ ] UserSelector 컴포넌트 (자동완성)
- [ ] 차단 기능
- [ ] 메시지 작성 페이지 (`/messages/new`)

**Day 6: 실시간 기능**
- [ ] Supabase Realtime 연동
- [ ] 읽음 상태 동기화
- [ ] 메시지 알림 (Phase 13 연동)
- [ ] MessageThread 컴포넌트

**Day 7-8: 테스트**
- [ ] 단위 테스트
- [ ] E2E 테스트
- [ ] 성능 테스트

**파일 구조:**
```
app/messages/
  ├── page.tsx                    # 받은편지함
  ├── sent/page.tsx               # 보낸편지함
  ├── new/page.tsx                # 메시지 작성
  └── [id]/page.tsx               # 메시지 상세

components/messages/
  ├── MessageList.tsx
  ├── MessageItem.tsx
  ├── MessageForm.tsx
  ├── UserSelector.tsx
  └── MessageThread.tsx

app/actions/messages.ts
  ├── sendMessage()
  ├── getMessages()
  ├── getMessageById()
  ├── markAsRead()
  ├── deleteMessage()
  └── blockUser()

supabase/migrations/
  └── XXX_create_messages.sql
```

---

### Phase 13: 알림센터 UI (4-6일)

**상태:** DB 존재 (notifications), UI 미구현
**난이도:** 중
**파일 수:** 10개

**Day 1: 기본 UI**
- [ ] NotificationCenter 컴포넌트
- [ ] NotificationBadge 컴포넌트
- [ ] NotificationDropdown 컴포넌트
- [ ] 알림 드롭다운 메뉴

**Day 2: 알림 목록**
- [ ] NotificationItem 컴포넌트
- [ ] 알림 목록 페이지 (`/notifications`)
- [ ] 페이지네이션
- [ ] 필터링 (읽음/안읽음)

**Day 3: 설정 페이지**
- [ ] NotificationSettings 컴포넌트
- [ ] 알림 설정 페이지 (`/notifications/settings`)
- [ ] 알림 타입별 설정

**Day 4: 실시간 업데이트**
- [ ] Supabase Realtime 구독
- [ ] 배지 수 업데이트
- [ ] 메시지 알림 연동 (Phase 12)

**Day 5-6: 테스트**
- [ ] 단위 테스트
- [ ] E2E 테스트
- [ ] 실시간 동작 테스트

**파일 구조:**
```
components/notifications/
  ├── NotificationCenter.tsx
  ├── NotificationBadge.tsx
  ├── NotificationItem.tsx
  ├── NotificationDropdown.tsx
  └── NotificationSettings.tsx

app/notifications/
  ├── page.tsx                    # 알림 목록
  └── settings/page.tsx           # 알림 설정

app/actions/notifications.ts
  ├── getNotifications()          # (기존)
  ├── markAsRead()                # (기존)
  ├── markAllAsRead()             # (신규)
  ├── updatePreferences()         # (신규)
  └── deleteNotification()        # (신규)
```

---

### Phase 14: 레이아웃 빌더 (6-8일)

**상태:** DB 미존재, UI 미구현
**난이도:** 상
**파일 수:** 12개
**라이브러리:** @dnd-kit

**Day 1: DB 마이그레이션**
- [ ] `layouts` 테이블 생성
- [ ] RLS 정책 설정
- [ ] 레이아웃 데이터 구조 설계 (JSONB)

**Day 2-3: 기본 빌더**
- [ ] LayoutBuilder 컴포넌트
- [ ] Canvas 컴포넌트
- [ ] WidgetLibrary 컴포넌트
- [ ] @dnd-kit 설치 및 설정

**Day 4-5: 드래그앤드롭**
- [ ] DraggableWidget 컴포넌트
- [ ] ZoneRenderer 컴포넌트
- [ ] 위치 저장 로직
- [ ] 다중 컬럼 지원

**Day 6: 속성 에디터**
- [ ] PropertyEditor 컴포넌트
- [ ] 위젯 설정 (너비, 높이, 여백 등)
- [ ] 레이아웃 저장/로드

**Day 7-8: 프리뷰 및 테스트**
- [ ] LayoutPreview 컴포넌트
- [ ] 반응형 레이아웃 테스트
- [ ] 단위 테스트
- [ ] E2E 테스트

**파일 구조:**
```
app/admin/layout/
  ├── page.tsx                    # 레이아웃 빌더
  ├── preview/page.tsx            # 프리뷰
  └── [id]/edit/page.tsx          # 레이아웃 편집

components/layout-builder/
  ├── LayoutBuilder.tsx
  ├── Canvas.tsx
  ├── WidgetLibrary.tsx
  ├── DraggableWidget.tsx
  ├── PropertyEditor.tsx
  ├── LayoutPreview.tsx
  └── ZoneRenderer.tsx

app/actions/layout.ts
  ├── saveLayout()
  ├── getLayouts()
  ├── getLayoutById()
  ├── deleteLayout()
  └── setActiveLayout()

supabase/migrations/
  └── XXX_create_layouts.sql
```

**필수 라이브러리:**
```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "react-resizable-panels": "^2.0.19"
}
```

---

## 3. 필요한 라이브러리/패키지 목록

### 3.1 에디터 (Phase 11)

```json
{
  "@tiptap/react": "^2.1.13",
  "@tiptap/starter-kit": "^2.1.13",
  "@tiptap/extension-image": "^2.1.13",
  "@tiptap/extension-code-block-lowlight": "^2.1.13",
  "@tiptap/extension-link": "^2.1.13",
  "@tiptap/extension-placeholder": "^2.1.13",
  "@tiptap/extension-table": "^2.1.13",
  "@tiptap/extension-table-row": "^2.1.13",
  "@tiptap/pm": "^2.1.13",
  "lowlight": "^3.1.0"
}
```

### 3.2 드래그앤드롭 (Phase 14)

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "react-resizable-panels": "^2.0.19"
}
```

### 3.3 기존 라이브러리 (이미 설치됨)

- @supabase/supabase-js
- @supabase/realtime-js
- @tanstack/react-query
- zod
- date-fns
- tailwind-merge
- clsx

---

## 4. 데이터베이스 마이그레이션 스크립트

### 4.1 messages 테이블 (Phase 12)

```sql
-- 파일: supabase/migrations/XXX_create_messages.sql

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update read status"
  ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Indexes
CREATE INDEX messages_recipient_idx ON public.messages(recipient_id);
CREATE INDEX messages_sender_idx ON public.messages(sender_id);
CREATE INDEX messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX messages_is_read_idx ON public.messages(is_read) WHERE is_read = FALSE;

-- 사용자 차단 테이블
CREATE TABLE public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own blocks"
  ON public.user_blocks FOR ALL
  USING (auth.uid() = blocker_id);
```

### 4.2 drafts 테이블 (Phase 16)

```sql
-- 파일: supabase/migrations/XXX_create_drafts.sql

CREATE TABLE public.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'document', 'comment', 'message')),
  content_id UUID,
  title TEXT,
  content TEXT,
  autosave_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own drafts"
  ON public.drafts FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX drafts_user_idx ON public.drafts(user_id);
CREATE INDEX drafts_updated_at_idx ON public.drafts(updated_at DESC);
CREATE INDEX drafts_content_type_idx ON public.drafts(content_type);

-- 자동 정리 함수 (30일 이상 된 드래프트 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.drafts
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 매일 실행 스케줄 (pg_cron 필요)
-- SELECT cron.schedule('cleanup-drafts', '0 0 * * *', 'SELECT cleanup_old_drafts()');
```

### 4.3 layouts 테이블 (Phase 14)

```sql
-- 파일: supabase/migrations/XXX_create_layouts.sql

CREATE TABLE public.layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  layout_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active layouts"
  ON public.layouts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage layouts"
  ON public.layouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX layouts_active_idx ON public.layouts(is_active);
CREATE INDEX layouts_default_idx ON public.layouts(is_default) WHERE is_default = TRUE;

-- 기본 레이아웃 하나만 허용
CREATE UNIQUE INDEX layouts_default_unique_idx ON public.layouts(is_default) WHERE is_default = TRUE;

-- 레이아웃 데이터 구조 예시
-- {
--   "zones": [
--     {
--       "id": "header",
--       "name": "Header",
--       "widgets": [
--         { "id": "logo", "type": "logo", "position": { "x": 0, "y": 0, "w": 2, "h": 1 } }
--       ]
--     },
--     {
--       "id": "main",
--       "name": "Main Content",
--       "columns": 2,
--       "widgets": [
--         { "id": "recent-posts", "type": "recent_posts", "position": { "x": 0, "y": 0, "w": 1, "h": 2 } }
--       ]
--     }
--   ]
-- }
```

### 4.4 기존 테이블 확인

- `activity_log` - Phase 15 사용 (이미 존재)
- `notifications` - Phase 13 사용 (이미 존재)
- `editor_autosave` - Phase 11 사용 (이미 존재)

---

## 5. 파일 생성 목록 (총 60개)

### 5.1 Phase 15 (8개)

```
app/admin/logs/
  ├── page.tsx
  ├── [id]/page.tsx
  └── export/route.ts

components/admin/logs/
  ├── LogList.tsx
  ├── LogFilter.tsx
  ├── LogDetail.tsx
  └── LogExportButton.tsx

app/actions/admin/logs.ts
```

### 5.2 Phase 16 (5개)

```
components/editor/
  ├── AutosaveIndicator.tsx
  └── DraftManager.tsx

app/actions/drafts.ts

supabase/migrations/XXX_create_drafts.sql
```

### 5.3 Phase 11 (10개)

```
components/editor/
  ├── WysiwygEditor.tsx
  ├── MediaUploader.tsx
  ├── CodeBlock.tsx
  ├── toolbar/
  │   ├── FormatToolbar.tsx
  │   ├── InsertMenu.tsx
  │   └── FormatButton.tsx
  └── extensions/
      ├── CustomImage.tsx
      └── CustomCodeBlock.tsx

app/actions/editor.ts (수정)
```

### 5.4 Phase 12 (12개)

```
app/messages/
  ├── page.tsx
  ├── sent/page.tsx
  ├── new/page.tsx
  └── [id]/page.tsx

components/messages/
  ├── MessageList.tsx
  ├── MessageItem.tsx
  ├── MessageForm.tsx
  ├── UserSelector.tsx
  └── MessageThread.tsx

app/actions/messages.ts

supabase/migrations/XXX_create_messages.sql
```

### 5.5 Phase 13 (10개)

```
components/notifications/
  ├── NotificationCenter.tsx
  ├── NotificationBadge.tsx
  ├── NotificationItem.tsx
  ├── NotificationDropdown.tsx
  └── NotificationSettings.tsx

app/notifications/
  ├── page.tsx
  └── settings/page.tsx

app/actions/notifications.ts (수정)
```

### 5.6 Phase 14 (12개)

```
app/admin/layout/
  ├── page.tsx
  ├── preview/page.tsx
  └── [id]/edit/page.tsx

components/layout-builder/
  ├── LayoutBuilder.tsx
  ├── Canvas.tsx
  ├── WidgetLibrary.tsx
  ├── DraggableWidget.tsx
  ├── PropertyEditor.tsx
  ├── LayoutPreview.tsx
  └── ZoneRenderer.tsx

app/actions/layout.ts

supabase/migrations/XXX_create_layouts.sql
```

### 5.7 공통 (3개)

```
supabase/migrations/
  ├── XXX_create_messages.sql
  ├── XXX_create_drafts.sql
  └── XXX_create_layouts.sql
```

---

## 6. 위험 요소 및 대응 방안

### 6.1 기술적 위험

| 위험 | 영향 | 확률 | 대응 방안 |
|------|------|------|----------|
| TipTap 학습 곡선 | Phase 11 지연 | 중 | 공식 문서 참조, 프로토타입 우선, Quill을 대안으로 고려 |
| Supabase Realtime 복잡도 | Phase 13 지연 | 중 | useEffect 클린업, 재연결 로직, 에러 핸들링 |
| 드래그앤드롭 성능 | Phase 14 지연 | 중 | 가상화, 디바운싱, 상태 관리 최적화 |
| 라이브러리 호환성 | 빌드 실패 | 낮 | Next.js 16 호환성 사전 테스트, 대안 준비 |

### 6.2 의존성 위험

| 위험 | 영향 | 확률 | 대응 방안 |
|------|------|------|----------|
| RLS 정책 성능 | 쿼리 지연 | 중 | 정책 단순화, 인덱스 최적화, 쿼리 분석 |
| 마이그레이션 충돌 | 데이터 손실 | 낮 | 백업, 테스트 환경 검증, 롤백 계획 |
| JSONB 컬럼 크기 | 저장소 과다 | 낮 | 압축, 필요 필드만 저장, 정리 작업 |

### 6.3 사용자 경험 위험

| 위험 | 영향 | 확률 | 대응 방안 |
|------|------|------|----------|
| 자동저장 충돌 | 데이터 손실 | 중 | 낙관적 잠금, 충돌 감지, 사용자 선택 UI |
| 메시지 스팸 | 사용자 불편 | 중 | rate limiting, 스팸 필터링, 차단 기능 |
| 알림 과부하 | 사용자 무시 | 낮 | 알림 그룹화, 일일 제한, 설정 기능 |

### 6.4 보안 위험

| 위험 | 영향 | 확률 | 대응 방안 |
|------|------|------|----------|
| 메시지 내용 XSS | 보안 취약점 | 중 | DOMPurify, CSP 헤더, 입력 유효성 검사 |
| 파일 업로드 취약점 | 악성 파일 | 낮 | 파일 타입 검증, 크기 제한, 화이트리스트 |
| RLS 정책 우회 | 권한 탈취 | 낮 | 정책 검토, penetration testing, 감사 로그 |

### 6.5 일정 위험

| 위험 | 영향 | 확률 | 대응 방안 |
|------|------|------|----------|
| 예상 시간 초과 | 전체 지연 | 높 | 각 Phase에 20% 버퍼, MVP 우선, P2 연기 |
| 병목 발생 | 순차 지연 | 중 | 병렬 작업, 우선순위 조정, 추가 리소스 |

---

## 7. 성공 기준

### 7.1 P1 완료 기준

- [ ] WYSIWYG 에디터로 글 작성 가능
- [ ] 개인 메시지 송수신 가능
- [ ] 알림 센터에서 실시간 알림 확인
- [ ] 레이아웃 빌더로 위젯 배치 가능
- [ ] 관리자 로그 확인 및 내보내기
- [ ] 자동저장 드래프트 관리

### 7.2 전체 완료 기준

- [ ] P1 기능 100% 구현
- [ ] 단위 테스트 85%+ 커버리지
- [ ] E2E 테스트 핵심 경로 통과
- [ ] 성능 목표 달성 (P50 < 1s, P95 < 2s)
- [ ] 보안 감사 통과
- [ ] 접근성 테스트 통과 (WCAG 2.1 AA)

### 7.3 품질 기준 (TRUST 5)

- **Tested:** 각 Phase별 단위 테스트, E2E 테스트
- **Readable:** ESLint 통과, 코드 컨벤션 준수
- **Unified:** Prettier 포맷팅, 일관된 스타일
- **Secured:** OWASP Top 10 준수, RLS 정책 완비
- **Trackable:** Git 커밋 메시지, 이슈 추적

---

## 8. 일정 계획

### 8.1 주간 일정 (6주)

| 주 | Phase | 작업 | 예상 시간 |
|----|-------|------|----------|
| 1주차 | Phase 15 | 관리자 로깅 UI | 2-3일 |
|    | Phase 16 | 임시 저장/드래프트 | 2-3일 |
| 2-3주차 | Phase 11 | WYSIWYG 에디터 | 4-6일 |
| 3-4주차 | Phase 12 | 개인 메시지 시스템 | 6-8일 |
| 4-5주차 | Phase 13 | 알림센터 UI | 4-6일 |
| 5-6주차 | Phase 14 | 레이아웃 빌더 | 6-8일 |
| 6주차 | 통합 | 테스트 및 버그 수정 | 2-3일 |

### 8.2 마일스톤

- **M1 (1주차 말):** 관리자 로깅 + 드래프트 완료
- **M2 (3주차 말):** 에디터 완료
- **M3 (4주차 말):** 메시지 시스템 완료
- **M4 (5주차 말):** 알림센터 완료
- **M5 (6주차 말):** 레이아웃 빌더 완료, 전체 P1 완료

---

## 9. 다음 단계

1. **Phase 15 시작:** 관리자 로깅 UI 구현
2. **라이브러리 설치:** 필요한 npm 패키지 설치
3. **마이그레이션 실행:** DB 스키마 업데이트
4. **테스트 환경 설정:** Jest, Playwright 설정 확인

---

## Appendix

### A. 참고 문서

- [TipTap 공식 문서](https://tiptap.dev/docs)
- [dnd-kit 공식 문서](https://docs.dndkit.com)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [shadcn/ui 컴포넌트](https://ui.shadcn.com)

### B. 관련 SPEC

- SPEC-RHYMIX-001/spec.md
- SPEC-RHYMIX-001/implementation-plan-v2.md
- SPEC-RHYMIX-001/gap-analysis-report.md

### C. 연락처

- **담당자:** manager-ddd
- **승인자:** taewo
- **검토자:** MoAI Quality System

---

**문서 버전:** 1.0.0
**마지막 수정:** 2026-02-24
**상태:** Ready for Implementation
