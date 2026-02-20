# 배포 가이드 (Deployment Guide)

## 1. Supabase 프로젝트 설정

### 1.1 프로젝트 생성

1. [Supabase](https://supabase.com) 접속
2. **New Project** 클릭
3. 조직 선택 (또는 새로 생성)
4. 프로젝트 정보 입력:
   - **Name**: `rhymix-ts`
   - **Database Password**: (안전한 비밀번호 저장)
   - **Region**: `Southeast Asia (Singapore)` → 한국 사용자 추천

### 1.2 마이그레이션 실행

1. 프로젝트 대시보드 → **SQL Editor**
2. **New Query** 클릭
3. `supabase/migrations/001_initial_schema.sql` 내용 복사/붙여넣기
4. **Run** 실행

### 1.3 API 키 확인

**Settings → API**에서 다음 정보 복사:
- **Project URL**
- **anon public** key

---

## 2. 환경 변수 설정

### 2.1 로컬 개발

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2.2 Vercel 환경 변수

Vercel 프로젝트 설정 → **Environment Variables**:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 프로젝트 URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | All |

---

## 3. Vercel 배포

### 3.1 GitHub 연동

1. [Vercel](https://vercel.com) 접속
2. **Add New Project** → **Continue with GitHub**
3. `rhymix-ts` 저장소 선택
4. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.2 환경 변수 추가

Environment Variables 섹션에 Supabase 값 추가

### 3.3 배포

**Deploy** 버튼 클릭

---

## 4. 도메인 설정 (선택)

### 4.1 Vercel 도메인

1. 프로젝트 → **Settings** → **Domains**
2. **Add Domain** → 도메인 입력
3. DNS 설정 안내 따르기

### 4.2 Supabase 도메인

Supabase Settings → **Authentication** → **URL Configuration**

- **Site URL**: 배포된 도메인
- **Redirect URLs**: 로그인 후 리다이렉트 경로 추가

---

## 5. OAuth 공급자 설정 (선택)

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials**
3. **OAuth 2.0 Client ID** 생성
4. Supabase Dashboard → **Authentication** → **Providers** → **Google**:
   - Client ID 입력
   - Client Secret 입력
   - Redirect URL 추가

---

## 6. 배포 후 확인

### 체크리스트

- [ ] 홈페이지 접속 가능
- [ ] 회원가입 작동
- [ ] 로그인 작동
- [ ] 게시판 목록 표시
- [ ] 게시글 작성 가능
- [ ] 댓글 작동
- [ ] 프로필 수정 가능

---

## 7. 문제 해결

### 빌드 실패

```bash
# 로컬에서 빌드 테스트
npm run build

# 타입 체크
npm run type-check

# Lint
npm run lint
```

### 데이터베이스 연결 실패

1. `.env.local` 확인
2. Supabase 프로젝트 상태 확인
3. RLS 정책 확인

### 인증 실패

1. Supabase Auth 활성화 확인
2. Email templates 설정 확인
3. Redirect URL 확인

---

## 8. 모니터링

### Vercel Analytics

- **Settings** → **Analytics** 활성화

### Supabase Logs

- **Logs** → **Database** 또는 **API**

---

## 9. 백업

### 데이터베이스 백업

Supabase → **Database** → **Backups** → **Enable automated backups**

### 코드 백업

Git으로 정기 커밋

---

## 10. 업데이트 배포

```bash
# 변경사항 커밋
git add .
git commit -m "feat: 새 기능"
git push

# Vercel 자동 배포됨
```

---

## 빠른 시작

```bash
# 1. Supabase 프로젝트 생성 후 마이그레이션 실행
# 2. .env.local 설정
# 3. 개발 서버 시작
npm run dev

# 4. Vercel 배포
vercel deploy
```
