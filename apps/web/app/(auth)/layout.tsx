/**
 * 인증 페이지 공통 레이아웃 — SPEC-AUTH-001 Slice F.
 *
 * 모든 인증 관련 페이지(로그인, 회원가입, 이메일 인증, 비밀번호 재설정)는
 * 이 레이아웃을 공유하며, 화면 중앙에 카드 형태로 표시된다.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        {children}
      </div>
    </div>
  );
}
