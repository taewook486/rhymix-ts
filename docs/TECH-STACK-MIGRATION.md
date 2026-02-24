# 기술 스택 마이그레이션 분석

작성일: 2026-02-23
목표 기술 스택: Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + React Query + Zustand + Supabase

---

## 목표 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (React 19, Turbopack) |
| 언어 | TypeScript 5.9 |
| 스타일링 | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| 상태 관리 | TanStack React Query + Zustand |
| 폼/검증 | React Hook Form + Zod |
| 백엔드 | Supabase (PostgreSQL + Auth + Storage) |
| 인증 | Google OAuth (Supabase Auth) |
| 모니터링 | Vercel Speed Insights |

---

## 현재 상태

| 영역 | 현재 기술 | 버전 |
|------|----------|------|
| 프레임워크 | Next.js + React | 16.1.6 + 19.2.4 |
| Turbopack | `next dev --turbopack` | 활성화됨 |
| TypeScript | 5.x | 정확한 버전 미지정 |
| 스타일링 | Tailwind CSS + Radix UI | v3.4.17 |
| 상태 관리 | Zustand | 5.0.11 (설치됨, 미사용) |
| 폼/검증 | React Hook Form + Zod | 7.71.1 + 3.25.76 |
| 백엔드 | Supabase | @supabase/ssr, @supabase/supabase-js |
| 인증 | OAuth (Google/GitHub) | Supabase Auth |
| 모니터링 | 없음 | - |

---

## 문제점 분석

### 1. TanStack React Query 추가 (중간 난이도)

**현재 상황:**
- React Query가 설치되어 있지 않음
- Server Actions와 Supabase 직접 호출 방식 사용
- `app/actions/` 폴더의 서버 액션들로 데이터 처리

**문제점:**
- Server Actions 기반 아키텍처에서 React Query 도입 시 충돌 가능
- 현재 서버 액션들을 React Query mutation으로 전환 필요
- 실시간 기능(`useRealtime.ts`, `useNotifications.ts`)이 Supabase Realtime을 직접 사용

**해결 방안:**
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

---

### 2. Tailwind CSS v3 → v4 업그레이드 (높은 난이도)

**현재 상황:**
- Tailwind CSS v3.4.17 사용
- 전통적인 `tailwind.config.ts` 구성
- PostCSS 플러그인 방식

**문제점:**
- Tailwind CSS v4는 완전히 새로운 구성 방식 사용 (CSS 네이티브 구성)
- `tailwind.config.ts`가 더 이상 사용되지 않음
- `@import "tailwindcss"` 방식으로 변경 필요
- shadcn/ui가 아직 Tailwind v4를 완전히 지원하지 않을 수 있음

**주요 변경 사항:**

**기존 (`tailwind.config.ts`):**
```typescript
import type { Config } from 'tailwindcss'
const config: Config = { ... }
export default config
```

**Tailwind v4 방식 (`app/globals.css`):**
```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.5 0.2 250);
  /* ... */
}
```

**영향 파일:**
- `tailwind.config.ts` - 삭제 또는 대체
- `postcss.config.mjs` - 수정 필요
- `app/globals.css` - 전체 재작성
- 모든 컴포넌트의 CSS 변수 (HSL → OKLCH 변환)

---

### 3. Zustand 상태 관리 활성화 (낮은 난이도)

**현재 상황:**
- Zustand 5.0.11이 설치되어 있지만 실제로 사용되지 않음
- 대부분의 상태가 Server Actions와 Supabase 직접 호출로 관리

**문제점:**
- 글로벌 상태(테마, 알림, 사용자 세션)를 위한 중앙 저장소 부족

---

### 4. Google OAuth만 사용 (낮은 난이도)

**현재 상황:**
- Google과 GitHub OAuth가 모두 구현됨 (`components/member/OAuthButtons.tsx`)

---

### 5. Vercel Speed Insights 추가 (낮은 난이도)

**현재 상황:**
- 모니터링 도구가 설치되어 있지 않음

---

## 변경 작업 우선순위

| 순서 | 작업 | 난이도 | 영향 범위 | 추천 |
|------|------|--------|----------|------|
| 1 | Vercel Speed Insights 추가 | 낮음 | 새 파일 | ✅ |
| 2 | GitHub OAuth 제거 | 낮음 | 1개 컴포넌트 | ✅ |
| 3 | Zustand 활성화 | 중간 | 새 저장소 생성 | ✅ |
| 4 | TypeScript 5.9 업그레이드 | 낮음 | package.json | ✅ |
| 5 | TanStack React Query 추가 | 높음 | 아키텍처 변경 | ⚠️ |
| 6 | Tailwind CSS v4 업그레이드 | 매우 높음 | 전체 CSS 변경 | ❌ |

---

## 권장 사항

1. **단계적 접근:** 한 번에 모든 변경을 시도하지 말고 단계적으로 진행
2. **Tailwind v4 주의:** 아직 베타/RC 단계이므로 프로덕션에서는 v3 유지 권장
3. **React Query vs Server Actions:** 현재 Server Actions 기반 아키텍처가 잘 작동하므로 굳이 변경할 필요 없음
4. **Zustand 도입:** 테마, 알림, 모달 상태 등 글로벌 상태 관리부터 시작
5. **모니터링 우선:** Vercel Speed Insights는 즉시 추가 가능하며 큰 영향 없음

---

## 참고 파일

- `package.json` - 의존성 관리
- `tailwind.config.ts` - Tailwind v3 구성
- `app/globals.css` - CSS 변수 정의
- `components/member/OAuthButtons.tsx` - OAuth 버튼
- `middleware.ts` - 인증 미들웨어
- `lib/supabase/auth.ts` - Supabase Auth 유틸리티
