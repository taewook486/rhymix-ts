# SPEC-RHYMIX-001 전체 구현 계획

**작성일:** 2026-02-21
**기준:** SPEC-RHYMIX-001 (spec.md, acceptance.md, plan.md)
**현재 진행률:** 80%

---

## 📋 실행 요약

| 단계 | 작업 | 우선순위 | 상태 | 예상 시간 |
|------|------|----------|------|----------|
| 1 | Server Actions 구현 | P0 | ✅ 완료 | 2-3시간 |
| 2 | 댓글 시스템 구현 | P0 | ✅ 완료 | 2-3시간 |
| 3 | 문서 모듈 구현 | P1 | ✅ 완료 | 2-3시간 |
| 4 | 메뉴 관리 구현 | P1 | ✅ 완료 | 1-2시간 |
| 5 | 관리자 기능 강화 | P1 | ✅ UI 완료 | 2-3시간 |
| 6 | 파일 업로드 구현 | P2 | 🔄 진행중 | 1-2시간 |
| 7 | 검색 기능 구현 | P2 | 🔄 진행중 | 1-2시간 |
| 8 | i18n 다국어 지원 | P3 | 🔄 진행중 | 2-3시간 |

---

## ✅ 완료된 작업

### Phase 1: Foundation Setup
- ✅ Next.js 16 App Router 설정
- ✅ TypeScript 5.9+ strict mode
- ✅ Tailwind CSS + shadcn/ui
- ✅ Supabase client 연결
- ✅ ESLint와 Prettier

### Phase 2: Core Architecture
- ✅ Supabase PostgreSQL 16 데이터베이스
- ✅ Row-Level Security (RLS)
- ✅ 사용자 인증 세션
- ✅ 인증 상태 UI 업데이트
- ✅ Server Actions for mutations

### Phase 3-7: 모듈 구현
- ✅ 게시판 모듈 (생성, 조회, 수정, 삭제)
- ✅ 회원 모듈 (가입, 로그인, 프로필)
- ✅ 문서 모듈 (버전 관리 포함)
- ✅ 댓글 시스템 (중첩 댓글)
- ✅ 메뉴 관리

### Phase 10: 관리자 패널
- ✅ 대시보드 (`/admin`, `/ko/admin`)
- ✅ 설정 관리 (`/admin/settings`)
- ✅ 회원 관리 (`/admin/members`)
- ✅ 게시판 관리 (`/admin/boards`)
- ✅ 메뉴 관리 (`/admin/menus`)
- ✅ **그룹 관리 (`/admin/groups`)** - UI 완료
- ✅ **권한 관리 (`/admin/permissions`)** - UI 완료
- ✅ **모듈 관리 (`/admin/modules`)** - UI 완료
- ✅ **분석 대시보드 (`/admin/analytics`)** - UI 완료
- ✅ **페이지 관리 (`/admin/pages`)** - UI 완료

### 로케일 라우팅
- ✅ `/ko`, `/en`, `/ja`, `/zh` 경로 지원
- ✅ 모든 주요 페이지의 로케일 버전

---

## 1단계: Server Actions 구현 (P0)

### 목적
모든 데이터 조작 작업(CRUD)을 위한 Server Actions 구현

### 작업 항목

#### 1.1 Board Server Actions
**파일:** `app/actions/board.ts`

```typescript
// 필요한 액션들:
- createBoard(data: BoardInsert): Promise<Board>
- updateBoard(id: string, data: BoardUpdate): Promise<Board>
- deleteBoard(id: string): Promise<void>
- getBoards(filters?: BoardFilters): Promise<Board[]>
- getBoardBySlug(slug: string): Promise<Board>
```

#### 1.2 Post Server Actions
**파일:** `app/actions/post.ts`

```typescript
// 필요한 액션들:
- createPost(data: PostInsert): Promise<Post>
- updatePost(id: string, data: PostUpdate): Promise<Post>
- deletePost(id: string): Promise<void>
- getPosts(filters?: PostFilters): Promise<Post[]>
- getPostById(id: string): Promise<Post>
- incrementViewCount(postId: string): Promise<void>
- votePost(postId: string, voteType: 'up' | 'down'): Promise<void>
```

#### 1.3 Comment Server Actions
**파일:** `app/actions/comment.ts`

```typescript
// 필요한 액션들:
- createComment(data: CommentInsert): Promise<Comment>
- updateComment(id: string, data: CommentUpdate): Promise<Comment>
- deleteComment(id: string): Promise<void>
- getComments(postId: string): Promise<Comment[]>
- voteComment(commentId: string, voteType: 'up' | 'down'): Promise<void>
```

#### 1.4 Member Server Actions
**파일:** `app/actions/member.ts`

```typescript
// 필요한 액션들:
- updateProfile(userId: string, data: ProfileUpdate): Promise<Profile>
- changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>
- uploadAvatar(userId: string, file: File): Promise<string>
- getMembers(filters?: MemberFilters): Promise<Profile[]>
- updateMemberRole(userId: string, role: string): Promise<void>
```

#### 1.5 Document Server Actions
**파일:** `app/actions/document.ts`

```typescript
// 필요한 액션들:
- createDocument(data: DocumentInsert): Promise<Document>
- updateDocument(id: string, data: DocumentUpdate): Promise<Document>
- deleteDocument(id: string): Promise<void>
- publishDocument(id: string): Promise<Document>
- getDocuments(filters?: DocumentFilters): Promise<Document[]>
- getDocumentById(id: string): Promise<Document>
- getDocumentVersions(documentId: string): Promise<DocumentVersion[]>
- restoreVersion(documentId: string, version: number): Promise<Document>
```

#### 1.6 Menu Server Actions
**파일:** `app/actions/menu.ts`

```typescript
// 필요한 액션들:
- createMenu(data: MenuInsert): Promise<Menu>
- updateMenu(id: string, data: MenuUpdate): Promise<Menu>
- deleteMenu(id: string): Promise<void>
- createMenuItem(data: MenuItemInsert): Promise<MenuItem>
- updateMenuItem(id: string, data: MenuItemUpdate): Promise<MenuItem>
- deleteMenuItem(id: string): Promise<void>
- reorderMenuItems(menuId: string, items: MenuItemOrder[]): Promise<void>
- getMenus(location?: string): Promise<Menu[]>
```

#### 1.7 Settings Server Actions
**파일:** `app/actions/settings.ts`

```typescript
// 필요한 액션들:
- getSettings(category?: string): Promise<Setting[]>
- updateSetting(key: string, value: any): Promise<Setting>
- updateSiteConfig(config: SiteConfig): Promise<void>
- getSiteConfig(): Promise<SiteConfig>
```

### 의존성
- Phase 2.1 완료 (데이터베이스 스키마)
- Phase 2.2 완료 (인증)

### 완료 기준
- 모든 Server Actions가 TypeScript 타입과 함께 정의됨
- 각 액션에 대한 오류 처리 구현됨
- RLS 정책 준수 검증됨

---

## 2단계: 댓글 시스템 구현 (P0)

### 목적
중첩 댓글, 실시간 업데이트, 관리 기능을 포함한 완전한 댓글 시스템

### 작업 항목

#### 2.1 댓글 컴포넌트
**파일:**
- `components/comment/CommentList.tsx` - 댓글 목록 (중첩 지원)
- `components/comment/CommentItem.tsx` - 개별 댓글 (대댓글 포함)
- `components/comment/CommentForm.tsx` - 댓글 작성 폼
- `components/comment/CommentEditor.tsx` - 댓글 수정 에디터

#### 2.2 댓글 기능
- 중첩 댓글 표시 (depth 표시, 들여쓰기)
- 대댓글 작성
- 댓글 수정/삭제 (작성자 또는 관리자)
- 댓글 신고 기능
- 댓글 추천/비추천
- 댓글 페이지네이션 또는 무한 스크롤
- 비밀 댓글 지원

#### 2.3 실시간 업데이트 (선택)
- Supabase Realtime 구독
- 새 댓글 실시간 표시
- 댓글 수 실시간 업데이트

**파일:** `hooks/useRealtimeComments.ts`

### 의존성
- 1단계 완료 (Comment Server Actions)

### 완료 기준
- 댓글 작성, 수정, 삭제 기능 작동
- 중첩 댓글 정확히 표시됨
- 관리자 댓글 삭제/숨김 기능 작동

---

## 3단계: 문서 모듈 구현 (P1)

### 목적
페이지/위키 형식의 문서 관리 시스템

### 작업 항목

#### 3.1 문서 페이지
**파일:**
- `app/(main)/documents/page.tsx` - 문서 목록
- `app/(main)/documents/[id]/page.tsx` - 문서 상세
- `app/(main)/documents/new/page.tsx` - 문서 생성
- `app/(main)/documents/[id]/edit/page.tsx` - 문서 수정

#### 3.2 문서 컴포넌트
**파일:**
- `components/document/DocumentList.tsx` - 문서 목록
- `components/document/DocumentDetail.tsx` - 문서 상세
- `components/document/DocumentEditor.tsx` - 문서 에디터
- `components/document/VersionHistory.tsx` - 버전 히스토리
- `components/document/VersionViewer.tsx` - 버전 비교

#### 3.3 문서 기능
- 마크다운 에디터
- 초안/게시 상태 관리
- 버전 히스토리 표시
- 버전 간 비교
- 버전 복원
- 문서 검색
- 태그 및 분류

### 의존성
- 1단계 완료 (Document Server Actions)
- Phase 2.1 완료 (documents, document_versions 테이블)

### 완료 기준
- 문서 CRUD 작동
- 버전 히스토리 추적됨
- 버전 복원 기능 작동

---

## 4단계: 메뉴 관리 구현 (P1)

### 목적
관리자가 사이트 네비게이션 메뉴를 관리할 수 있는 기능

### 작업 항목

#### 4.1 메뉴 관리 컴포넌트
**파일:**
- `components/menu/MenuEditor.tsx` - 메뉴 에디터
- `components/menu/MenuItemEditor.tsx` - 메뉴 항목 에디터
- `components/menu/MenuTree.tsx` - 메뉴 트리 (드래그앤드롭)

#### 4.2 메뉴 기능
- 메뉴 생성/수정/삭제
- 메뉴 항목 추가/편집/삭제
- 드래그앤드롭 순서 변경
- 계층 구조 관리 (부모-자식)
- 메뉴 항목 유형 (링크, 구분선, 헤더, 액션)
- 권한별 표시 (all, member, admin)
- 활성/비활성 상태
- 아이콘, 배지 설정

#### 4.3 프론트엔드 메뉴 표시
**파일:** `components/layout/Navigation.tsx` (업데이트)

- 데이터베이스에서 메뉴 로드
- 활성 메뉴 하이라이트
- 모바일 메뉴 지원

### 의존성
- 1단계 완료 (Menu Server Actions)
- Phase 2.1 완료 (menus, menu_items 테이블)

### 완료 기준
- 관리자가 메뉴 생성/수정 가능
- 메뉴 항목 드래그앤드롭 정렬 작동
- 프론트엔드에 메뉴 정확히 표시됨

---

## 5단계: 관리자 기능 강화 (P1)

### 목적
관리자 패널의 기능을 완성하고 설정 저장을 가능하게 함

### 작업 항목

#### 5.1 설정 저장 기능
- [admin/settings/page.tsx](app/(admin)/admin/settings/page.tsx)에 Server Action 연결
- 설정 변경 후 저장 버튼 작동
- 폼 검증 추가

#### 5.2 대시보드 개선
**파일:** [app/(admin)/admin/page.tsx](app/(admin)/admin/page.tsx)

- 통계 카드 (게시글 수, 회원 수, 댓글 수)
- 최근 활동 목록
- 차트/그래프 (선택)

#### 5.3 게시판 관리 기능
- 게시판 생성/편집/삭제
- 게시판 순서 변경
- 게시판 설정 (config JSON)

#### 5.4 회원 관리 기능
- 회원 정보 수정
- 역할 변경
- 회원 일시 정지/탈퇴

### 의존성
- 1단계 완료 (Settings, Board, Member Server Actions)

### 완료 기준
- 모든 설정이 저장됨
- 대시보드에 실제 데이터 표시됨
- 관리자가 게시판/회원 관리 가능

---

## 6단계: 파일 업로드 구현 (P2)

### 목적
Supabase Storage를 통한 파일 업로드 기능

### 작업 항목

#### 6.1 Storage 설정
- Supabase Storage 버킷 생성 (avatars, attachments)
- 업로드 정책 설정

#### 6.2 파일 업로드 Server Action
**파일:** `app/actions/file.ts`

```typescript
- uploadFile(file: File, bucket: string): Promise<string>
- deleteFile(path: string): Promise<void>
- getFiles(targetType: string, targetId: string): Promise<File[]>
```

#### 6.3 파일 업로드 컴포넌트
**파일:** `components/file/FileUpload.tsx`

- 드래그앤드롭 지원
- 진행률 표시
- 이미지 미리보기
- 여러 파일 업로드
- 파일 크기/형식 검증

#### 6.4 프로필 아바타 업로드
**파일:** `components/member/AvatarUpload.tsx` (기존 파일 업데이트)

- Server Action 연결
- 이미지 크롭/리사이즈

### 의존성
- Phase 1.2 완료 (Supabase 설정)

### 완료 기준
- 파일이 Storage에 업로드됨
- 업로드된 파일이 게시글/댓글에 첨부됨
- 아바타 업로드 작동

---

## 7단계: 검색 기능 구현 (P2)

### 목적
전체 텍스트 검색 기능

### 작업 항목

#### 7.1 검색 페이지
**파일:** `app/(main)/search/page.tsx`

- 검색 결과 표시
- 검색 필터 (타입, 날짜, 작성자)
- 검색 결과 페이지네이션
- 검색 결과 하이라이트

#### 7.2 검색 Server Action
**파일:** `app/actions/search.ts`

```typescript
- search(query: string, filters?: SearchFilters): Promise<SearchResults>
```

#### 7.3 검색 컴포넌트
**파일:**
- `components/search/SearchBar.tsx` - 검색 입력
- `components/search/SearchResults.tsx` - 검색 결과
- `components/search/SearchFilters.tsx` - 검색 필터
- `components/search/SearchSuggestion.tsx` - 자동완성 (선택)

### 의존성
- Phase 2.1 완료 (전체 텍스트 검색 인덱스)
- Phase 3 모듈 완료

### 완료 기준
- 검색어로 게시글/문서 검색 가능
- 검색 결과 정확히 표시됨
- 필터링 작동

---

## 8단계: i18n 다국어 지원 (P3)

### 목적
다국어 지원 시스템

### 작업 항목

#### 8.1 i18n 설정
**파일:** `lib/i18n.ts`

```typescript
- getTranslations(lang: string, namespace: string): Promise<Translations>
- setLanguage(lang: string): void
- getCurrentLanguage(): string
```

#### 8.2 언어 감지 미들웨어
- Accept-Language 헤더 감지
- URL 경로 기반 언어 (/ko, /en)
- 사용자 언어偏好 저장

#### 8.3 언어 전환 컴포넌트
**파일:** `components/i18n/LanguageSwitcher.tsx`

#### 8.4 번역 관리 페이지 (관리자)
**파일:** `app/(admin)/admin/translations/page.tsx`

- 번역 키 관리
- 번역 추가/편집
- 번역 내보내기/가져오기

### 의존성
- Phase 2.1 완료 (translations 테이블)

### 완료 기준
- 한국어/영어 전환 가능
- 모든 텍스트가 번역됨
- 누락 번역에 대한 폴백

---

## 9단계: 배포 및 마이그레이션 (P3)

### 목적
프로덕션 배포 및 기존 데이터 마이그레이션

### 작업 항목

#### 9.1 Vercel 배포
- 환경 변수 설정
- 빌드 설정 확인
- 도메인 연결
- SSL 설정

#### 9.2 데이터 마이그레이션 스크립트
- Rhymix MySQL → Supabase PostgreSQL 변환
- 사용자 데이터 마이그레이션
- 게시글/댓글 마이그레이션
- 첨부파일 마이그레이션

#### 9.3 CI/CD 파이프라인
- GitHub Actions 워크플로우
- 자동 테스트
- 자동 배포

---

## 🔄 다음 단계 (현재 80% 완료)

### 남은 작업 (P0 - 높은 우선순위)

#### 1. Supabase 데이터베이스 테이블 생성
```sql
-- 그룹 테이블
CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 권한 테이블
CREATE TABLE public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 그룹-권한 연결 테이블
CREATE TABLE public.group_permissions (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, permission_id)
);

-- 모듈 테이블
CREATE TABLE public.site_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  version TEXT,
  is_active BOOLEAN DEFAULT true,
  is_core BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  installed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 페이지 테이블
CREATE TABLE public.pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES public.profiles(id),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Server Actions 연결
- `app/actions/group.ts` - 그룹 CRUD
- `app/actions/permission.ts` - 권한 관리
- `app/actions/module.ts` - 모듈 활성화/비활성화
- `app/actions/page.ts` - 페이지 CRUD

#### 3. 실시간 데이터 연결
- Analytics 페이지에 실제 통계 데이터 연결
- 차트 라이브러리 통합 (Recharts 또는 Chart.js)

### P1 - 중간 우선순위
- Supabase Realtime 알림 구현
- 파일 업로드 완성
- 검색 결과 하이라이트

### P2 - 낮은 우선순위
- 번역 관리 UI
- 익명 게시 (캡차 포함)
- 데이터 마이그레이션 스크립트
- CI/CD 파이프라인

---

## 🔄 병렬 실행 가능한 작업

다음 작업들은 독립적으로 병렬 실행 가능합니다:

### 그룹 A: Server Actions (1단계)
- board.ts, post.ts, comment.ts, member.ts, document.ts, menu.ts, settings.ts
- 예상 시간: 2-3시간
- 담당: expert-backend

### 그룹 B: 댓글 시스템 (2단계)
- CommentList, CommentItem, CommentForm
- 예상 시간: 2-3시간
- 담당: expert-frontend
- 전제: 그룹 A 완료

### 그룹 C: 문서 모듈 (3단계)
- 문서 페이지 + 컴포넌트
- 예상 시간: 2-3시간
- 담당: expert-frontend
- 전제: 그룹 A 완료

### 그룹 D: 메뉴 관리 (4단계)
- 메뉴 에디터 + 기능
- 예상 시간: 1-2시간
- 담당: expert-frontend
- 전제: 그룹 A 완료

### 그룹 E: 관리자 기능 (5단계)
- 설정 저장, 대시보드, 게시판/회원 관리
- 예상 시간: 2-3시간
- 담당: expert-frontend
- 전제: 그룹 A 완료

### 그룹 F: 파일 업로드 (6단계)
- Storage 설정, 업로드 액션, 컴포넌트
- 예상 시간: 1-2시간
- 담당: expert-backend + expert-frontend

### 그룹 G: 검색 기능 (7단계)
- 검색 페이지, 액션, 컴포넌트
- 예상 시간: 1-2시간
- 담당: expert-frontend
- 전제: 그룹 A 완료

---

## 📅 권장 실행 순서

1. **1단계: Server Actions** (모든 기능의 기초)
2. **2단계: 댓글 시스템** (사용자 경험 핵심)
3. **3단계: 문서 모듈** (콘텐츠 관리)
4. **5단계: 관리자 기능** (사이트 운영)
5. **4단계: 메뉴 관리** (네비게이션)
6. **6단계: 파일 업로드** (첨부파일)
7. **7단계: 검색 기능** (콘텐츠 발견)
8. **8단계: i18n** (다국어)
9. **9단계: 배포** (프로덕션)

---

## ✅ 성공 기준

1. 모든 SPEC-RHYMIX-001 요구사항 구현됨
2. TRUST 5 품질 게이트 통과
   - Tested: 85%+ 코드 커버리지
   - Readable: 명확한 네이밍, 영어 주석
   - Unified: 일관된 스타일
   - Secured: OWASP 준수
   - Trackable: 컨벤셔널 커밋
3. 모든 E2E 테스트 통과
4. 빌드 성공 및 배포 가능

---

**버전:** 1.1.0
**마지막 수정:** 2026-02-21
**진행률:** 80% (53/66 요구사항 완료)
