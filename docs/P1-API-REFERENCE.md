# Rhymix-TS P1 API 레퍼런스

**버전:** 1.0.0
**작성일:** 2026-02-24
**대상:** 개발자

---

## 목차

1. [개요](#1-개요)
2. [Server Actions](#2-server-actions)
3. [React Hooks](#3-react-hooks)
4. [데이터베이스 스키마](#4-데이터베이스-스키마)
5. [타입 정의](#5-타입-정의)

---

## 1. 개요

이 문서는 Rhymix-TS P1 기능의 API 인터페이스를 설명합니다. 모든 Server Actions는 Next.js Server Actions 형식으로 구현되어 있으며, React Hooks는 클라이언트 사이드에서 사용할 수 있습니다.

### 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      클라이언트 (Browser)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Components │  │React Hooks   │  │   Toast UI   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                 │                                  │
│         ▼                 ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Server Actions 호출                      │   │
│  └────────────────────┬─────────────────────────────────┘   │
└───────────────────────┼───────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    서버 (Server)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Middleware│ │Supabase Client│ │   Server     │      │
│  └──────────────┘  └──────────────┘  │   Actions     │      │
│                                       └──────┬───────┘      │
│                                              │              │
│                                              ▼              │
│                                    ┌──────────────┐        │
│                                    │  PostgreSQL  │        │
│                                    │   Database   │        │
│                                    └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Server Actions

### 2.1 에디터 Server Actions

**파일:** `app/actions/editor.ts`

#### `uploadEditorMedia(file: File)`

에디터에서 이미지를 업로드합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| file | File | 업로드할 이미지 파일 |

**반환값:**
```typescript
{
  success: boolean
  url?: string      // 업로드된 이미지 URL
  error?: string    // 에러 메시지
}
```

**예외:**
- 이미지 파일만 업로드 가능 (JPEG, PNG, GIF, WebP)
- 최대 파일 크기: 10MB
- 인증 필요

**사용 예시:**
```typescript
import { uploadEditorMedia } from '@/app/actions/editor'

const handleUpload = async (file: File) => {
  const result = await uploadEditorMedia(file)
  if (result.success && result.url) {
    console.log('업로드 성공:', result.url)
  } else {
    console.error('업로드 실패:', result.error)
  }
}
```

#### `saveAutosave(input: SaveAutosaveInput)`

자동저장 드래프트를 저장하거나 업데이트합니다.

**매개변수:**
```typescript
interface SaveAutosaveInput {
  target_type: 'post' | 'page' | 'comment'
  target_id?: string
  title?: string
  content: string
  content_html?: string
  excerpt?: string
  metadata?: Record<string, any>
}
```

**반환값:**
```typescript
{
  success: boolean
  data?: Autosave
  error?: string
}
```

**Autosave 타입:**
```typescript
interface Autosave {
  id: string
  user_id: string
  target_type: 'post' | 'page' | 'comment'
  target_id: string | null
  title: string
  content: string
  content_html: string
  excerpt: string
  metadata: Record<string, any>
  saved_at: string
  expires_at: string
}
```

#### `getAutosave(targetType: string, targetId?: string)`

특정 대상의 자동저장을 조회합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| targetType | string | 'post', 'page', 'comment' |
| targetId | string? | 대상 ID (선택) |

**반환값:**
```typescript
{
  success: boolean
  data?: Autosave | null
  error?: string
}
```

#### `deleteAutosave(targetType: string, targetId?: string)`

자동저장을 삭제합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| targetType | string | 'post', 'page', 'comment' |
| targetId | string? | 대상 ID (선택) |

**반환값:**
```typescript
{
  success: boolean
  error?: string
}
```

---

### 2.2 메시지 Server Actions

**파일:** `app/actions/message.ts`

#### `sendMessage(data: MessageInsert)`

새 메시지를 전송합니다.

**매개변수:**
```typescript
interface MessageInsert {
  receiver_id: string
  title: string
  content: string
  parent_id?: string
}
```

**반환값:**
```typescript
ActionResult<Message>
```

**에러:**
- `UNAUTHORIZED`: 로그인 필요
- `INVALID_INPUT`: 필수 필드 누락
- `USER_NOT_FOUND`: 수신자 없음
- `BLOCKED_USER`: 차단된 사용자

#### `getMessages(filters: MessageListFilters)`

메시지 목록을 조회합니다.

**매개변수:**
```typescript
interface MessageListFilters {
  folder: 'inbox' | 'sent'
  is_read?: boolean
  search?: string
  limit?: number
  offset?: number
}
```

**반환값:**
```typescript
ActionResult<Message[]>
```

#### `getMessage(messageId: UUID)`

메시지 상세를 조회합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| messageId | UUID | 메시지 ID |

**반환값:**
```typescript
ActionResult<MessageWithRelations>
```

**MessageWithRelations:**
```typescript
interface MessageWithRelations extends Message {
  sender: Profile
  receiver: Profile
  parent?: Message
}
```

#### `markAsRead(messageId: UUID)`

메시지를 읽음으로 표시합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| messageId | UUID | 메시지 ID |

**반환값:**
```typescript
ActionResult<void>
```

#### `markAllAsRead()`

모든 메시지를 읽음으로 표시합니다.

**반환값:**
```typescript
ActionResult<void>
```

#### `deleteMessage(messageId: UUID)`

메시지를 소프트 삭제합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| messageId | UUID | 메시지 ID |

**반환값:**
```typescript
ActionResult<void>
```

#### `blockUser(blockedId: UUID)`

사용자를 차단합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| blockedId | UUID | 차단할 사용자 ID |

**반환값:**
```typescript
ActionResult<MessageBlock>
```

#### `unblockUser(blockedId: UUID)`

사용자 차단을 해제합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| blockedId | UUID | 차단 해제할 사용자 ID |

**반환값:**
```typescript
ActionResult<void>
```

#### `getBlockedUsers()`

차단된 사용자 목록을 조회합니다.

**반환값:**
```typescript
ActionResult<MessageBlockWithRelations[]>
```

---

### 2.3 알림 Server Actions

**파일:** `app/actions/notifications.ts`

#### `createNotification(notification: NotificationInsert)`

새 알림을 생성합니다 (시스템용).

**매개변수:**
```typescript
interface NotificationInsert {
  user_id: UUID
  type: string
  title: string
  content?: string
  action_url?: string
  action_label?: string
  icon?: string
  metadata?: Record<string, any>
}
```

**반환값:**
```typescript
ActionResult<Notification>
```

#### `getNotifications(options)`

알림 목록을 조회합니다.

**매개변수:**
```typescript
{
  userId: UUID
  limit?: number
  offset?: number
  isRead?: boolean
}
```

**반환값:**
```typescript
ActionResult<Notification[]>
```

#### `getUnreadNotificationCount(userId: UUID)`

읽지 않은 알림 개수를 조회합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| userId | UUID | 사용자 ID |

**반환값:**
```typescript
ActionResult<{ count: number }>
```

#### `markNotificationAsRead(notificationId: UUID)`

알림을 읽음으로 표시합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| notificationId | UUID | 알림 ID |

**반환값:**
```typescript
ActionResult<void>
```

#### `markAllNotificationsAsRead(userId: UUID)`

모든 알림을 읽음으로 표시합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| userId | UUID | 사용자 ID |

**반환값:**
```typescript
ActionResult<void>
```

#### `deleteNotification(notificationId: UUID)`

알림을 삭제합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| notificationId | UUID | 알림 ID |

**반환값:**
```typescript
ActionResult<void>
```

#### `getNotificationSettings(userId: UUID)`

알림 설정을 조회합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| userId | UUID | 사용자 ID |

**반환값:**
```typescript
ActionResult<NotificationSettings>
```

**NotificationSettings:**
```typescript
interface NotificationSettings {
  comment: boolean
  reply: boolean
  mention: boolean
  message: boolean
  recommendation: boolean
  system: boolean
  email?: boolean
  emailDigest?: 'daily' | 'weekly' | 'never'
}
```

#### `updateNotificationSettings(userId: UUID, settings: Partial<NotificationSettings>)`

알림 설정을 업데이트합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| userId | UUID | 사용자 ID |
| settings | Partial<NotificationSettings> | 업데이트할 설정 |

**반환값:**
```typescript
ActionResult<NotificationSettings>
```

---

### 2.4 레이아웃 Server Actions

**파일:** `app/actions/layouts.ts`

#### `getLayouts()`

모든 레이아웃을 조회합니다.

**반환값:**
```typescript
Layout[]
```

#### `getLayoutById(layoutId: string)`

특정 레이아웃을 조회합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| layoutId | string | 레이아웃 ID |

**반환값:**
```typescript
Layout | null
```

#### `getLayoutDetail(layoutId: string)`

레이아웃 상세(위젯, 컬럼 포함)를 조회합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| layoutId | string | 레이아웃 ID |

**반환값:**
```typescript
{
  layout: Layout
  columns: LayoutColumn[]
  widgets: LayoutWidget[]
}
```

#### `createLayout(layout: Partial<Layout>)`

새 레이아웃을 생성합니다.

**매개변수:**
```typescript
interface Partial<Layout> {
  name: string
  title: string
  description?: string
  layout_type?: 'default' | 'custom' | 'blog' | 'forum' | 'landing'
  is_default?: boolean
  config?: {
    columns: any[]
    widgets: any[]
  }
}
```

**반환값:**
```typescript
{
  success: boolean
  data?: Layout
  error?: string
}
```

#### `updateLayout(layoutId: string, updates: Partial<Layout>)`

레이아웃을 업데이트합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| layoutId | string | 레이아웃 ID |
| updates | Partial<Layout> | 업데이트할 데이터 |

**반환값:**
```typescript
{
  success: boolean
  error?: string
}
```

#### `deleteLayout(layoutId: string)`

레이아웃을 소프트 삭제합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| layoutId | string | 레이아웃 ID |

**반환값:**
```typescript
{
  success: boolean
  error?: string
}
```

#### `addWidgetToLayout(layoutId: string, widget: WidgetInput)`

레이아웃에 위젯을 추가합니다.

**매개변수:**
```typescript
interface WidgetInput {
  widget_id: string
  column_index: number
  row_index: number
  order_index: number
  width_fraction?: number
  config?: Record<string, any>
}
```

**반환값:**
```typescript
{
  success: boolean
  error?: string
}
```

#### `updateLayoutWidget(widgetId: string, updates: Partial<LayoutWidget>)`

레이아웃 위젯을 업데이트합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| widgetId | string | 위젯 ID |
| updates | Partial<LayoutWidget> | 업데이트할 데이터 |

**반환값:**
```typescript
{
  success: boolean
  error?: string
}
```

#### `removeWidgetFromLayout(widgetId: string)`

레이아웃에서 위젯을 제거합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| widgetId | string | 위젯 ID |

**반환값:**
```typescript
{
  success: boolean
  error?: string
}
```

#### `reorderLayoutWidgets(layoutId: string, widgets: WidgetReorder[])`

레이아웃 위젯 순서를 재배치합니다.

**매개변수:**
```typescript
interface WidgetReorder {
  id: string
  column_index: number
  row_index: number
  order_index: number
}
```

**반환값:**
```typescript
{
  success: boolean
  error?: string
}
```

#### `getAvailableWidgets()`

사용 가능한 위젯 목록을 조회합니다.

**반환값:**
```typescript
AvailableWidget[]
```

---

### 2.5 드래프트 Server Actions

**파일:** `app/actions/draft.ts`

#### `getAllDrafts()`

모든 드래프트를 조회합니다.

**반환값:**
```typescript
{
  success: boolean
  data?: DraftListItem[]
  error?: string
}
```

**DraftListItem:**
```typescript
interface DraftListItem {
  id: string
  target_type: 'post' | 'page' | 'comment'
  target_id: string | null
  title: string
  excerpt: string | null
  saved_at: string
  expires_at: string
}
```

#### `restoreDraft(draftId: string)`

드래프트를 복구합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| draftId | string | 드래프트 ID |

**반환값:**
```typescript
{
  success: boolean
  data?: Draft
  error?: string
}
```

**Draft:**
```typescript
interface Draft {
  id: string
  user_id: string
  target_type: 'post' | 'page' | 'comment'
  target_id: string | null
  title: string
  content: string
  content_html: string | null
  excerpt: string | null
  metadata: Record<string, any>
  saved_at: string
  expires_at: string
}
```

#### `deleteDraft(draftId: string)`

드래프트를 삭제합니다.

**매개변수:**
| 이름 | 타입 | 설명 |
|------|------|------|
| draftId | string | 드래프트 ID |

**반환값:**
```typescript
{
  success: boolean
  error?: string
}
```

#### `cleanupExpiredDrafts()`

만료된 드래프트를 정리합니다 (주기적 실행용).

**반환값:**
```typescript
{
  success: boolean
  deleted: number
  error?: string
}
```

---

## 3. React Hooks

### 3.1 useMessages

메시지 시스템을 위한 커스텀 훅입니다.

**파일:** `hooks/useMessages.ts`

**매개변수:**
```typescript
interface UseMessagesOptions {
  userId: UUID
  folder: 'inbox' | 'sent'
  search?: string
}
```

**반환값:**
```typescript
{
  messages: Message[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  markAsRead: (messageId: UUID) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteMessage: (messageId: UUID) => Promise<void>
  refresh: () => Promise<void>
}
```

**사용 예시:**
```typescript
import { useMessages } from '@/hooks/useMessages'

function MessageInbox() {
  const { messages, unreadCount, isLoading, markAsRead } = useMessages({
    userId: user.id,
    folder: 'inbox'
  })

  if (isLoading) return <div>로딩 중...</div>

  return (
    <div>
      <span>읽지 않은 메시지: {unreadCount}</span>
      {messages.map(msg => (
        <div key={msg.id}>
          <h3>{msg.title}</h3>
          <p>{msg.content}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### 3.2 useNotifications

알림 시스템을 위한 커스텀 훅입니다.

**파일:** `hooks/useNotifications.ts`

**매개변수:**
```typescript
interface UseNotificationsOptions {
  userId: UUID
  realtime?: boolean
  showToast?: boolean
  limit?: number
}
```

**반환값:**
```typescript
{
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  realtimeStatus: 'connected' | 'connecting' | 'disconnected'
  markAsRead: (notificationId: UUID) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: UUID) => Promise<void>
  refresh: () => Promise<void>
}
```

**사용 예시:**
```typescript
import { useNotifications } from '@/hooks/useNotifications'

function NotificationBell() {
  const { notifications, unreadCount, realtimeStatus } = useNotifications({
    userId: user.id,
    realtime: true,
    limit: 10
  })

  return (
    <div>
      <Bell />
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
      <span className={realtimeStatus === 'connected' ? 'text-green-500' : 'text-yellow-500'}>
        {realtimeStatus}
      </span>
    </div>
  )
}
```

---

### 3.3 useRealtime

Supabase Realtime 구독을 위한 커스텀 훅입니다.

**파일:** `hooks/useRealtime.ts`

**매개변수:**
```typescript
interface UseRealtimeOptions {
  table: string
  filter?: string
  enabled?: boolean
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}
```

**사용 예시:**
```typescript
import { useRealtime } from '@/hooks/useRealtime'

function LiveMessages() {
  useRealtime({
    table: 'messages',
    filter: `receiver_id=eq.${user.id}`,
    enabled: true,
    onInsert: () => {
      toast({ title: '새 메시지가 도착했습니다.' })
    }
  })

  return <div>...</div>
}
```

---

## 4. 데이터베이스 스키마

### 4.1 editor_autosave

자동저장 드래프트 테이블입니다.

```sql
CREATE TABLE editor_autosave (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'page', 'comment')),
  target_id UUID,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  content_html TEXT,
  excerpt TEXT,
  metadata JSONB DEFAULT '{}',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);
```

**인덱스:**
- `user_id`
- `target_type + target_id`
- `expires_at`

---

### 4.2 messages

개인 메시지 테이블입니다.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES messages(id),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_sender_deleted BOOLEAN DEFAULT FALSE,
  is_receiver_deleted BOOLEAN DEFAULT FALSE,
  sender_deleted_at TIMESTAMPTZ,
  receiver_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스:**
- `sender_id`
- `receiver_id`
- `is_read + receiver_id`

---

### 4.3 message_blocks

사용자 차단 테이블입니다.

```sql
CREATE TABLE message_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id),
  blocked_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);
```

**함수:**
```sql
CREATE OR REPLACE FUNCTION is_blocked(p_user_id UUID, p_target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM message_blocks
    WHERE blocker_id = p_user_id AND blocked_id = p_target_id
  );
END;
$$ LANGUAGE plpgsql;
```

---

### 4.4 notifications

알림 테이블입니다.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  action_url TEXT,
  action_label TEXT,
  icon TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스:**
- `user_id`
- `is_read + user_id`
- `created_at (DESC)`

---

### 4.5 layouts

레이아웃 테이블입니다.

```sql
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  layout_type TEXT NOT NULL DEFAULT 'custom',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{"columns": [], "widgets": []}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

---

### 4.6 layout_columns

레이아웃 컬럼 테이블입니다.

```sql
CREATE TABLE layout_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES layouts(id),
  column_index INTEGER NOT NULL,
  width_fraction DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  css_class TEXT,
  inline_style TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.7 layout_widgets

레이아웃 위젯 테이블입니다.

```sql
CREATE TABLE layout_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES layouts(id),
  widget_id UUID NOT NULL REFERENCES site_widgets(id),
  column_index INTEGER NOT NULL,
  row_index INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL,
  width_fraction DECIMAL(3,2) DEFAULT 1.0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. 타입 정의

### 5.1 ActionResult

Server Actions의 표준 반환 타입입니다.

```typescript
interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
```

---

### 5.2 Message

메시지 타입입니다.

```typescript
interface Message {
  id: UUID
  sender_id: UUID
  receiver_id: UUID
  title: string
  content: string
  parent_id: UUID | null
  is_read: boolean
  read_at: string | null
  is_sender_deleted: boolean
  is_receiver_deleted: boolean
  sender_deleted_at: string | null
  receiver_deleted_at: string | null
  created_at: string
}
```

---

### 5.3 Notification

알림 타입입니다.

```typescript
interface Notification {
  id: UUID
  user_id: UUID
  type: string
  title: string
  content: string | null
  action_url: string | null
  action_label: string | null
  icon: string | null
  is_read: boolean
  read_at: string | null
  metadata: Record<string, any>
  created_at: string
}
```

---

### 5.4 Layout

레이아웃 타입입니다.

```typescript
interface Layout {
  id: UUID
  name: string
  title: string
  description: string | null
  layout_type: 'default' | 'custom' | 'blog' | 'forum' | 'landing'
  is_default: boolean
  is_active: boolean
  config: {
    columns: any[]
    widgets: any[]
  }
  created_at: string
  updated_at: string
  deleted_at: string | null
}
```

---

### 5.5 UUID

UUID 타입 별칭입니다.

```typescript
type UUID = string
```

---

## 부록: 에러 코드

| 에러 코드 | 설명 |
|-----------|------|
| `UNAUTHORIZED` | 로그인 필요 |
| `NOT_FOUND` | 리소스 없음 |
| `PERMISSION_DENIED` | 권한 없음 |
| `INVALID_INPUT` | 입력값 오류 |
| `CREATE_FAILED` | 생성 실패 |
| `UPDATE_FAILED` | 업데이트 실패 |
| `DELETE_FAILED` | 삭제 실패 |
| `BLOCKED_USER` | 차단된 사용자 |
| `UNKNOWN_ERROR` | 알 수 없는 오류 |

---

**문서 버전:** 1.0.0
**마지막 업데이트:** 2026-02-24
**다음 업데이트 예정:** P2 기능 추가 시
