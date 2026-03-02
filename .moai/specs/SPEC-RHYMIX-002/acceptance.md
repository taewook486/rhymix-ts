# Acceptance Criteria - SPEC-RHYMIX-002

## Overview

본 문서는 ASIS vs TOBE Gap Analysis 구현에 대한 인수 테스트 시나리오를 정의합니다. Gherkin (Given-When-Then) 형식을 사용합니다.

---

## Sprint 1: Member Management Enhancement

### AC-001: 회원 가입 설정

```gherkin
Feature: 회원 가입 설정

  Scenario: 관리자가 회원 가입을 URL 키로 제한한다
    Given 관리자가 회원 설정 페이지에 접근한다
    When "회원 가입 허용"을 "URL 키가 일치하는 경우에만 허가"로 설정한다
    And "URL 키"를 "secret2024"로 입력한다
    And 설정을 저장한다
    Then 일반 가입 URL에서 가입이 차단된다
    And "/member/signup?key=secret2024" URL에서만 가입이 가능하다

  Scenario: 관리자가 이메일 인증 만료 시간을 설정한다
    Given 관리자가 회원 설정 페이지에 접근한다
    When "인증 메일 만료 시간"을 "24"로 입력한다
    And 단위를 "시"로 선택한다
    And 설정을 저장한다
    Then 이메일 인증 링크는 24시간 후 만료된다
    And 만료된 링크 접근 시 "만료된 링크" 오류가 표시된다
```

### AC-002: 닉네임 설정

```gherkin
Feature: 닉네임 설정

  Scenario: 관리자가 닉네임 특수문자를 제한한다
    Given 관리자가 회원 설정 페이지에 접근한다
    When "닉네임 특수문자"를 "다음의 문자만 허용"으로 설정한다
    And 허용 문자를 "_-"로 입력한다
    And 설정을 저장한다
    Then 닉네임에 밑줄(_)과 하이픈(-)만 사용할 수 있다
    And 다른 특수문자 사용 시 "허용되지 않는 문자" 오류가 표시된다

  Scenario: 관리자가 닉네임 변경 이력을 활성화한다
    Given 관리자가 회원 설정 페이지에 접근한다
    When "닉네임 변경 이력 기록"을 "예"로 설정한다
    And 설정을 저장한다
    Then 회원이 닉네임을 변경할 때마다 이력이 기록된다
    And 관리자는 닉네임 변경 이력을 조회할 수 있다
```

### AC-003: 비밀번호 보안 설정

```gherkin
Feature: 비밀번호 보안 설정

  Scenario: 관리자가 높은 비밀번호 강도를 설정한다
    Given 관리자가 회원 설정 페이지에 접근한다
    When "비밀번호 강도"를 "높음"으로 설정한다
    And 설정을 저장한다
    Then 회원가입 시 비밀번호는 8자 이상이어야 한다
    And 영문, 숫자, 특수문자를 모두 포함해야 한다
    And 조건 불충족 시 "비밀번호 강도가 부족합니다" 오류가 표시된다

  Scenario: 관리자가 비밀번호 해싱 알고리즘을 변경한다
    Given 관리자가 회원 설정 페이지에 접근한다
    When "해싱 알고리즘"을 "argon2id"로 설정한다
    And "워크 팩터"를 "12"로 설정한다
    And "자동 업그레이드"를 "예"로 설정한다
    And 설정을 저장한다
    Then 새 비밀번호는 argon2id로 해싱된다
    And 기존 비밀번호는 로그인 시 자동으로 argon2id로 재해싱된다
```

### AC-004: 회원 추가 폼

```gherkin
Feature: 관리자 회원 추가

  Scenario: 관리자가 새 회원을 추가한다
    Given 관리자가 회원 추가 페이지에 접근한다
    When 다음 정보를 입력한다:
      | 아이디 | newuser |
      | 이메일 | newuser@example.com |
      | 비밀번호 | SecurePass123! |
      | 이름 | 새회원 |
      | 닉네임 | 뉴비 |
      | 홈페이지 | https://newuser.blog.com |
      | 생년월일 | 1990-01-15 |
    And "준회원" 그룹을 선택한다
    And 저장한다
    Then 새 회원이 생성된다
    And 회원은 "준회원" 그룹에 속한다
    And 회원 상태는 "승인"이다

  Scenario: 관리자가 회원 상태를 거부로 설정한다
    Given 관리자가 회원 편집 페이지에 접근한다
    When "회원 상태"를 "거부"로 설정한다
    And "거부 사유"를 "스팸 활동 감지"로 입력한다
    And 저장한다
    Then 회원은 로그인할 수 없다
    And 회원이 로그인 시도 시 거부 사유가 표시된다
```

### AC-005: 회원 목록 고급 필터

```gherkin
Feature: 회원 목록 필터링

  Scenario: 관리자가 상태별로 회원을 필터링한다
    Given 관리자가 회원 목록 페이지에 접근한다
    When "상태" 필터를 "미인증"으로 선택한다
    Then 미인증 회원만 목록에 표시된다
    And 총 회원 수가 미인증 회원 수로 업데이트된다

  Scenario: 관리자가 여러 회원의 상태를 일괄 변경한다
    Given 관리자가 회원 목록 페이지에 접근한다
    When 3명의 회원을 선택한다
    And "일괄 작업"에서 "상태 변경"을 선택한다
    And "승인"을 선택한다
    And 확인한다
    Then 선택한 3명의 회원 상태가 "승인"으로 변경된다
    And 성공 메시지가 표시된다
```

---

## Sprint 2: Board Configuration Enhancement

### AC-010: 게시판 콘텐츠 설정

```gherkin
Feature: 게시판 콘텐츠 설정

  Scenario: 관리자가 히스토리 추적을 활성화한다
    Given 관리자가 게시판 설정 페이지에 접근한다
    When "히스토리"를 "사용"으로 설정한다
    And 저장한다
    Then 글 수정 시 이전 버전이 저장된다
    And "수정 내역 보기" 버튼이 표시된다

  Scenario: 관리자가 추천 기능을 공개로 설정한다
    Given 관리자가 게시판 설정 페이지에 접근한다
    When "추천"을 "사용 + 추천내역 공개"로 설정한다
    And 저장한다
    Then 추천인 목록이 글에 표시된다
    And 비회원은 추천할 수 없다
```

### AC-011: 댓글 설정

```gherkin
Feature: 댓글 설정

  Scenario: 관리자가 대댓글 깊이를 제한한다
    Given 관리자가 게시판 설정 페이지에 접근한다
    When "대댓글 최대 깊이"를 "3"으로 설정한다
    And 저장한다
    Then 3단계까지만 대댓글을 작성할 수 있다
    And 4단계 이상에는 "답글" 버튼이 표시되지 않는다

  Scenario: 관리자가 댓글 페이지 수를 설정한다
    Given 관리자가 게시판 설정 페이지에 접근한다
    When "댓글 수"를 "20"으로 설정한다
    And "댓글 페이지 수"를 "5"로 설정한다
    And 저장한다
    Then 페이지당 20개의 댓글이 표시된다
    And 최대 5개의 댓글 페이지가 표시된다
```

### AC-012: 게시판 권한 설정

```gherkin
Feature: 게시판 권한 설정

  Scenario: 관리자가 그룹별 권한을 설정한다
    Given 관리자가 게시판 권한 설정 페이지에 접근한다
    When "글 작성" 권한에서 "정회원" 그룹을 체크한다
    And "관리 권한"에서 "관리그룹"을 체크한다
    And 저장한다
    Then 정회원은 글을 작성할 수 있다
    And 준회원은 글 작성 시 "권한이 없습니다" 메시지가 표시된다
    And 관리그룹은 모든 글을 관리할 수 있다

  Scenario: 비회원이 권한이 없는 게시판에 접근한다
    Given 게시판이 "로그인 사용자"만 접근 가능하다
    When 비회원이 게시판에 접근한다
    Then 로그인 페이지로 리다이렉트된다
    And "로그인이 필요합니다" 메시지가 표시된다
```

---

## Sprint 3: Points System Enhancement

### AC-020: 포인트 규칙 설정

```gherkin
Feature: 포인트 규칙 설정

  Scenario: 관리자가 글 작성 포인트를 설정한다
    Given 관리자가 포인트 규칙 페이지에 접근한다
    When "글 작성" 규칙을 찾는다
    And 포인트를 "50"으로 설정한다
    And "삭제 시 회수"를 체크한다
    And 저장한다
    Then 회원이 글 작성 시 50포인트가 부여된다
    And 글 삭제 시 50포인트가 차감된다

  Scenario: 관리자가 포인트 제한을 설정한다
    Given 관리자가 포인트 설정 페이지에 접근한다
    When "글 열람 금지"를 활성화한다
    And "최소 포인트"를 "100"으로 설정한다
    And 저장한다
    Then 100포인트 미만 회원은 글을 열람할 수 없다
    And "포인트가 부족합니다" 메시지가 표시된다
```

### AC-021: 레벨 시스템

```gherkin
Feature: 레벨 시스템

  Scenario: 회원의 레벨이 자동으로 계산된다
    Given 포인트 시스템이 활성화되어 있다
    And 레벨 계산 공식이 "N^2 * 100"이다
    When 회원이 900포인트를 획득한다
    Then 회원의 레벨은 3이다 (sqrt(900/100) = 3)
    And 레벨 아이콘이 표시된다

  Scenario: 회원이 레벨에 따라 그룹에 자동 가입된다
    Given 레벨 5 이상 시 "정회원" 그룹 자동 가입이 설정되어 있다
    When 회원의 레벨이 5가 된다
    Then 회원은 자동으로 "정회원" 그룹에 가입된다
    And 알림이 발송된다
```

### AC-022: 포인트 로그

```gherkin
Feature: 포인트 로그

  Scenario: 회원이 포인트 내역을 조회한다
    Given 회원이 로그인되어 있다
    When 회원이 "내 포인트" 페이지에 접근한다
    Then 포인트 획득/차감 내역이 표시된다
    And 각 내역에는 사유, 포인트, 일시가 포함된다
    And 총 포인트와 현재 레벨이 상단에 표시된다
```

---

## Sprint 4: Security Enhancement

### AC-030: IP 접근 제어

```gherkin
Feature: 관리자 IP 접근 제어

  Scenario: 관리자가 IP 화이트리스트를 설정한다
    Given 관리자가 보안 설정 페이지에 접근한다
    When "관리자 로그인 허용 IP"에 "192.168.1.100"을 추가한다
    And 저장한다
    Then 해당 IP에서만 관리자 로그인이 가능하다
    And 다른 IP에서 접근 시 "허용되지 않은 IP" 오류가 표시된다

  Scenario: 관리자가 IP 블랙리스트를 설정한다
    Given 관리자가 보안 설정 페이지에 접근한다
    When "관리자 로그인 금지 IP"에 "10.0.0.50"을 추가한다
    And 저장한다
    Then 해당 IP에서는 관리자 로그인이 차단된다
```

### AC-031: 세션 보안

```gherkin
Feature: 세션 보안

  Scenario: 비밀번호 변경 시 다른 세션이 무효화된다
    Given "비밀번호 변경 시 다른 세션 무효화"가 활성화되어 있다
    And 회원이 2개의 기기에서 로그인되어 있다
    When 회원이 첫 번째 기기에서 비밀번호를 변경한다
    Then 두 번째 기기의 세션이 무효화된다
    And 두 번째 기기에서 접근 시 로그인 페이지로 이동한다

  Scenario: 자동 로그인 시간이 제한된다
    Given "자동 로그인 유지 시간"이 7일로 설정되어 있다
    When 회원이 "로그인 유지"를 체크하고 로그인한다
    Then 7일 동안 재로그인 없이 접근할 수 있다
    And 7일 경과 후 자동 로그아웃된다
```

### AC-032: 보안 헤더

```gherkin
Feature: 보안 헤더

  Scenario: X-Frame-Options 헤더가 적용된다
    Given "X-Frame-Options"가 "SAMEORIGIN"으로 설정되어 있다
    When 클라이언트가 페이지를 요청한다
    Then 응답 헤더에 "X-Frame-Options: SAMEORIGIN"이 포함된다
    And 다른 도메인에서 iframe 임베딩이 차단된다

  Scenario: CSRF 토큰이 검증된다
    Given "CSRF 토큰 검사"가 활성화되어 있다
    When 클라이언트가 CSRF 토큰 없이 POST 요청을 보낸다
    Then 요청이 거부된다
    And "CSRF 토큰이 유효하지 않습니다" 오류가 반환된다
```

---

## Sprint 5: Notification System Enhancement

### AC-040: 알림 유형 설정

```gherkin
Feature: 알림 유형 설정

  Scenario: 관리자가 댓글 알림 채널을 설정한다
    Given 관리자가 알림 센터 설정 페이지에 접근한다
    When "댓글 알림"에서 "웹 알림"과 "메일 알림"을 체크한다
    And 저장한다
    Then 댓글 작성 시 작성자에게 웹 알림과 메일이 발송된다
    And SMS와 푸시 알림은 발송되지 않는다

  Scenario: 관리자가 멘션 알림을 활성화한다
    Given 관리자가 알림 센터 설정 페이지에 접근한다
    When "멘션 알림"의 모든 채널을 체크한다
    And 저장한다
    Then @username 형식의 멘션 시 알림이 발송된다
    And 웹, 메일, SMS, 푸시 모두 발송된다
```

### AC-041: 알림 표시 설정

```gherkin
Feature: 알림 표시 설정

  Scenario: 관리자가 알림 표시를 PC로 제한한다
    Given 관리자가 알림 센터 설정 페이지에 접근한다
    When "알림 표시 여부"를 "PC만 표시"로 설정한다
    And 저장한다
    Then 모바일에서는 알림 센터가 표시되지 않는다
    And PC에서는 정상적으로 표시된다

  Scenario: 문서 열람 시 알림이 자동 삭제된다
    Given "문서 열람 시 알림 삭제"가 활성화되어 있다
    And 회원이 "새 댓글" 알림을 가지고 있다
    When 회원이 해당 글을 열람한다
    Then "새 댓글" 알림이 자동으로 삭제된다
```

### AC-042: 사용자 알림 설정

```gherkin
Feature: 사용자 알림 설정

  Scenario: 회원이 개인 알림 설정을 변경한다
    Given "사용자 알림 설정"이 활성화되어 있다
    And 회원이 로그인되어 있다
    When 회원이 "알림 설정" 페이지에서 "메일 알림"을 끈다
    And 저장한다
    Then 해당 회원에게는 메일 알림이 발송되지 않는다
    And 웹 알림은 정상적으로 발송된다
```

---

## Sprint 6: Communication Features

### AC-050: 메일러 설정

```gherkin
Feature: 메일러 설정

  Scenario: 관리자가 SMTP 설정을 구성한다
    Given 관리자가 메일러 설정 페이지에 접근한다
    When 다음 정보를 입력한다:
      | 호스트 | smtp.example.com |
      | 포트 | 587 |
      | 사용자명 | admin@example.com |
      | 비밀번호 | ******** |
      | 보안 | TLS |
    And 저장한다
    Then 시스템은 SMTP를 통해 메일을 발송할 수 있다

  Scenario: 관리자가 테스트 메일을 발송한다
    Given SMTP 설정이 완료되어 있다
    When 관리자가 "테스트 메일 발송"을 클릭한다
    And 수신자 이메일을 입력한다
    Then 테스트 메일이 발송된다
    And 성공/실패 메시지가 표시된다
```

### AC-051: 발송 내역 로그

```gherkin
Feature: 발송 내역 로그

  Scenario: 관리자가 메일 발송 내역을 조회한다
    Given "메일 발송 내역 기록"이 활성화되어 있다
    When 관리자가 메일 로그 페이지에 접근한다
    Then 발송된 메일 목록이 표시된다
    And 각 항목에는 수신자, 제목, 발송 시간, 상태가 포함된다

  Scenario: 관리자가 실패한 메일을 확인한다
    Given "메일 오류 내역 기록"이 활성화되어 있다
    When 메일 발송이 실패한다
    Then 실패 내역이 로그에 기록된다
    And 실패 사유가 포함된다
```

---

## Quality Gates

### TRUST 5 Validation

#### Tested
- [ ] 모든 기능에 대한 단위 테스트 커버리지 85% 이상
- [ ] E2E 테스트로 주요 사용자 흐름 검증
- [ ] API 엔드포인트 통합 테스트

#### Readable
- [ ] 함수/변수 명명 규칙 준수
- [ ] 복잡한 로직에 주석 추가
- [ ] TypeScript 타입 정의 명확

#### Unified
- [ ] 기존 코드 스타일과 일관성 유지
- [ ] shadcn/ui 컴포넌트 사용
- [ ] 공통 유틸리티 함수 재사용

#### Secured
- [ ] 모든 입력값 검증 (Zod 스키마)
- [ ] SQL 인젝션 방지 (Supabase 파라미터화 쿼리)
- [ ] XSS 방지 (React 자동 이스케이프)
- [ ] CSRF 토큰 검증

#### Trackable
- [ ] 설정 변경 시 감사 로그 기록
- [ ] 오류 발생 시 로깅
- [ ] 성능 메트릭 수집

---

## Edge Cases

### Member Management

1. **동시 편집 충돌**: 두 관리자가 동시에 같은 회원 정보를 편집할 때
2. **대량 데이터 내보내기**: 10,000명 이상의 회원 데이터 내보내기
3. **특수문자 닉네임**: 유니코드 이모지 및 결합 문자 처리

### Board Configuration

1. **순환 참조**: 게시판 복사 시 무한 루프 방지
2. **권한 상속**: 그룹 권한 변경 시 기존 게시판 권한 동기화
3. **대량 이동**: 1,000개 이상의 게시물 이동 시 타임아웃

### Points System

1. **포인트 음수**: 차감으로 인한 음수 포인트 처리
2. **동시 포인트 부여**: 같은 사용자에게 동시에 여러 포인트 부여
3. **레벨 경계**: 레벨 업/다운 경계값 처리

### Security

1. **IPv6 지원**: IPv6 주소 형식 처리
2. **프록시 IP**: X-Forwarded-For 헤더 신뢰 여부
3. **세션 고갈**: 과도한 세션 생성 방지

### Notifications

1. **알림 폭주**: 짧은 시간 내 대량 알림 발생 시 큐잉
2. **발송 실패 재시도**: 메일/SMS 발송 실패 시 재시도 정책
3. **알림 중복**: 같은 이벤트에 대한 중복 알림 방지

---

## Test Data Requirements

### Members
- 관리자 2명 (다른 그룹)
- 정회원 10명
- 준회원 10명
- 미인증 회원 5명
- 거부된 회원 3명

### Boards
- 권한 없는 게시판 1개
- 정회원 전용 게시판 1개
- 비회원 작성 가능 게시판 1개

### Content
- 각 게시판에 게시물 20개
- 각 게시물에 댓글 10개 (대댓글 포함)

---

## Sign-off Checklist

- [ ] 모든 Gherkin 시나리오 통과
- [ ] 코드 리뷰 완료
- [ ] 보안 검토 완료
- [ ] 성능 테스트 통과
- [ ] 사용자 매뉴얼 업데이트
- [ ] CHANGELOG 업데이트
