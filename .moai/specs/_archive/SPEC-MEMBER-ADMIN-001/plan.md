---
id: SPEC-MEMBER-ADMIN-001
version: "0.1.0"
status: completed
created: 2026-07-18
updated: 2026-07-19
---

# SPEC-MEMBER-ADMIN-001 — 구현 계획 (Plan)

## 핵심 설계 결정 (검토 우선순위 — 변경 가능성 높은 순)

이 절은 사람 리뷰가 가장 먼저 봐야 할, 바뀔 가능성이 큰 결정들을 앞세운다. 기계적인 배선 작업은
아래 "슬라이스 분할"로 미룬다.

1. **(사용자 재확인 필요) 비밀번호 암호화 축소 결정** — 레거시의 "알고리즘 선택(bcrypt 등)" 드롭다운을
   제외하고 "Argon2id 고정 표시 + timeCost 조정 + 자동 업그레이드 토글"로 축소했다(spec.md §5, §7-1).
   근거: `packages/auth/src/password-config.ts`가 Argon2id 단일 알고리즘을 `@MX:ANCHOR`로 명시한
   아키텍처 결정이며, 실제 대체 해시 구현 없이 선택 UI만 만들면 "완료 마킹의 함정"(장식용 컨트롤)을
   재현한다. **이 결정이 바뀌면 Group D의 REQ-MADM-026 범위가 크게 달라지므로 run 착수 전 재확인.**

2. **`ManagedEmailHost` 신규 모델 설계** (REQ-MADM-028) — `DeniedIdentifier`의 citext/`createdBy`/
   `createdAt` 형태를 재사용한다. 사이트별 선택적 스코프 필드(`siteId Int?`)는 `DeniedIdentifier`가
   아니라 `MemberGroup.siteId`의 기존 선례를 따른다 — 실제 코드베이스 확인 결과
   `DeniedIdentifier`(`packages/db/prisma/schema.prisma:532-542`)에는 `siteId` 필드가 없다(전역 단일
   스코프 모델이기 때문; 필드는 `id`/`kind`/`pattern`(citext)/`reason`/`createdBy`/`createdAt`이고
   unique는 `[kind, pattern]`뿐이다). "허용/차단" 두 정책 축을 갖는 근본적으로 다른 개념이므로
   `DeniedIdentifier.kind` enum에 `EMAIL_HOST_ALLOW`/`EMAIL_HOST_DENY`를 추가하는 대신 **별도 모델**로
   분리했다. 대안(기존 모델 확장)과 비교해 이 SPEC이 채택한 형태:

   ```prisma
   enum ManagedEmailHostPolicy {
     ALLOW
     DENY
   }

   model ManagedEmailHost {
     id        Int                    @id @default(autoincrement())
     siteId    Int?
     host      String                 @db.Citext
     policy    ManagedEmailHostPolicy
     reason    String?
     createdBy String?
     createdAt DateTime               @default(now()) @db.Timestamptz

     @@unique([siteId, host, policy])
     @@map("managed_email_hosts")
   }
   ```

   이메일 호스트 등록/삭제 API는 `admin.user.emailHost.add`/`admin.user.emailHost.remove` 프로시저로
   구현한다(`deniedList.add`/`deniedList.remove`와 동일한 요청/응답 형태를 따른다). spec.md
   REQ-MADM-030/031은 동작/결과 중심으로만 기술하며, 정확한 프로시저 이름은 이 결정 문서를 단일
   진실 원천으로 삼는다(plan-auditor iteration 2 재감사 D2 대응).

   충돌 정책(동일 호스트에 ALLOW+DENY 동시 등록)은 미해결 질문 §7-4로 남김 — run phase 확정.

3. **`admin.group.reorder` 트랜잭션 설계** (REQ-MADM-011) — `apps/web/server/api/routers/admin/menu-item.ts`의
   `reorder` 프로시저(단일 `$transaction`으로 여러 항목의 `listOrder`를 원자적 갱신)를 그대로 패턴
   재사용한다. `MemberGroup`은 트리 구조가 아니므로 `parentId` 갱신은 불필요 — `listOrder`만 갱신하는
   더 단순한 형태. spec.md REQ-MADM-011은 동작 중심으로만 기술하며, 정확한 프로시저 이름
   (`admin.group.reorder`)은 이 결정을 단일 진실 원천으로 삼는다(plan-auditor iteration 2 재감사 D2 대응).

4. **REQ-MADM-016 가입 허가 3값 모드 저장 방식** — 기존 `member.signup.enabled`(boolean) 키를 그대로
   열거형으로 승격할지, 신규 키를 병행할지 미확정(§7-2). run phase에서 `admin.settings.ts`의
   `getSiteSetting`/`setSiteSetting` 트랜잭션 헬퍼를 그대로 사용해 결정.

5. **기존 설정 키 재사용 vs 중복 금지 원칙** — `member.signup.requireEmailVerification`,
   `member.signup.allowDuplicateNickname`은 "기본 설정" 탭에서 **동일한 키를 읽고 쓴다**(신규 키 생성
   금지). `admin.settings.getSignup`/`updateSignup`이 이미 이 키를 소유하므로, "기본 설정" 탭 전용 신규
   `getDefault`/`updateDefault` 프로시저는 이 두 필드를 **별도 요청으로 위임**하거나 응답에 합성해서
   포함하는 방식 중 run phase에서 선택한다(단, 저장 키는 절대 분기하지 않는다).

## 기술 접근

세 축으로 나뉜다.

1. **UI-only 확장 축 (Slice A/B/C-1 부분)** — 스키마·라우터 변경 없음. 이미 구현된
   `nicknameLog.list`/`deniedList.*`를 사용하는 화면만 추가한다. 리스크 낮음, 마이그레이션 없음.
2. **회원 그룹 재배치 + 이미지 마크 축 (Slice C)** — 스키마는 이미 준비되어 있음(`imageMark`,
   `listOrder`). 신규 `admin.group.reorder` 프로시저 1개 추가 + 폼/목록 필드 노출. 리스크 낮음~중간,
   마이그레이션 없음.
3. **"기본 설정" 탭 축 (Slice D)** — 다수의 신규 `SiteSetting` 키 + 검증 로직(닉네임/비밀번호) 배선.
   마이그레이션 없음이지만 `packages/auth/src/signup.ts`, 닉네임 변경 경로, 로그인 재해싱 로직 등
   여러 기존 파일을 건드린다. 리스크 중간.
4. **이메일 호스트 관리 축 (Slice E)** — 신규 Prisma 모델 + 마이그레이션 + `signup.ts`에 새 검증 분기
   추가. 리스크 최고 — **반드시 독립 슬라이스로 분리**하고 가장 마지막에 실행한다.

## 슬라이스 분할

우선순위 라벨만 사용(시간 추정 금지). 순서는 **마이그레이션 리스크/의존성 오름차순**(낮은 것부터).

### Slice A — 닉네임 변경 기록 조회 UI (P1, 최저 위험)
- 대상 REQ: REQ-MADM-001~003
- 대상 파일(신규): `apps/web/app/admin/members/nickname-log/page.tsx`
- 대상 파일(수정): `apps/web/app/admin/members/settings/page.tsx`(탭 링크 추가, 선택)
- 내용: `admin.user.nicknameLog.list` 그대로 사용하는 읽기 전용 페이지네이션 테이블.
- 마이그레이션: 없음. 신규 백엔드 프로시저: 없음. 리스크: 낮음.

### Slice B — 아이디/닉네임 차단 관리 UI (P1, 최저 위험)
- 대상 REQ: REQ-MADM-004~008
- 대상 파일(신규): `apps/web/app/admin/members/denied-list/page.tsx`, `actions.ts`, `forms.tsx`
- 내용: `deniedList.list`/`add`/`remove` 그대로 사용하는 CRUD 화면. `groups/forms.tsx` 패턴(Server
  Actions + `useActionState`) 재사용.
- 마이그레이션: 없음. 신규 백엔드 프로시저: 없음. 리스크: 낮음.

### Slice C — 회원 그룹 재배치 + 이미지 마크 (P2, 낮음~중간 위험)
- 대상 REQ: REQ-MADM-009~014
- 대상 파일(수정): `apps/web/app/admin/members/groups/{page,forms}.tsx`,
  `apps/web/app/admin/members/groups/[id]/edit/page.tsx`,
  `apps/web/server/api/routers/admin/group.ts`(**이미 존재** — `list`/`create`/`update`/`delete`
  프로시저를 이미 보유하고 있음을 코드 확인 완료; 여기에 신규 `reorder` 프로시저를 추가해 확장한다.
  `menu-item.ts`의 `reorder` 패턴(단일 `$transaction`으로 여러 항목의 `listOrder`를 원자적으로 갱신)과
  동일한 방식을 따른다)
- 대상 파일(신규): 드래그앤드롭 컴포넌트(`MenuItemDnDTree` 참조해 신규 또는 공용화)
- 내용: `imageMark` 입력/표시 추가, `admin.group.reorder` 신규 프로시저(단일 `$transaction`), dnd-kit
  기반 재배치 UI.
- 마이그레이션: 없음(기존 컬럼 재사용). 리스크: 낮음~중간(옵티미스틱 상태 정합 주의, REQ-MADM-012/013).

### Slice D — 회원 설정 "기본 설정" 탭 (P1, 중간 위험)
- 대상 REQ: REQ-MADM-015~027
- 대상 파일(수정): `apps/web/app/admin/members/settings/{page,forms,actions}.tsx`,
  `apps/web/server/api/routers/admin/settings.ts`(`getDefault`/`updateDefault` 추가),
  `packages/auth/src/signup.ts`(닉네임 특수문자·중복·보안수준 검증 분기, 가입키 검증),
  `packages/auth/src/login.ts`(자동 업그레이드 토글 반영), `packages/auth/src/password-config.ts` 또는
  그 소비처(timeCost 오버라이드 경로 — ANCHOR 파일 자체는 상수 유지, 런타임 오버라이드는 호출부에서
  주입하는 형태 권장), 닉네임 변경 경로(관리자 편집 + 있다면 자기 프로필 편집).
- 내용: §4 Group D REQ-MADM-015~027 전체. **REQ-MADM-026(Argon2id timeCost 조정)과 REQ-MADM-027
  (자동 업그레이드 토글)는 보안에 직결되므로 안전 범위 클램프(§7-5)를 코드 레벨에서 강제**하고, 값이
  실제로 신규 해시 생성에 반영되는 것을 acceptance.md 기준으로 재현 검증한다.
- 마이그레이션: 없음(전부 `SiteSetting` JSON 키). 리스크: 중간(다수의 기존 검증 경로를 건드림 — 회귀
  위험, 특히 signup.ts/login.ts).

### Slice E — 이메일 호스트 관리(허용/차단 도메인) (P2, 최고 위험 · 마이그레이션 필수)
- 대상 REQ: REQ-MADM-028~035
- 대상 파일(신규): Prisma 마이그레이션(`ManagedEmailHost` 모델 + `ManagedEmailHostPolicy` enum),
  `apps/web/app/admin/members/email-hosts/{page,actions,forms}.tsx`,
  `apps/web/server/api/routers/admin/user.ts`에 `emailHost` 서브라우터 추가(`deniedList` 옆에 위치,
  `add`/`remove` 프로시저명은 §핵심 설계 결정 2를 따른다)
- 대상 파일(수정): `packages/auth/src/signup.ts`(이메일 도메인 화이트리스트/블랙리스트 검증 분기 추가 —
  기존 `DeniedIdentifier` 검증 바로 옆에 위치시켜 일관성 유지)
- 내용: §4 Group E REQ-MADM-028~035 전체. 신규 스키마이므로 **반드시 독립 슬라이스로 격리**하고, 마지막
  순서로 실행해 다른 슬라이스의 신규 검증 로직과 뒤섞이지 않게 한다.
- 마이그레이션: **있음(신규)**. 리스크: 최고. **run phase 진입 전 §7-4(ALLOW/DENY 충돌 정책) 확정
  필수.**

## 슬라이스 의존 그래프

```
Slice A (P1, 닉네임 로그 UI)         ← 독립
Slice B (P1, 차단 관리 UI)           ← 독립
Slice C (P2, 그룹 재배치+이미지마크)  ← 독립 (스키마 이미 존재)
Slice D (P1, 기본 설정 탭)           ← signup.ts/login.ts 공유 파일이라 Slice E와 순서 조정 필요
Slice E (P2, 이메일 호스트)          ← 신규 마이그레이션, Slice D 이후 실행 권장(같은 signup.ts 파일
                                        충돌 최소화 + 검증 분기 배치 패턴을 Slice D에서 먼저 확립)
```

## 마일스톤 (우선순위 순)

1. **M1 (P1)**: Slice A — 닉네임 변경 기록 조회 화면이 실제 데이터를 페이지네이션과 함께 보여준다.
2. **M2 (P1)**: Slice B — 차단 등록/삭제가 새로고침 후에도 유지된다.
3. **M3 (P2)**: Slice C — 그룹 드래그앤드롭 순서 변경이 영속되고, imageMark가 저장·표시된다.
4. **M4 (P1)**: Slice D — "기본 설정" 탭의 모든 필드가 저장되고, 닉네임/비밀번호 관련 값이 실제 검증
   로직에 반영된다(§3 재발 방지 원칙 적용 — 저장만 되고 동작에 영향 없는 필드가 없어야 한다).
5. **M5 (P2)**: Slice E — 이메일 호스트 허용/차단이 실제 회원가입 시도를 거부/허용한다.

## 리스크

| 리스크 | 슬라이스 | 완화 |
|---|---|---|
| 비밀번호 관련 설정이 "저장만 되고 동작에 반영 안 되는" 장식용 컨트롤이 됨 | D | acceptance.md의 모든
  비밀번호 관련 AC를 실제 해시/검증 결과 재현으로 검증(§3), 축소 결정(§핵심 설계 결정 1) 사용자 재확인 |
| Argon2id timeCost를 과도하게 낮게 설정해 보안 약화 | D | 코드 레벨 클램프(안전 범위, §7-5) 강제 +
  UI에서도 범위 제한 |
| `ManagedEmailHost` ALLOW/DENY 충돌로 예기치 않은 가입 거부 | E | §7-4 정책(ALLOW 우선) 확정 +
  edge case 테스트로 고정 |
| 닉네임 특수문자/중복 검증 로직이 가입·관리자 편집·자기 프로필 편집 중 일부 경로만 반영 | D | 세 경로
  모두를 acceptance.md에서 개별 재현 |
| Slice D/E가 같은 `signup.ts` 파일을 수정해 병합 충돌 | D→E | 순서를 D 완료 후 E로 고정(슬라이스
  의존 그래프), 병렬 실행 금지 |
| 그룹 재배치 옵티미스틱 상태와 서버 상태 불일치 | C | 성공 후 재검증(revalidate) 강제, 실패 시 롤백
  (REQ-MADM-013) |
| "완료" 마킹 재현(UI만 존재, 실제 동작 미검증) | 전체 | acceptance를 런타임 영속·실 검증 로직 반영
  기준으로 강제(§3) |

## MX 태그 대상

- `admin.group.reorder`(fan_in 증가 예상) → `@MX:ANCHOR` — `admin.menuItem.reorder`와 동일한 이유
- 이메일 호스트 검증 분기(`signup.ts` 내) → `@MX:WARN` + `@MX:REASON`(보안에 직결되는 가입 차단 로직)
- Argon2id timeCost 런타임 오버라이드 지점 → `@MX:WARN` + `@MX:REASON`(기존 `@MX:ANCHOR` 단일 진실
  원천 원칙과의 상호작용 — 상수는 유지하되 호출부 오버라이드가 있음을 명시)
- 자동 업그레이드 토글이 꺼진 로그인 경로 → `@MX:NOTE`(REQ-AUTH-014 동작이 조건부로 비활성화됨을 명시)
