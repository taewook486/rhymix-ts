# Rhymix-TS P1 개발자 가이드

**버전:** 1.0.0
**작성일:** 2026-02-24
**대상:** 개발자, 기여자

---

## 목차

1. [개요](#1-개요)
2. [아키텍처](#2-아키텍처)
3. [컴포넌트 구조](#3-컴포넌트-구조)
4. [확장 포인트](#4-확장-포인트)
5. [테스트 방법](#5-테스트-방법)
6. [디버깅](#6-디버깅)

---

## 1. 개요

이 문서는 Rhymix-TS P1 기능의 구현 아키텍처, 컴포넌트 구조, 확장 포인트, 테스트 방법을 설명합니다.

### 1.1 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript 5.9+ |
| 상태 관리 | React Hooks, Zustand |
| 에디터 | TipTap, ProseMirror |
| 드래그앤드롭 | dnd-kit |
| 데이터베이스 | Supabase (PostgreSQL) |
| 실시간 | Supabase Realtime |
| 스타일링 | Tailwind CSS, shadcn/ui |
| 테스트 | Vitest, Playwright |

### 1.2 프로젝트 구조

```
rhymix-ts/
├── app/
│   ├── actions/           # Server Actions
│   │   ├── editor.ts      # 에디터 관련
│   │   ├── message.ts     # 메시지 관련
│   │   ├── notifications.ts # 알림 관련
│   │   ├── layouts.ts     # 레이아웃 관련
│   │   └── draft.ts       # 드래프트 관련
│   ├── messages/          # 메시지 페이지
│   ├── notifications/     # 알림 페이지
│   └── admin/
│       └── layout/        # 레이아웃 빌더 페이지
├── components/
│   ├── editor/            # 에디터 컴포넌트
│   ├── messages/          # 메시지 컴포넌트
│   ├── notifications/     # 알림 컴포넌트
│   ├── layout-builder/    # 레이아웃 빌더 컴포넌트
│   └── ui/                # 공용 UI 컴포넌트
├── hooks/
│   ├── useMessages.ts     # 메시지 훅
│   ├── useNotifications.ts # 알림 훅
│   └── useRealtime.ts     # 실시간 훅
├── lib/
│   └── supabase/
│       ├── server.ts      # Supabase 서버 클라이언트
│       └── database.types.ts # 타입 정의
└── types/
    ├── board.ts           # 게시판 타입
    └── layout.ts          # 레이아웃 타입
```

---

## 2. 아키텍처

### 2.1 레이어드 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    프레젠테이션 계층                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │     UI       │      │
│  │ (/messages/) │  │ (MessageList)│  │  (shadcn/ui) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     비즈니스 로직 계층                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ React Hooks  │  │ Custom Hooks │  │   Toast UI   │      │
│  │(useMessages)│  │(useRealtime) │  │ (use-toast)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     데이터 접근 계층                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Server Actions│  │Supabase Client│  │  Middleware  │      │
│  │(sendMessage) │  │(createClient)│  │    (auth)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     데이터 저장소 계층                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │Supabase Auth │  │   Storage    │      │
│  │   (messages) │  │  (users)     │  │  (files)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

**메시지 전송 예시:**

```
1. 사용자: 메시지 작성 폼 제출
   ↓
2. MessageForm: onSubmit 이벤트
   ↓
3. sendMessage Server Action 호출
   ↓
4. 인증 확인 (auth.getUser())
   ↓
5. 수신자 존재 확인
   ↓
6. 차단 여부 확인 (is_blocked RPC)
   ↓
7. messages 테이블에 INSERT
   ↓
8. Supabase Realtime 트리거
   ↓
9. 수신자 브라우저: useRealtime 훅 수신
   ↓
10. Toast 알림 표시
```

### 2.3 실시간 통신

**Supabase Realtime 구독:**

```typescript
// hooks/useRealtime.ts
useRealtime({
  table: 'messages',
  filter: `receiver_id=eq.${userId}`,
  enabled: true,
  onInsert: (payload) => {
    toast({ title: '새 메시지' })
  }
})
```

**Realtime 상태:**
- `connected`: 초록색 점
- `connecting`: 노란색 점 (깜빡임)
- `disconnected`: 표시 없음

---

## 3. 컴포넌트 구조

### 3.1 WYSIWYG 에디터

**컴포넌트 계층:**

```
WysiwygEditor
├── EditorToolbar
│   ├── FormatButtons (굵게, 기울임, 등)
│   ├── HeadingSelector (H1-H4)
│   ├── ListButtons (순서, 불릿)
│   ├── InsertMenu (링크, 이미지, 코드)
│   └── UndoRedoButtons
├── EditorContent (TipTap)
└── MediaUploader
```

**주요 인터페이스:**

```typescript
interface WysiwygEditorProps {
  content: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  onImageUpload?: (file: File) => Promise<string>
}
```

**확장 포인트:**

1. **커스텀 확장:** TipTap 확장 추가
```typescript
// 예: 하이라이터 확장
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'

extensions: [
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'typescript'
  })
]
```

2. **커스텀 툴바:** EditorToolbar 확장
```typescript
// 예: 표 삽입 버튼
<TableButton editor={editor} />
```

3. **커스텀 스타일:** CSS 변수 수정
```css
.ProseMirror {
  /* 커스텀 스타일 */
}
```

---

### 3.2 메시지 시스템

**컴포넌트 계층:**

```
MessageList
├── MessageItem
│   ├── MessageDetailHeader
│   └── MessageDetail
└── MessageForm
```

**주요 인터페이스:**

```typescript
interface MessageListProps {
  userId: UUID
  defaultFolder?: 'inbox' | 'sent'
}

interface MessageFormProps {
  receiverId?: UUID
  onSuccess?: () => void
}
```

**확장 포인트:**

1. **메시지 타입 확장:** 타입 시스템에 새 메시지 타입 추가
2. **필터 확장:** 검색 필터 추가
3. **정렬 옵션:** 날짜, 중요도 등 정렬 기능 추가

---

### 3.3 알림센터

**컴포넌트 계층:**

```
NotificationCenter
├── NotificationBadge
├── NotificationItem
└── NotificationSettings
```

**주요 인터페이스:**

```typescript
interface NotificationCenterProps {
  userId: UUID
  showDropdown?: boolean
  maxItems?: number
  localePrefix?: string
  onNotificationClick?: (notification: Notification) => void
  showSettingsButton?: boolean
}
```

**확장 포인트:**

1. **알림 타입 추가:** 새 알림 타입 정의
2. **알림 템플릿:** 알림 렌더링 커스텀
3. **알림 설정:** 설정 옵션 확장

---

### 3.4 드래프트 관리자

**컴포넌트 구조:**

```
DraftManager
├── DraftItem
└── AutosaveIndicator
```

**주요 인터페이스:**

```typescript
interface DraftManagerProps {
  onRestoreDraft: (draftId: string) => void
  boardId?: string
  className?: string
}

interface AutosaveIndicatorProps {
  lastSaved: Date
  isSaving: boolean
}
```

**확장 포인트:**

1. **자동저장 주기:** 저장 간격 설정
2. **드래프트 카테고리:** 카테고리별 분류
3. **드래프트 비교:** 변경 사항 비교 기능

---

### 3.5 레이아웃 빌더

**컴포넌트 계층:**

```
LayoutBuilder
├── WidgetPalette
├── LayoutCanvas
│   └── LayoutColumn
│       └── WidgetCard
└── WidgetConfigDialog
```

**주요 인터페이스:**

```typescript
interface LayoutBuilderProps {
  initialLayout?: Layout
  availableWidgets: AvailableWidget[]
  onSave: (layout: Layout) => Promise<void>
  onPreview?: (layoutId: string) => void
}
```

**확장 포인트:**

1. **커스텀 위젯:** 새 위젯 타입 등록
2. **레이아웃 템플릿:** 미리 정의된 레이아웃
3. **위젯 설정:** 위젯별 설정 UI 확장

---

## 4. 확장 포인트

### 4.1 새 알림 타입 추가

**단계:**

1. **알림 타입 정의:**
```typescript
// types/notification.ts
export const NOTIFICATION_TYPES = {
  COMMENT: 'comment',
  REPLY: 'reply',
  MENTION: 'mention',
  MESSAGE: 'message',
  // 새 타입 추가
  CUSTOM: 'custom'
} as const
```

2. **알림 생성 함수:**
```typescript
// app/actions/notifications.ts
export async function createCustomNotification(userId: UUID, data: any) {
  return createNotification({
    user_id: userId,
    type: NOTIFICATION_TYPES.CUSTOM,
    title: '커스텀 알림',
    content: data.message,
    action_url: `/custom/${data.id}`,
    icon: 'CustomIcon'
  })
}
```

3. **알림 렌더링:**
```typescript
// components/notifications/NotificationItem.tsx
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'custom':
      return <CustomIcon />
    // ...
  }
}
```

---

### 4.2 새 위젯 타입 추가

**단계:**

1. **위젯 정의:**
```sql
INSERT INTO site_widgets (name, title, description, type, config)
VALUES (
  'custom_widget',
  '커스텀 위젯',
  '내 커스텀 위젯 설명',
  'custom',
  '{"setting1": "default1"}'
);
```

2. **위젯 컴포넌트:**
```typescript
// components/widgets/CustomWidget.tsx
export function CustomWidget({ config }: { config: any }) {
  return (
    <div>
      <h3>커스텀 위젯</h3>
      {config.setting1}
    </div>
  )
}
```

3. **위젯 렌더러:**
```typescript
// components/layout-builder/WidgetCard.tsx
const renderWidget = (widget: PlacedWidget) => {
  switch (widget.widget_type) {
    case 'custom':
      return <CustomWidget config={widget.config} />
    // ...
  }
}
```

---

### 4.3 에디터 확장 추가

**단계:**

1. **확장 정의:**
```typescript
// extensions/custom-extension.ts
import { Extension } from '@tiptap/core'

export const CustomExtension = Extension.create({
  name: 'customExtension',
  // 확장 로직
})
```

2. **에디터에 추가:**
```typescript
// components/editor/WysiwygEditor.tsx
import { CustomExtension } from '@/extensions/custom-extension'

extensions: [
  // 기존 확장,
  CustomExtension
]
```

3. **툴바 버튼 추가:**
```typescript
// components/editor/toolbar/EditorToolbar.tsx
<CustomButton editor={editor} />
```

---

### 4.4 메시지 필터 확장

**단계:**

1. **필터 인터페이스:**
```typescript
interface MessageFilters {
  folder: 'inbox' | 'sent'
  is_read?: boolean
  search?: string
  // 새 필터
  has_attachment?: boolean
  date_from?: string
  date_to?: string
}
```

2. **필터 UI:**
```typescript
// components/messages/MessageFilter.tsx
export function MessageFilter({ filters, onChange }) {
  return (
    <div>
      <Checkbox checked={filters.has_attachment} onChange={onChange} />
      <DatePicker value={filters.date_from} onChange={onChange} />
    </div>
  )
}
```

3. **Server Action 업데이트:**
```typescript
// app/actions/message.ts
export async function getMessages(filters: MessageFilters) {
  // 필터 로직
}
```

---

## 5. 테스트 방법

### 5.1 단위 테스트

**Vitest 사용:**

```typescript
// __tests__/actions/message.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { sendMessage, getMessages } from '@/app/actions/message'

describe('Message Actions', () => {
  beforeEach(() => {
    // 테스트 데이터베이스 초기화
  })

  it('should send a message', async () => {
    const result = await sendMessage({
      receiver_id: 'test-user-id',
      title: 'Test Message',
      content: 'Test Content'
    })

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('id')
  })

  it('should fail if receiver does not exist', async () => {
    const result = await sendMessage({
      receiver_id: 'non-existent-user',
      title: 'Test',
      content: 'Test'
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_NOT_FOUND')
  })
})
```

**테스트 실행:**
```bash
npm run test
```

---

### 5.2 통합 테스트

**Playwright 사용:**

```typescript
// tests/e2e/messages.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Message System', () => {
  test('should send and receive message', async ({ page }) => {
    // 로그인
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')

    // 메시지 작성 페이지 이동
    await page.goto('/messages/new')
    await page.fill('input[name="receiver"]', 'testuser')
    await page.fill('input[name="title"]', 'Test Message')
    await page.fill('textarea[name="content"]', 'Test Content')

    // 전송
    await page.click('button[type="submit"]')

    // 결과 확인
    await expect(page).toHaveURL(/\/messages\/sent/)
    await expect(page.locator('text=Test Message')).toBeVisible()
  })
})
```

**테스트 실행:**
```bash
npm run test:e2e
```

---

### 5.3 실시간 기능 테스트

**Mock Realtime:**

```typescript
// __tests__/hooks/useRealtime.test.ts
import { renderHook, act } from '@testing-library/react'
import { useRealtime } from '@/hooks/useRealtime'

describe('useRealtime', () => {
  it('should subscribe to realtime updates', () => {
    const onInsert = vi.fn()
    const { unmount } = renderHook(() =>
      useRealtime({
        table: 'messages',
        filter: 'receiver_id=eq.test',
        enabled: true,
        onInsert
      })
    )

    // Mock realtime insert
    act(() => {
      // Simulate realtime event
    })

    expect(onInsert).toHaveBeenCalled()
    unmount()
  })
})
```

---

### 5.4 테스트 더블

**Supabase Mock:**

```typescript
// __mocks__/supabase.ts
export const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'test-id' },
      error: null
    })
  })
}
```

---

## 6. 디버깅

### 6.1 Server Actions 디버깅

**로깅:**

```typescript
// app/actions/message.ts
export async function sendMessage(data: MessageInsert) {
  try {
    console.log('[DEBUG] sendMessage called:', data)

    const result = await supabase.from('messages').insert(...)

    console.log('[DEBUG] Insert result:', result)

    return { success: true, data: result.data }
  } catch (error) {
    console.error('[ERROR] sendMessage error:', error)
    return { success: false, error: error.message }
  }
}
```

**브라우저 개발자 도구:**

1. Network 탭에서 Server Actions 요청 확인
2. Request/Response 페이로드 검사
3. Console 탭에서 에러 메시지 확인

---

### 6.2 Realtime 디버깅

**Realtime 상태 확인:**

```typescript
const { realtimeStatus } = useNotifications({ userId, realtime: true })

console.log('Realtime status:', realtimeStatus)
```

**Supabase Dashboard:**

1. Realtime 메뉴 진입
2. 구독 상태 확인
3. 이벤트 로그 확인

---

### 6.3 성능 모니터링

**React DevTools Profiler:**

1. 컴포넌트 렌더링 프로파일링
2. 불필요한 리렌더링 식별
3. 메모리 사용량 확인

**Next.js Analytics:**

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

---

### 6.4 에러 추적

**Sentry 통합:**

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV
})
```

**에러 보고:**

```typescript
export async function sendMessage(data: MessageInsert) {
  try {
    // 로직
  } catch (error) {
    Sentry.captureException(error)
    return { success: false, error: error.message }
  }
}
```

---

## 부록: 모벨 사례

### A.1 컴포넌트 작성 가이드

**좋은 예시:**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

interface MyComponentProps {
  /** 사용자 ID */
  userId: string
  /** 완료 콜백 */
  onSuccess?: () => void
}

/**
 * 내 컴포넌트 설명
 *
 * @example
 * ```tsx
 * <MyComponent userId="user-123" onSuccess={() => console.log('완료')} />
 * ```
 */
export function MyComponent({ userId, onSuccess }: MyComponentProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      // 작업 수행
      onSuccess?.()
    } catch (error) {
      toast({ title: '오류', description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? '처리 중...' : '실행'}
    </Button>
  )
}
```

**나쁜 예시:**

```typescript
// ❌ 주석 없음
// ❌ 타입 정의 없음
// ❌ 에러 처리 없음
export function MyComponent(props: any) {
  return <button onClick={() => alert('완료')}>실행</button>
}
```

---

### A.2 Server Action 작성 가이드

**좋은 예시:**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types/board'

const ERROR_MESSAGES = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '데이터를 찾을 수 없습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.'
}

export async function myAction(input: MyInput): Promise<ActionResult<MyData>> {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: ERROR_MESSAGES.UNAUTHORIZED }
    }

    // 비즈니스 로직
    const { data, error } = await supabase.from('table').select('*').single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('myAction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR
    }
  }
}
```

---

### A.3 React Hook 작성 가이드

**좋은 예시:**

```typescript
import { useState, useEffect } from 'react'
import { useMessages } from '@/hooks/useMessages'

/**
 * 메시지 목록을 관리하는 커스텀 훅
 *
 * @param options - 훅 옵션
 * @returns 메시지 상태 및 핸들러
 */
export function useMyHook(options: MyHookOptions) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await fetchDataFromAPI()
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [options.dep])

  return { data, loading, error, refetch: fetchData }
}
```

---

**문서 버전:** 1.0.0
**마지막 업데이트:** 2026-02-24
**다음 업데이트 예정:** P2 기능 추가 시
