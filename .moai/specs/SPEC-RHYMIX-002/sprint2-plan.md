# Sprint 2 Execution Plan - SPEC-RHYMIX-002

## Plan Summary

Sprint 2는 게시판 고급 설정(UC-003)과 에디터 설정(UC-004) 구현에 집중합니다. 총 7개의 WHW 요구사항을 구현하며, 게시판 기본/콘텐츠/댓글/권한 설정(4개 WHW)과 에디터 기본/폰트/도구모음 설정(3개 WHW)을 포함합니다.

**중요**: 본 Sprint는 관리자 설정 페이지 구현에 집중합니다. 게시판/에디터 기능 자체는 이미 구현되어 있으며, 관리자가 이러한 기능들의 동작을 커스터마이즈할 수 있는 **설정 페이지**를 추가합니다.

### Key Context from Sprint 1

- `member_settings` 테이블 패턴 확립 (단일 행 설정 테이블)
- `app/actions/admin/member-settings.ts` 서버 액션 패턴 확립
- `lib/validations/member-settings.ts` Zod 검증 패턴 확립
- `app/(admin)/admin/settings/member/page.tsx` 설정 페이지 패턴 확립

---

## Requirements Analysis

### Sprint 2: Board & Editor Configuration (HIGH Priority)

| WHW ID | Requirement | Complexity | Methodology | Effort |
|--------|------------|------------|-------------|--------|
| WHW-020 | 게시판 기본 설정 (모듈 분류, 레이아웃, 스킨, 모바일, 설명, 상단/하단 내용) | Medium | TDD (NEW) | 4h |
| WHW-021 | 게시판 콘텐츠 설정 (히스토리, 추천/비추천, 신고 기능) | Medium | TDD (NEW) | 3h |
| WHW-022 | 댓글 설정 (페이지당 댓글 수, 페이지 수, 대댓글 깊이, 검증) | Low | TDD (NEW) | 2h |
| WHW-023 | 게시판 권한 설정 (그룹별 목록/열람/작성/댓글/추천 권한) | High | TDD (NEW) | 5h |
| WHW-030 | 에디터 기본 설정 (스킨, 컬러셋, 높이, 툴바) | Medium | DDD (MODIFY) | 3h |
| WHW-031 | 폰트 설정 (본문/제목/크기 옵션) | Low | TDD (NEW) | 2h |
| WHW-032 | 에디터 도구 모음 (글꼴, 크기, 색상, 정렬, 링크 등) | Medium | TDD (NEW) | 3h |

**Total Sprint 2 Estimate**: 22 hours (~3 days)

---

## Existing Code Analysis

### Current Board System (DDD - ANALYZE Phase Completed)

1. **Database Layer**:
   - `boards` 테이블 존재 (`supabase/migrations/`)
   - `config` JSONB 컬럼으로 BoardConfig 저장 중
   - `types/board.ts`에 `BoardConfig` 인터페이스 정의됨

2. **Action Layer**:
   - `app/actions/board.ts`에 게시판 CRUD 존재
   - `createBoard`, `updateBoard`, `getBoards`, `getBoardBySlug` 함수 존재
   - `BoardConfig` 타입이 이미 사용 중

3. **UI Layer**:
   - `app/(admin)/admin/boards/page.tsx` - 게시판 목록 페이지
   - `app/(admin)/admin/boards/BoardsTable.tsx` - 게시판 테이블 컴포넌트
   - `CreateBoardDialog` - 게시판 생성 다이얼로그 (기본 필드만 존재)

4. **Current Editor System**:
   - `app/actions/editor.ts` - 에디터 관련 서버 액션 (업로드, 자동저장)
   - `app/(admin)/admin/editor/page.tsx` - 에디터 설정 페이지 (Placeholder 상태)

### Gap Analysis

| Component | Current State | Required State |
|-----------|--------------|----------------|
| boards.config | 기본 설정만 저장 (post_permission, list_count 등) | WHW-020~023 모든 설정 저장 필요 |
| BoardConfig type | 30개 필드 정의됨 | 50+ 필드로 확장 필요 |
| Board create/edit UI | 기본 필드만 표시 | 모든 설정 필드 표시 |
| editor_settings table | 존재하지 않음 | 신규 생성 필요 |
| Editor settings UI | Placeholder | 완전한 설정 페이지 |

---

## Task Decomposition

### Phase 1: Database Schema Extensions (DDD - ANALYZE/PRESERVE)

#### Task 1.1: Extend boards.config JSONB structure

- **Type**: DDD (MODIFY existing)
- **Files**:
  - `types/board.ts` (MODIFY) - BoardConfig 인터페이스 확장
  - `lib/validations/board-config.ts` (NEW) - Zod 스키마 추가
  - `__tests__/validations/board-config.test.ts` (NEW)
- **Dependencies**: None
- **Approach**:
  1. ANALYZE: 기존 BoardConfig 필드 분석
  2. PRESERVE: 기존 필드 유지하며 새 필드 추가
  3. IMPROVE: WHW-020~023 필드 추가
- **Acceptance**:
  - 모든 WHW-020~023 필드가 BoardConfig에 정의됨
  - 기존 필드 호환성 유지
  - Zod 검증 스키마 완료
  - 테스트 커버리지 >= 90%

#### Task 1.2: Create editor_settings table migration

- **Type**: TDD (NEW code)
- **Files**:
  - `supabase/migrations/TIMESTAMP_editor_settings.sql` (NEW)
  - `lib/supabase/database.types.ts` (MODIFY)
  - `types/editor.ts` (NEW)
- **Dependencies**: None
- **Approach**:
  1. RED: 설정 테이블 요구사항 정의
  2. GREEN: 마이그레이션 작성
  3. REFACTOR: 타입 정의 정리
- **Acceptance**:
  - editor_settings 테이블 생성
  - RLS 정책 적용 (관리자만 접근)
  - TypeScript 타입 생성
  - Rollback 마이그레이션 포함

#### Task 1.3: Create board_permissions table

- **Type**: TDD (NEW code)
- **Files**:
  - `supabase/migrations/TIMESTAMP_board_permissions.sql` (NEW)
  - `types/board-permission.ts` (NEW)
- **Dependencies**: Task 1.1
- **Approach**:
  1. RED: 권한 테이블 요구사항 정의
  2. GREEN: 마이그레이션 작성 (그룹별 권한 저장)
  3. REFACTOR: 인덱스 최적화
- **Acceptance**:
  - board_permissions 테이블 생성 (board_id, group_id, permission_type)
  - 복합 유니크 인덱스
  - RLS 정책 적용

---

### Phase 2: Board Settings API (TDD - RED-GREEN-REFACTOR)

#### Task 2.1: Create board config validation schemas

- **Type**: TDD (NEW code)
- **Files**:
  - `lib/validations/board-config.ts` (NEW)
  - `__tests__/validations/board-config.test.ts` (NEW)
- **Dependencies**: Task 1.1
- **Approach**:
  1. RED: 모든 WHW-020~023 검증 규칙 테스트 작성
  2. GREEN: Zod 스키마 구현
  3. REFACTOR: 공통 패턴 추출
- **Acceptance**:
  - WHW-020: 기본 설정 검증 (layout, skin, mobile 설정)
  - WHW-021: 콘텐츠 설정 검증 (history, vote, report)
  - WHW-022: 댓글 설정 검증 (count, depth, validation)
  - WHW-023: 권한 설정 검증 (group permissions)
  - 테스트 커버리지 >= 90%

#### Task 2.2: Create board settings server actions

- **Type**: TDD (NEW code)
- **Files**:
  - `app/actions/admin/board-settings.ts` (NEW)
  - `__tests__/actions/admin/board-settings.test.ts` (NEW)
- **Dependencies**: Task 2.1
- **Approach**:
  1. RED: 서버 액션 테스트 작성
  2. GREEN: getBoardSettings, updateBoardSettings 구현
  3. REFACTOR: 에러 처리 통일
- **Acceptance**:
  - getBoardSettings(boardId): 게시판 설정 조회
  - updateBoardSettings(boardId, data): 설정 업데이트
  - 관리자 권한 검증
  - 감사 로그 기록

#### Task 2.3: Create board permissions API

- **Type**: TDD (NEW code)
- **Files**:
  - `app/actions/admin/board-permissions.ts` (NEW)
  - `__tests__/actions/admin/board-permissions.test.ts` (NEW)
- **Dependencies**: Task 1.3
- **Approach**:
  1. RED: 권한 API 테스트 작성
  2. GREEN: 권한 CRUD 구현
  3. REFACTOR: 권한 체크 유틸리티 추출
- **Acceptance**:
  - getBoardPermissions(boardId): 그룹별 권한 조회
  - updateBoardPermissions(boardId, permissions): 권한 업데이트
  - checkBoardPermission(boardId, userId, action): 권한 확인

---

### Phase 3: Board Settings UI (TDD - RED-GREEN-REFACTOR)

#### Task 3.1: Create board settings page route

- **Type**: TDD (NEW code)
- **Files**:
  - `app/(admin)/admin/boards/[id]/settings/page.tsx` (NEW)
  - `__tests__/pages/admin/boards/settings.test.tsx` (NEW)
- **Dependencies**: Task 2.2
- **Approach**:
  1. RED: 페이지 구조 테스트
  2. GREEN: 설정 페이지 구현
  3. REFACTOR: 레이아웃 컴포넌트 추출
- **Acceptance**:
  - /admin/boards/[id]/settings 라우트 동작
  - 로딩 상태 표시
  - 에러 처리
  - 탭 네비게이션 (기본/콘텐츠/댓글/권한)

#### Task 3.2: Implement Basic Settings Tab (WHW-020)

- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/board-settings/BasicSettings.tsx` (NEW)
  - `__tests__/components/admin/board-settings/BasicSettings.test.tsx` (NEW)
- **Dependencies**: Task 3.1
- **Approach**:
  1. RED: 컴포넌트 테스트 작성
  2. GREEN: 폼 필드 구현
  3. REFACTOR: 공통 폼 컴포넌트 추출
- **Acceptance**:
  - 모듈 분류 선택
  - 레이아웃 선택 (드롭다운)
  - 스킨 선택 (드롭다운)
  - 모바일 뷰 토글
  - 모바일 레이아웃/스킨 (조건부 표시)
  - 설명 (텍스트에리어)
  - 상단/하단 내용 (에디터)

#### Task 3.3: Implement Content Settings Tab (WHW-021)

- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/board-settings/ContentSettings.tsx` (NEW)
  - `__tests__/components/admin/board-settings/ContentSettings.test.tsx` (NEW)
- **Dependencies**: Task 3.1
- **Approach**:
  1. RED: 콘텐츠 설정 테스트
  2. GREEN: 히스토리/추천/신고 설정 구현
  3. REFACTOR: 조건부 필드 컴포넌트화
- **Acceptance**:
  - 히스토리 추적 (미사용/사용/흔적만)
  - 추천 기능 (사용/공개/미사용)
  - 비추천 기능 (사용/공개/미사용)
  - 동일 IP 추천 허용 토글
  - 추천 취소 허용 토글
  - 비회원 추천 허용 토글
  - 신고 기능 설정
  - 신고 알림 대상 선택

#### Task 3.4: Implement Comment Settings Tab (WHW-022)

- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/board-settings/CommentSettings.tsx` (NEW)
  - `__tests__/components/admin/board-settings/CommentSettings.test.tsx` (NEW)
- **Dependencies**: Task 3.1
- **Approach**:
  1. RED: 댓글 설정 테스트
  2. GREEN: 댓글 관련 필드 구현
  3. REFACTOR: 숫자 입력 컴포넌트화
- **Acceptance**:
  - 페이지당 댓글 수 (숫자 입력)
  - 댓글 페이지 수 (숫자 입력)
  - 대댓글 최대 깊이 (숫자 입력, 1-10)
  - 기본 페이지 (첫/마지막 라디오)
  - 댓글 검증 사용 토글

#### Task 3.5: Implement Permissions Tab (WHW-023)

- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/board-settings/PermissionsSettings.tsx` (NEW)
  - `components/admin/board-settings/PermissionMatrix.tsx` (NEW)
  - `__tests__/components/admin/board-settings/PermissionsSettings.test.tsx` (NEW)
- **Dependencies**: Task 2.3, Task 3.1
- **Approach**:
  1. RED: 권한 매트릭스 테스트
  2. GREEN: 그룹별 권한 테이블 구현
  3. REFACTOR: 권한 체크박스 컴포넌트화
- **Acceptance**:
  - 그룹 목록 표시 (profiles groups에서 가져오기)
  - 권한 매트릭스 (행: 그룹, 열: 권한)
  - 권한: 목록 보기, 글 열람, 글 작성, 댓글 작성, 추천인 보기, 수정 내역 보기, 상담글 열람, 접근 권한, 관리 권한
  - 일괄 설정 기능
  - 변경 사항 저장

---

### Phase 4: Editor Settings Implementation (DDD - ANALYZE-PRESERVE-IMPROVE)

#### Task 4.1: Enhance existing editor settings page

- **Type**: DDD (MODIFY existing)
- **Files**:
  - `app/(admin)/admin/editor/page.tsx` (MODIFY)
  - `__tests__/pages/admin/editor.test.tsx` (NEW)
- **Dependencies**: Task 1.2
- **Approach**:
  1. ANALYZE: 기존 Placeholder 페이지 분석
  2. PRESERVE: 기존 UI 구조 유지
  3. IMPROVE: 완전한 설정 페이지로 변경
- **Acceptance**:
  - 기존 Placeholder 제거
  - 탭 네비게이션 추가 (기본/폰트/도구모음)
  - 로딩/에러 상태 처리

#### Task 4.2: Create editor settings server actions

- **Type**: TDD (NEW code)
- **Files**:
  - `app/actions/admin/editor-settings.ts` (NEW)
  - `__tests__/actions/admin/editor-settings.test.ts` (NEW)
- **Dependencies**: Task 1.2
- **Approach**:
  1. RED: 서버 액션 테스트
  2. GREEN: getEditorSettings, updateEditorSettings 구현
  3. REFACTOR: 설정 기본값 처리
- **Acceptance**:
  - getEditorSettings(): 에디터 설정 조회
  - updateEditorSettings(data): 설정 업데이트
  - 기본값 반환 (설정 없을 때)
  - 관리자 권한 검증

#### Task 4.3: Implement Editor Basic Settings (WHW-030)

- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/editor-settings/BasicSettings.tsx` (NEW)
  - `__tests__/components/admin/editor-settings/BasicSettings.test.tsx` (NEW)
- **Dependencies**: Task 4.1, Task 4.2
- **Approach**:
  1. RED: 기본 설정 테스트
  2. GREEN: 에디터 스킨/높이/툴바 설정 구현
  3. REFACTOR: 선택 옵션 컴포넌트화
- **Acceptance**:
  - 에디터 스킨 선택 (CKEditor/SimpleEditor/Textarea)
  - 컬러셋 선택 (Moono/Moono Dark/Moono Lisa)
  - 에디터 높이 (숫자 입력, 200-800)
  - 툴바 모드 (기본/간단)
  - 툴바 숨김 토글

#### Task 4.4: Implement Font Settings (WHW-031)

- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/editor-settings/FontSettings.tsx` (NEW)
  - `__tests__/components/admin/editor-settings/FontSettings.test.tsx` (NEW)
- **Dependencies**: Task 4.1, Task 4.2
- **Approach**:
  1. RED: 폰트 설정 테스트
  2. GREEN: 폰트 관련 필드 구현
  3. REFACTOR: 폰트 프리뷰 컴포넌트
- **Acceptance**:
  - 본문 폰트 선택 (20+ 폰트 옵션)
  - 폰트 크기 선택 (10-24px)
  - 줄 간격 (1.0-2.0 step 0.1)
  - 문단 간격 (0-30px)
  - 줄바꿈 방식 (HTML/BR)

#### Task 4.5: Implement Editor Toolbar Settings (WHW-032)

- **Type**: TDD (NEW code)
- **Files**:
  - `components/admin/editor-settings/ToolbarSettings.tsx` (NEW)
  - `components/admin/editor-settings/ToolbarItem.tsx` (NEW)
  - `__tests__/components/admin/editor-settings/ToolbarSettings.test.tsx` (NEW)
- **Dependencies**: Task 4.1, Task 4.2
- **Approach**:
  1. RED: 도구모음 설정 테스트
  2. GREEN: 툴바 아이템 토글 구현
  3. REFACTOR: 드래그 앤 드롭 정렬 (선택사항)
- **Acceptance**:
  - 툴바 아이템 토글 목록:
    - 글꼴, 크기, 색상, 배경색
    - 굵게, 기울임, 밑줄, 취소선
    - 왼쪽/가운데/오른쪽/양끙 정렬
    - 순서/비순서 목록
    - 링크, 이미지, 동영상
    - 테이블, 코드블록
    - 인용구, 수평선
    - 실행취소/재실행
    - 전체화면, 소스보기
  - 활성화/비활성화 토글
  - 현재 설정 시각적 표시

---

### Phase 5: Integration and Testing

#### Task 5.1: Update board creation/edit flow

- **Type**: DDD (MODIFY existing)
- **Files**:
  - `app/(admin)/admin/boards/BoardsTable.tsx` (MODIFY)
  - `components/admin/AddBoardDialog.tsx` (MODIFY/NEW)
- **Dependencies**: Task 2.2, Task 3.1
- **Approach**:
  1. ANALYZE: 기존 게시판 생성/편집 흐름
  2. PRESERVE: 기본 CRUD 동작 유지
  3. IMPROVE: 설정 페이지 링크 추가
- **Acceptance**:
  - 게시판 생성 후 설정 페이지로 이동 옵션
  - 게시판 목록에서 설정 버튼 추가
  - 기본 설정은 생성 다이얼로그에 유지

#### Task 5.2: Integration tests for board settings

- **Type**: TDD (NEW code)
- **Files**:
  - `__tests__/integration/board-settings.test.ts` (NEW)
- **Dependencies**: Phase 2, Phase 3
- **Approach**:
  1. RED: 통합 시나리오 테스트
  2. GREEN: 컴포넌트 간 상호작용 검증
  3. REFACTOR: 테스트 유틸리티 추출
- **Acceptance**:
  - 설정 저장 후 페이지 새로고침 시 유지
  - 권한 설정 후 실제 권한 체크 동작
  - 에디터 설정 후 CKEditor 설정 반영

#### Task 5.3: E2E tests for admin workflows

- **Type**: TDD (NEW code)
- **Files**:
  - `e2e/admin/board-settings.spec.ts` (NEW)
  - `e2e/admin/editor-settings.spec.ts` (NEW)
- **Dependencies**: Phase 3, Phase 4
- **Approach**:
  1. RED: E2E 시나리오 작성
  2. GREEN: Playwright 테스트 구현
  3. REFACTOR: 페이지 오브젝트 패턴
- **Acceptance**:
  - 게시판 설정 변경 전체 흐름
  - 에디터 설정 변경 전체 흐름
  - 권한 설정 및 검증

---

## Technical Approach

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (React Components)                                │
│  - BoardSettingsPage (Tabs: Basic/Content/Comment/Perm)    │
│  - EditorSettingsPage (Tabs: Basic/Font/Toolbar)           │
│  - shadcn/ui Card, Tabs, Switch, Select, Input             │
│  - React Hook Form + Zod validation                         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  API Layer (Server Actions)                                 │
│  - getBoardSettings, updateBoardSettings                    │
│  - getBoardPermissions, updateBoardPermissions             │
│  - getEditorSettings, updateEditorSettings                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Database Layer (Supabase)                                  │
│  - boards.config JSONB (Extended)                           │
│  - board_permissions table (NEW)                            │
│  - editor_settings table (NEW)                              │
│  - RLS policies for admin-only access                       │
└─────────────────────────────────────────────────────────────┘
```

### Validation Schema Example

```typescript
// lib/validations/board-config.ts
export const boardConfigSchema = z.object({
  // WHW-020: Basic settings
  module_category: z.string().optional(),
  layout: z.string().default('default'),
  skin: z.string().default('default'),
  use_mobile: z.boolean().default(true),
  mobile_layout: z.string().optional(),
  mobile_skin: z.string().optional(),
  description: z.string().max(500).optional(),
  header_text: z.string().max(5000).optional(),
  footer_text: z.string().max(5000).optional(),

  // WHW-021: Content settings
  use_history: z.enum(['none', 'use', 'trace']).default('none'),
  use_vote_up: z.enum(['use', 'public', 'none']).default('use'),
  use_vote_down: z.enum(['use', 'public', 'none']).default('none'),
  allow_vote_from_same_ip: z.boolean().default(false),
  allow_vote_cancel: z.boolean().default(true),
  allow_vote_non_member: z.boolean().default(false),
  use_report: z.boolean().default(true),
  report_admin_ids: z.array(z.string()).default([]),

  // WHW-022: Comment settings
  comment_count: z.number().min(10).max(200).default(50),
  comment_page_count: z.number().min(5).max(50).default(10),
  max_thread_depth: z.number().min(1).max(10).default(7),
  comment_default_page: z.enum(['first', 'last']).default('last'),
  use_comment_validation: z.boolean().default(true),

  // Existing fields (preserve)
  post_permission: z.enum(['all', 'member', 'admin']).default('member'),
  comment_permission: z.enum(['all', 'member', 'admin']).default('member'),
  list_count: z.number().default(20),
  // ... other existing fields
});

// lib/validations/editor-settings.ts
export const editorSettingsSchema = z.object({
  // WHW-030: Basic settings
  editor_skin: z.enum(['ckeditor', 'simple', 'textarea']).default('ckeditor'),
  color_set: z.enum(['moono', 'moono-dark', 'moono-lisa']).default('moono'),
  editor_height: z.number().min(200).max(800).default(300),
  toolbar_mode: z.enum(['default', 'simple']).default('default'),
  hide_toolbar: z.boolean().default(false),

  // WHW-031: Font settings
  content_font: z.string().default('inherit'),
  content_font_size: z.number().min(10).max(24).default(14),
  line_height: z.number().min(1.0).max(2.0).default(1.6),
  paragraph_margin: z.number().min(0).max(30).default(10),
  line_break_mode: z.enum(['html', 'br']).default('html'),

  // WHW-032: Toolbar settings
  toolbar_items: z.array(z.string()).default([
    'font', 'size', 'color', 'bgcolor',
    'bold', 'italic', 'underline', 'strikethrough',
    'align', 'list', 'link', 'image',
  ]),
  enable_autosave: z.boolean().default(true),
  auto_dark_mode: z.boolean().default(false),
  allow_html: z.boolean().default(true),
});
```

### Database Schema Extensions

```sql
-- Extend boards.config (via application layer, no migration needed)
-- BoardConfig interface already exists, just add new fields

-- Create board_permissions table (WHW-023)
CREATE TABLE board_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN (
    'list', 'view', 'write', 'comment', 'vote_view',
    'history', 'consultation', 'access', 'manage'
  )),
  is_granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, group_id, permission_type)
);

CREATE INDEX idx_board_permissions_board ON board_permissions(board_id);
CREATE INDEX idx_board_permissions_group ON board_permissions(group_id);

-- Create editor_settings table (WHW-030~032)
CREATE TABLE editor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHW-030: Basic settings
  editor_skin TEXT DEFAULT 'ckeditor' CHECK (editor_skin IN ('ckeditor', 'simple', 'textarea')),
  color_set TEXT DEFAULT 'moono' CHECK (color_set IN ('moono', 'moono-dark', 'moono-lisa')),
  editor_height INTEGER DEFAULT 300 CHECK (editor_height BETWEEN 200 AND 800),
  toolbar_mode TEXT DEFAULT 'default' CHECK (toolbar_mode IN ('default', 'simple')),
  hide_toolbar BOOLEAN DEFAULT false,

  -- WHW-031: Font settings
  content_font TEXT DEFAULT 'inherit',
  content_font_size INTEGER DEFAULT 14 CHECK (content_font_size BETWEEN 10 AND 24),
  line_height DECIMAL(3,1) DEFAULT 1.6 CHECK (line_height BETWEEN 1.0 AND 2.0),
  paragraph_margin INTEGER DEFAULT 10 CHECK (paragraph_margin BETWEEN 0 AND 30),
  line_break_mode TEXT DEFAULT 'html' CHECK (line_break_mode IN ('html', 'br')),

  -- WHW-032: Toolbar settings
  toolbar_items TEXT[] DEFAULT ARRAY['font', 'size', 'color', 'bgcolor', 'bold', 'italic', 'underline', 'strikethrough', 'align', 'list', 'link', 'image'],
  enable_autosave BOOLEAN DEFAULT true,
  auto_dark_mode BOOLEAN DEFAULT false,
  allow_html BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure single row
INSERT INTO editor_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE board_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE editor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access" ON board_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin only access" ON editor_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### UI Component Pattern

```tsx
// components/admin/board-settings/BoardSettingsPage.tsx
'use client';

import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { boardConfigSchema, type BoardConfigFormData } from '@/lib/validations/board-config';
import { BasicSettings } from './BasicSettings';
import { ContentSettings } from './ContentSettings';
import { CommentSettings } from './CommentSettings';
import { PermissionsSettings } from './PermissionsSettings';

export function BoardSettingsPage({ initialData, boardId }: Props) {
  const form = useForm<BoardConfigFormData>({
    resolver: zodResolver(boardConfigSchema),
    defaultValues: initialData,
  });

  // Auto-save on change (debounced)
  // Similar to MemberSettingsPage pattern

  return (
    <Form {...form}>
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">기본 설정</TabsTrigger>
          <TabsTrigger value="content">콘텐츠</TabsTrigger>
          <TabsTrigger value="comment">댓글</TabsTrigger>
          <TabsTrigger value="permissions">권한</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicSettings form={form} />
        </TabsContent>
        <TabsContent value="content">
          <ContentSettings form={form} />
        </TabsContent>
        <TabsContent value="comment">
          <CommentSettings form={form} />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionsSettings boardId={boardId} />
        </TabsContent>
      </Tabs>
    </Form>
  );
}
```

---

## Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| BoardConfig JSONB 마이그레이션 | Low | Medium | 기존 데이터 호환성 테스트, 점진적 필드 추가 |
| 권한 시스템 복잡도 | Medium | High | 단순화된 권한 모델로 시작, 필요시 확장 |
| CKEditor 연동 | Low | Low | 설정은 JSON으로 저장, CKEditor 초기화 시 적용 |
| 대량 권한 업데이트 성능 | Low | Medium | 배치 처리, 트랜잭션 사용 |

### Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 기존 게시판 CRUD 영향 | Low | High | DDD 접근, 기존 동작 보존 테스트 |
| groups 테이블 의존성 | Medium | Medium | groups 테이블 존재 확인, 없으면 기본 그룹 사용 |
| 에디터 설정 CKEditor 반영 | Medium | Medium | 에디터 컴포넌트에서 설정 로드 로직 추가 |

### Rollback Plan

1. **Database Rollback**: 모든 마이그레이션에 DOWN 포함
2. **Code Rollback**: Git revert
3. **Feature Flags**: `ENABLE_BOARD_SETTINGS`, `ENABLE_EDITOR_SETTINGS`

---

## Success Criteria

### Functional Requirements

- [ ] WHW-020: 게시판 기본 설정 UI 및 저장 동작
- [ ] WHW-021: 게시판 콘텐츠 설정 UI 및 저장 동작
- [ ] WHW-022: 댓글 설정 UI 및 저장 동작
- [ ] WHW-023: 그룹별 권한 설정 UI 및 저장 동작
- [ ] WHW-030: 에디터 기본 설정 UI 및 저장 동작
- [ ] WHW-031: 폰트 설정 UI 및 저장 동작
- [ ] WHW-032: 툴바 설정 UI 및 저장 동작

### Quality Requirements

- [ ] Test coverage >= 85% for all new code
- [ ] 기존 게시판/에디터 기능 영향 없음
- [ ] TypeScript strict mode 에러 없음
- [ ] ESLint warnings 없음
- [ ] TRUST 5 quality gates passed

### Performance Requirements

- [ ] 설정 페이지 로드 < 2 seconds
- [ ] 설정 저장 응답 < 500ms
- [ ] 권한 매트릭스 렌더링 < 300ms (50개 그룹)

---

## Effort Estimate

### Detailed Breakdown

| Task Category | Tasks | Hours | Methodology |
|--------------|-------|-------|-------------|
| Database Schema | 3 | 4h | DDD (1), TDD (2) |
| Board Settings API | 3 | 5h | TDD (3) |
| Board Settings UI | 5 | 8h | TDD (5) |
| Editor Settings | 5 | 5h | DDD (1), TDD (4) |
| Integration & Testing | 3 | 4h | TDD (3) |
| **Sprint 2 Total** | **19** | **26h** | TDD (15), DDD (4) |

### Timeline

**Week 1 (Days 1-2)**: Database + Board API
- Day 1: Database schema migrations + BoardConfig 확장 (4h)
- Day 2: Board settings API + 권한 API (5h)

**Week 1 (Days 3-4)**: Board Settings UI
- Day 3: Board settings page + Basic/Content tabs (4h)
- Day 4: Comment/Permissions tabs (4h)

**Week 2 (Days 1-2)**: Editor Settings + Integration
- Day 1: Editor settings (5h)
- Day 2: Integration tests + E2E (4h)

**Total Duration**: 6 working days (~1.5 weeks)

---

## Next Steps

1. **Pre-Implementation Review**
   - BoardConfig 현재 필드 분석 결과 검토
   - groups 테이블 존재 및 구조 확인
   - UI 디자인 가이드 확인

2. **Sprint 2 Kickoff**
   - Task 1.1부터 시작 (BoardConfig 확장)
   - TDD RED-GREEN-REFACTOR 준수
   - DDD는 기존 코드 수정 시에만 적용

3. **Daily Checkpoints**
   - 각 Task 완료 후 테스트 실행
   - 진행 상황을 SPEC 문서에 업데이트
   - 블로커 즉시 보고

4. **Sprint 2 Completion**
   - 모든 acceptance tests 통과
   - 코드 리뷰 완료
   - Staging 환경 배포
   - 사용자 승인 테스트

---

## Handoff to Implementation Agent

### Context Package

```yaml
spec_id: SPEC-RHYMIX-002
sprint: 2
focus: Board & Editor Configuration Settings
methodology: hybrid

tdd_tasks:
  - Task 1.2: editor_settings migration (NEW)
  - Task 1.3: board_permissions migration (NEW)
  - Task 2.1-2.3: Board settings API (NEW)
  - Task 3.1-3.5: Board settings UI (NEW)
  - Task 4.2-4.5: Editor settings (NEW)
  - Task 5.2-5.3: Testing (NEW)

ddd_tasks:
  - Task 1.1: BoardConfig extension (MODIFY)
  - Task 4.1: Editor page enhancement (MODIFY)
  - Task 5.1: Board creation flow (MODIFY)

database_changes:
  - boards.config JSONB structure (EXTEND via app layer)
  - board_permissions table (NEW)
  - editor_settings table (NEW)

api_endpoints:
  - getBoardSettings/updateBoardSettings (Server Actions)
  - getBoardPermissions/updateBoardPermissions (Server Actions)
  - getEditorSettings/updateEditorSettings (Server Actions)

ui_pages:
  - /admin/boards/[id]/settings (NEW)
  - /admin/editor (ENHANCE)

existing_patterns:
  - member_settings table (single-row pattern)
  - app/actions/admin/member-settings.ts (server action pattern)
  - lib/validations/member-settings.ts (zod pattern)
  - app/(admin)/admin/settings/member/page.tsx (ui pattern)

test_requirements:
  coverage: 85%
  integration_tests: board settings flow, editor settings flow
  e2e_tests: Playwright for admin workflows
```

### Execution Command

```
/moai run SPEC-RHYMIX-002 --sprint 2
```

---

**Document Status**: READY FOR IMPLEMENTATION
**Created**: 2026-03-02
**Author**: manager-strategy agent
**Version**: 1.0.0
**Sprint**: 2 of 4
