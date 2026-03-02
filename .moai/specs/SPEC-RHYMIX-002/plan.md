# Implementation Plan - SPEC-RHYMIX-002

## Overview

본 계획은 ASIS Rhymix PHP CMS와 TOBE Next.js 시스템 간의 기능 격차를 해소하기 위한 구현 로드맵입니다. 총 6개 스프린트로 구성되며, 각 스프린트는 1-2주 단위로 진행됩니다.

---

## Sprint Breakdown

### Sprint 1: Member Management Enhancement (Priority: High)

**목표**: 회원 관리 고급 설정 및 폼 구현

#### Tasks

##### 1.1 Database Schema
- [ ] Create `member_settings` table migration
- [ ] Create `member_fields` table for custom fields
- [ ] Update `profiles` table with new columns
- [ ] Create RLS policies for new tables

##### 1.2 Member Settings API
- [ ] Create `/api/admin/member-settings` GET endpoint
- [ ] Create `/api/admin/member-settings` PUT endpoint
- [ ] Implement validation with Zod schema
- [ ] Add audit logging for settings changes

##### 1.3 Member Settings UI
- [ ] Create `/admin/settings/member` page
- [ ] Implement registration settings section
- [ ] Implement nickname settings section
- [ ] Implement password security settings section
- [ ] Implement profile field settings section

##### 1.4 Member Add/Edit Forms
- [ ] Update `/admin/members/new` page with full form
- [ ] Update `/admin/members/[id]/edit` page with full form
- [ ] Add homepage, blog, birthday fields
- [ ] Add mailing/message preference fields
- [ ] Add status management (approved/denied/unverified)
- [ ] Add admin notes and restriction fields

##### 1.5 Member List Enhancement
- [ ] Add advanced filters (status, group, date range)
- [ ] Add bulk actions (status change, group assign)
- [ ] Add export functionality

#### Technical Approach

**State Management**: React Hook Form + Zod validation

**UI Components**:
- Card for sections
- Tabs for sub-settings
- Switch for boolean options
- RadioGroup for enum options
- Select for dropdowns

**Database Pattern**:
- Single row in `member_settings` table
- JSONB for flexible field configurations

---

### Sprint 2: Board Configuration Enhancement (Priority: High)

**목표**: 게시판 고급 설정 및 권한 관리 구현

#### Tasks

##### 2.1 Database Schema
- [ ] Create migration for board settings columns
- [ ] Create `board_permissions` table
- [ ] Create `board_categories` table (if not exists)
- [ ] Create RLS policies

##### 2.2 Board Settings API
- [ ] Extend `/api/admin/boards/[id]` with new fields
- [ ] Create `/api/admin/boards/[id]/permissions` endpoints
- [ ] Create `/api/admin/boards/[id]/categories` endpoints

##### 2.3 Board Settings UI
- [ ] Add "Content Settings" tab to board config
- [ ] Add "Comment Settings" tab
- [ ] Add "Editor Settings" tab
- [ ] Add "RSS Settings" tab
- [ ] Add "Permissions" tab with group matrix

##### 2.4 Permission System
- [ ] Create PermissionMatrix component
- [ ] Implement group-based permission checks
- [ ] Create permission helper functions
- [ ] Add permission middleware for board actions

##### 2.5 History & Voting
- [ ] Create `document_history` table
- [ ] Implement document version tracking
- [ ] Create `votes` table
- [ ] Implement vote API endpoints
- [ ] Add vote UI components

#### Technical Approach

**Permission Matrix**:
```typescript
interface BoardPermission {
  board_id: string;
  group_id: string;
  permission: 'list' | 'view' | 'write_document' | 'write_comment' | 'manager';
  granted: boolean;
}
```

**UI Pattern**: Tab-based settings with form sections

---

### Sprint 3: Points System Enhancement (Priority: Medium)

**목표**: 포인트 시스템 고급 기능 구현

#### Tasks

##### 3.1 Database Schema
- [ ] Create `point_rules` table migration
- [ ] Create `point_logs` table
- [ ] Create `member_levels` table
- [ ] Create `level_groups` table
- [ ] Update `profiles` with point/level columns

##### 3.2 Point Rules API
- [ ] Create `/api/admin/point-rules` CRUD endpoints
- [ ] Create `/api/admin/point-settings` endpoints
- [ ] Create `/api/points/award` endpoint
- [ ] Create `/api/points/deduct` endpoint

##### 3.3 Point Settings UI
- [ ] Create `/admin/points/rules` page
- [ ] Create rule editor with 30+ rule types
- [ ] Add level-group mapping interface
- [ ] Add point restriction settings

##### 3.4 Point Service
- [ ] Create PointService class
- [ ] Implement point calculation logic
- [ ] Implement level calculation
- [ ] Implement group promotion/demotion
- [ ] Add point triggers for actions

##### 3.5 Member Point Display
- [ ] Add point display to member profile
- [ ] Add level icon display
- [ ] Create point history page for members
- [ ] Add point leaderboard

#### Technical Approach

**Point Trigger Pattern**:
```typescript
// After successful action
await PointService.award(userId, 'insert_document', { documentId });
```

**Level Calculation**:
```typescript
// Points required for level N = N^2 * 100
const calculateLevel = (points: number) => Math.floor(Math.sqrt(points / 100));
```

---

### Sprint 4: Security Enhancement (Priority: High)

**목표**: 보안 설정 및 접근 제어 구현

#### Tasks

##### 4.1 Database Schema
- [ ] Create `security_settings` table
- [ ] Create `admin_ip_whitelist` table
- [ ] Create `admin_ip_blacklist` table
- [ ] Create `security_logs` table

##### 4.2 Security Settings API
- [ ] Create `/api/admin/security-settings` endpoints
- [ ] Create `/api/admin/ip-whitelist` CRUD
- [ ] Create `/api/admin/ip-blacklist` CRUD

##### 4.3 Security Settings UI
- [ ] Create `/admin/settings/security` page
- [ ] Add media filter settings section
- [ ] Add admin access control section
- [ ] Add session security section
- [ ] Add cookie security section

##### 4.4 Middleware Implementation
- [ ] Create IP check middleware
- [ ] Create session security middleware
- [ ] Add security headers middleware
- [ ] Implement CSRF protection enhancement

##### 4.5 Security Headers
- [ ] Configure X-Frame-Options
- [ ] Configure X-Content-Type-Options
- [ ] Configure Content-Security-Policy
- [ ] Configure Strict-Transport-Security

#### Technical Approach

**Middleware Pattern**:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // IP check
  if (!isAllowedIP(request.ip)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
}
```

---

### Sprint 5: Notification System Enhancement (Priority: Medium)

**목표**: 통합 알림 시스템 구현

#### Tasks

##### 5.1 Database Schema
- [ ] Create `notification_settings` table
- [ ] Create `notification_templates` table
- [ ] Create `notification_queue` table
- [ ] Update `notifications` table with channels

##### 5.2 Notification Settings API
- [ ] Create `/api/admin/notification-settings` endpoints
- [ ] Create `/api/admin/notification-templates` CRUD
- [ ] Create `/api/notifications/preferences` for users

##### 5.3 Notification Settings UI
- [ ] Enhance `/admin/notification-center` page
- [ ] Add type-channel matrix (8 types x 4 channels)
- [ ] Add display settings section
- [ ] Add template editor

##### 5.4 Notification Service
- [ ] Create NotificationService class
- [ ] Implement web notifications (existing)
- [ ] Implement email notifications
- [ ] Implement push notifications
- [ ] Create notification queue processor

##### 5.5 User Notification Preferences
- [ ] Create `/member/settings/notifications` page
- [ ] Allow per-type opt-in/out
- [ ] Add quiet hours settings

#### Technical Approach

**Notification Channel Interface**:
```typescript
interface NotificationChannel {
  send(userId: string, notification: Notification): Promise<void>;
}

class WebChannel implements NotificationChannel { }
class EmailChannel implements NotificationChannel { }
class PushChannel implements NotificationChannel { }
class SMSChannel implements NotificationChannel { }
```

---

### Sprint 6: Communication Features (Priority: Low)

**목표**: 메일/SMS/푸시 발송 관리

#### Tasks

##### 6.1 Database Schema
- [ ] Create `mailer_settings` table
- [ ] Create `mail_logs` table
- [ ] Create `sms_logs` table
- [ ] Create `push_logs` table

##### 6.2 Mailer Settings API
- [ ] Create `/api/admin/mailer-settings` endpoints
- [ ] Create `/api/admin/mail-test` endpoint
- [ ] Create `/api/admin/sms-test` endpoint

##### 6.3 Mailer Settings UI
- [ ] Create `/admin/settings/mailer` page
- [ ] Add SMTP/API configuration
- [ ] Add sender information settings
- [ ] Add logging settings

##### 6.4 Log Viewing
- [ ] Create `/admin/logs/mail` page
- [ ] Create `/admin/logs/sms` page
- [ ] Create `/admin/logs/push` page
- [ ] Add filtering and search

##### 6.5 Integration
- [ ] Integrate with notification system
- [ ] Add bulk mail functionality
- [ ] Add mail templates

#### Technical Approach

**Email Provider Options**:
- SMTP (default)
- SendGrid API
- AWS SES
- Mailgun

**SMS Provider Options**:
- Twilio
- AWS SNS
- Local SMS gateway

---

## Architecture Decisions

### Settings Storage Pattern

모든 설정은 별도의 테이블에 저장하며, JSONB를 활용하여 유연성을 확보합니다.

```
settings/
├── member_settings (단일 행)
├── security_settings (단일 행)
├── notification_settings (단일 행)
├── point_rules (다중 행)
└── board_permissions (다중 행, board_id 기준)
```

### API Design Pattern

```typescript
// GET /api/admin/settings/[type]
// PUT /api/admin/settings/[type]

// 예: /api/admin/settings/member
// 예: /api/admin/settings/security
```

### UI Component Pattern

```typescript
// 공통 설정 폼 컴포넌트
<SettingsForm type="member">
  <SettingsSection title="회원가입 설정">
    <SwitchField name="enable_join" />
    <RadioGroupField name="password_strength" />
  </SettingsSection>
</SettingsForm>
```

---

## Dependencies

### Sprint Dependencies

```
Sprint 1 (Member) ──┐
                    ├──> Sprint 3 (Points)
Sprint 2 (Board) ───┘

Sprint 4 (Security) ──> Sprint 5 (Notifications) ──> Sprint 6 (Communication)
```

### External Dependencies

- **Email**: Resend 또는 SendGrid
- **SMS**: Twilio (optional)
- **Push**: Firebase Cloud Messaging (optional)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 설정 데이터 마이그레이션 복잡성 | High | Medium | 단계적 마이그레이션, 기본값 제공 |
| 권한 시스템 성능 저하 | Medium | High | 캐싱, 인덱스 최적화 |
| 알림 발송 실패 | Medium | Medium | 재시도 큐, 실패 로깅 |
| 보안 설정 호환성 | Low | High | 환경별 테스트, 점진적 적용 |

---

## Success Metrics

### Sprint 1
- 회원 설정 페이지 로드 시간 < 2초
- 설정 저장 응답 시간 < 500ms
- 회원 폼 필수 필드 100% 동작

### Sprint 2
- 게시판 권한 체크 < 50ms
- 설정 저장 응답 시간 < 500ms
- 권한 매트릭스 UI 렌더링 < 1초

### Sprint 3
- 포인트 부여 처리 < 100ms
- 레벨 계산 정확도 100%
- 그룹 자동 승격/강등 정확도 100%

### Sprint 4
- IP 체크 < 10ms
- 보안 헤더 100% 적용
- CSRF 토큰 검증 100%

### Sprint 5
- 알림 발송 큐 처리 < 5초
- 알림 설정 저장 < 500ms
- 웹 알림 실시간 도달률 > 95%

### Sprint 6
- 메일 발송 성공률 > 99%
- 로그 검색 < 2초
- 발송 내역 보관 90일

---

## Next Steps

1. Sprint 1 시작 전 데이터베이스 스키마 리뷰
2. UI 디자인 시안 검토
3. API 스펙 문서 작성
4. 테스트 계획 수립
