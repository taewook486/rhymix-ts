# Rhymix ASIS/TOBE 비교 분석

## 개요

Rhymix PHP CMS를 Next.js/React/Supabase 스택으로 변환하면서 설치 화면이 어떻게 변경되었는지 비교 분석합니다.

---

## ASIS - 원본 Rhymix (PHP) 설치 화면

### 설치 플로우

```
1. 사용권 동의 (License Agreement)
2. 설치 환경 확인 (Environment Check)
3. DB 정보 입력 (Database Configuration)
4. 관리자 계정 생성 (Admin Account Creation)
5. 설치 완료
```

---

### 화면 1: 사용권 동의 (License Agreement)

**파일**: `modules/install/tpl/license_agreement.html`

**구성요소**:
- 제목: "사용권 동의"
- GPL v2 라이선스 텍스트 표시
- 체크박스: "동의합니다"
- 버튼: "다음 »"

**HTML 구조**:
```html
<h2>사용권 동의</h2>
<div class="content-license">
  <!-- GPL v2 라이선스 전문 -->
</div>
<label>
  <input type="checkbox" name="license_agreement" value="Y" />
  <strong>동의합니다</strong>
</label>
<button>다음 »</button>
```

---

### 화면 2: 설치 환경 확인 (Environment Check)

**파일**: `modules/install/tpl/check_env.html`

**구성요소**:
- 제목: "설치할 수 있습니다" 또는 "설치할 수 없습니다"
- 체크리스트 항목:
  - PHP 버전
  - DB 지원 (pdo_mysql)
  - files 폴더 퍼미션
  - 세션 지원 (session.auto_start = off)
  - curl
  - GD (이미지 라이브러리)
  - iconv / mbstring
  - json
  - mcrypt / openssl
  - xml / simplexml
  - mod_rewrite (Apache)

**HTML 구조**:
```html
<h2>설치할 수 있습니다</h2>
<table id="check_env">
  <tr>
    <td>PHP 버전</td>
    <td><span class="ok">OK</span></td>
  </tr>
  <tr>
    <td>DB 지원</td>
    <td><span class="ok">OK</span></td>
  </tr>
  <!-- ... more checklist items ... -->
</table>
<a href="...">이전 «</a>
<a href="...">다음 »</a>
```

**검사 항목별 설명**:
- **PHP 버전**: 최소 버전 확인 (예: 8.1+)
- **DB 지원**: pdo_mysql 확장 모듈 확인
- **퍼미션**: files 폴더 쓰기 권한 (777)
- **세션**: session.auto_start = off 확인
- **curl**: URL 요청 라이브러리
- **GD**: 이미지 처리 라이브러리
- **iconv/mbstring**: 문자열 인코딩
- **json**: JSON 처리
- **mcrypt/openssl**: 암호화
- **xml/simplexml**: XML 처리
- **mod_rewrite**: 짧은 주소 사용 (Apache)

---

### 화면 3: DB 정보 입력 (Database Configuration)

**파일**: `modules/install/tpl/db_config.html`

**구성요소**:
- 제목: "DB 정보 입력"
- 입력 필드:
  - DB 서버 주소 (기본값: localhost)
  - DB 서버 포트 (기본값: 3306)
  - DB 아이디
  - DB 비밀번호
  - DB 이름
  - 테이블 접두사 (기본값: rx_)

**HTML 구조**:
```html
<h2>DB 정보 입력</h2>
<form>
  <label>DB 서버 주소</label>
  <input name="db_host" value="localhost" required />

  <label>DB 서버 포트</label>
  <input name="db_port" value="3306" required />

  <label>DB 아이디</label>
  <input name="db_user" required />

  <label>DB 비밀번호</label>
  <input name="db_pass" type="password" required />

  <label>DB 이름</label>
  <input name="db_database" required />

  <label>테이블 접두사</label>
  <input name="db_prefix" value="rx_" />

  <p>DB 아이디, 비밀번호, 서버 주소, 포트 등의 정보는 호스팅 관리자에게 문의하세요.</p>
  <p>DB 테이블 접두사는 사용자가 선택할 수 있습니다.</p>

  <button>확인 중...</button>
</form>
```

**검증 로직**:
- root 계정 사용 불가 (보안)
- DB 연결 테스트
- InnoDB 지원 확인
- utf8mb4 문자열 지원 확인
- 테이블 이미 존재 확인

---

### 화면 4: 관리자 계정 생성 (Admin Account Creation)

**파일**: `modules/install/tpl/other_config.html`

**구성요소**:
- 제목: "관리자 계정 생성"
- 입력 필드:
  - 이메일 주소
  - 비밀번호
  - 비밀번호 확인
  - 닉네임
  - 사용자 ID
- 추가 설정:
  - 표준 시간대 (자동 감지: Asia/Seoul)
  - SSL 사용 (항상/선택/안함)
  - 사이트 잠금 (IP 대역 제한)

**HTML 구조**:
```html
<h2>관리자 계정 생성</h2>
<form>
  <label>이메일 주소</label>
  <input name="email_address" type="email" required />

  <label>비밀번호</label>
  <input name="password" type="password" required />

  <label>비밀번호 확인</label>
  <input name="password2" type="password" required />

  <label>닉네임</label>
  <input name="nick_name" required />

  <label>사용자 ID</label>
  <input name="user_id" required />

  <label>표준 시간대</label>
  <select name="time_zone">
    <option value="Asia/Seoul">Asia/Seoul</option>
    <!-- ... more timezones ... -->
  </select>

  <label>SSL 사용</label>
  <input type="radio" name="use_ssl" value="always" checked> 사용
  <input type="radio" name="use_ssl" value="none"> 사용 안함

  <label>사이트 잠금</label>
  <input type="radio" name="use_sitelock" value="N" checked> 사용 안함
  <input type="radio" name="use_sitelock" value="Y"> 잠금 상태로 설치

  <p>작성하신 모든 항목은 설치 후 관리 모듈에서 수정할 수 있습니다.</p>

  <button>설치를 진행합니다... »</button>
</form>
```

**설치 프로세스**:
1. DB 커넥션 테스트
2. 테이블 생성 (modules/*/schemas/*.xml)
3. 모듈 설치
4. 설정 파일 생성 (config/config.php)
5. 관리자 계정 생성
6. 암호화 키 생성

---

### 설치 완료 화면

- 메시지: "설치가 완료되었습니다. 감사합니다."
- 홈페이지로 자동 리다이렉트

---

## TOBE - 새로운 Rhymix TS (Next.js) 화면

### 현재 접속 화면

**배포된 URL**: https://rhymix-ts.vercel.app

**구성**:
- 홈 페이지: 랜딩 페이지
- 네비게이션 바
- 인증 링크 (로그인/회원가입)
- 게시판 섹션

---

## 주요 변경사항

| 항목 | ASIS (PHP) | TOBE (Next.js) |
|------|-------------|---------------|
| **설치 방식** | 웹 설치 위저드 | 없음 (Supabase 클라우드) |
| **DB 설정** | 수동 입력 | 미리 구성된 Supabase |
| **관리자 생성** | 설치 시 입력 | 회원가입 후 DB에서 관리자 지정 |
| **환경 체크** | 서버 요구사항 확인 | Vercel/Supabase 무관 |
| **파일 권한** | files 폴더 777 | 필요 없음 |
| **모듈 설치** | 자동 설치 | 미리 설치됨 |
| **설치 시간** | 5-10분 | 즉시 사용 가능 |

---

## ASIS/TOBE 상세 비교

### 1. 초기 접속 화면

**ASIS**:
```
Rhymix 설치
├─ 사용권 동의
├─ 설치 환경 확인
├─ DB 정보 입력
└─ 관리자 계정 생성
```

**TOBE**:
```
Rhymix TS (현재 배포됨)
├─ 홈 (빈 페이지)
├─ 로그인 / 회원가입
└─ 바로 사용 시작
```

### 2. 사용권 동의

**ASIS**:
- 별도 라이선스 동의 페이지
- GPL v2 텍스트 표시
- 체크박스로 동의 후 다음 단계

**TOBE**:
- GitHub 레포지토리 GPL v2
- 배포 시 별도 동의 없음
- [LICENSE](../LICENSE/) 파일 참고

### 3. 설치 환경 확인

**ASIS**:
```
체크리스트:
☑ PHP 버전 8.1+
☑ DB 지원 (pdo_mysql)
☑ files 폴더 퍼미션 777
☑ session.auto_start = off
☑ curl
☑ GD
☑ iconv/mbstring
☑ json
☑ mcrypt/openssl
☑ xml/simplexml
☑ mod_rewrite
```

**TOBE**:
- Vercel이 모든 인프라 자동 관리
- Node.js 20.x 실행 환경
- Next.js 16 프레임워크
- Supabase PostgreSQL 16
- 별도 환경 체크 불필요

### 4. DB 설정

**ASIS**:
```
DB 정보 입력:
- DB 서버: localhost
- 포트: 3306
- 사용자: (직접 입력)
- 비밀번호: (직접 입력)
- DB명: (직접 입력)
- 테이블 접두사: rx_
```

**TOBE**:
```
Supabase 프로젝트:
- URL: https://your-project.supabase.co
- Anon Key: 자동 생성
- Connection Pooling: 자동
- SSL: 기본 활성화
- Row-Level Security: 자동
```

### 5. 관리자 계정

**ASIS**:
- 설치 마법사에 관리자 정보 입력
- DB에 직접 관리자 레코드 생성
- 이메일, 비밀번호, 닉네임, ID 입력

**TOBE**:
- 회원가입으로 가입
- Supabase Auth로 인증
- DB `is_admin` 컬럼으로 권한 관리
- 별도 설치 관리자 없음

### 6. 모듈 설치

**ASIS**:
```
자동 설치 모듈:
- module
- system
- content
- member
- board
- comment
- file
- page
- ... 기본 모듈들
```

**TOBE**:
```
미리 설치된 페이지:
- / (홈)
- /signin, /signup (인증)
- /board (게시판)
- /member/profile, /member/settings
- /admin (관리자)
```

### 7. 설정 파일

**ASIS**:
```php
// config/config.php
return array(
  'db' => array(
    'master' => array(
      'type' => 'mysql',
      'host' => 'localhost',
      // ...
    )
  ),
  // ...
);
```

**TOBE**:
```ts
// .env.local
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

// lib/supabase/client.ts
// 자동 연결 설정
```

---

## 화면 비교

### ASIS 설치 화면 구성

```
┌─────────────────────────────────┐
│  Rhymix 설치                     │
├─────────────────────────────────┤
│  □ 1. 사용권 동의               │
│  □ 2. 설치 환경 확인             │
│  □ 3. DB 정보 입력               │
│  □ 4. 관리자 계정 생성          │
└─────────────────────────────────┘

[라이선스 텍스트 영역]
[동의 체크박스]
[다음 버튼]
```

### TOBE 초기 화면

```
┌─────────────────────────────────┐
│  Rhymix TS                      │
│                                  │
│  [Navigation Bar]               │
│  Home | Board | Sign In | Sign Up│
├─────────────────────────────────┤
│                                  │
│  Welcome to Rhymix TS           │
│                                  │
│  A modern CMS built with:        │
│  • Next.js 16                    │
│  • React 19                       │
│  • Supabase                      │
│  • Tailwind CSS                   │
│                                  │
│  [Get Started] →                │
└─────────────────────────────────┘
```

---

## 기술 스택 변경

### 백엔드

| 구분 | ASIS | TOBE |
|------|------|------|
| 언어 | PHP 8.1+ | TypeScript 5.9+ |
| 프레임워크 | Rhymix 자체 | Next.js 16 |
| 데이터베이스 | MySQL/MariaDB | Supabase PostgreSQL 16 |
| 인증 | 세션 + 쿠키 | Supabase Auth (JWT) |
| 파일 스토리지 | 로컬 files/ | Supabase Storage |
| 캐시 | files/cache/ | Vercel Edge + Supabase |

### 프론트엔드

| 구분 | ASIS | TOBE |
|------|------|------|
| 템플릿 엔진 | 자체 | Template Condition |
| UI 컴포넌트 | XpressEngine | React 19 + shadcn/ui |
| 상태 관리 | Context | React Hooks + Zustand |
| 라우팅 | Layout Template | Next.js App Router |
| CSS | 별도 CSS | Tailwind CSS |

### 배포

| 구분 | ASIS | TOBE |
|------|------|------|
| 호스팅 | 직접 서버 설정 | Vercel (무료 호스팅) |
| DB | 직접 MySQL/MariaDB | Supabase (관리형 DB) |
| CI/CD | 수동 | GitHub 자동 (연동됨) |
| SSL | 수동 설정 | 자동 HTTPS (Vercel) |

---

## 사용자 경험 비교

### ASIS 설치 경험

1. **다운로드**: Rhymix ZIP 파일 다운로드
2. **업로드**: FTP로 서버에 업로드
3. **접속**: `http://domain.com/` 접속
4. **라이선스**: GPL 동의
5. **환경체크**: 서버 요구사항 확인/수정
6. **DB입력**: 호스팅 제공받은 DB 정보 입력
7. **관리자생성**: 이메일, 비밀번호, ID 입력
8. **설치진행**: 5-10분 동안 테이블 생성
9. **완료**: 홈페이지로 이동

### TOBE 사용 경험

1. **접속**: `https://rhymix-ts.vercel.app` 접속
2. **회원가입**: Sign Up 클릭
3. **이메일입력**: 이메일, 비밀번호 입력
4. **가입완료**: 바로 사용 시작

---

## 향후 계획 (TOBE 개선사항)

### 1. 온보딩 페이지 추가
```typescript
// app/onboarding/page.tsx
- 서비스 소개
- 주요 기능 안내
- 시작하기 버튼
```

### 2. 관리자 권한 부여
```typescript
// Supabase Table Editor 또는
// is_admin 컬럼을 통해 관리자 지정
```

### 3. 데이터 마이그레이션 도구 (선택)
```typescript
// ASIS에서 TOBE로 데이터 이전
- 게시글, 댓글
- 회원 정보
- 첨부 파일
```

---

## 결론

Rhymix TS 변환으로 인해:

### ✅ 개선된 점
- 설치 과정 제거 (바로 사용 시작)
- 서버 관리 불필요 (Vercel/Supabase)
- 환경 설정 간소화 (배포만으로 완료)
- 현대적인 UI/UX (shadcn/ui)
- 자동 HTTPS (Vercel 기본)
- 실시간 기능 가능 (Supabase Realtime)

### ⚠️ 변경된 점
- 설치 위저드 없음
- 직접 서버 접근 불가 (Vercel/Supabase 클라우드)
- DB 직접 수정 불가 (Supabase 대시본/에디터 사용)
- PHP 커스터마이징 불가 (React/TS만 가능)

### 📋 추천 사항
1. **관리자 페이지 강화**: Supabase Dashboard 대신 자체 관리자 UI
2. **데이터 이관**: ASIS→TOBE 마이그레이션 도구 개발
3. **온보딩 추가**: 신규 사용자 가이드
4. **문서화**: 사용자 매뉴얼 배포

---

**작성일**: 2026-02-20
**버전**: 0.1.0
