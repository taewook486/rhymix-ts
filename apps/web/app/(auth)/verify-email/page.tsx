/**
 * 이메일 인증 페이지 — SPEC-AUTH-001 Slice F.
 *
 * Server Component — searchParams 에서 token 을 읽어
 * 직접 verifyEmail 도메인 함수를 호출한다.
 *
 * @MX:NOTE: [AUTO] Server Component 에서 도메인 함수 직접 호출 — Server Action 우회.
 * @MX:REASON: 이메일 인증은 사용자 폼 제출이 아닌 링크 클릭이므로 Server Component 에서 바로 처리.
 */
import Link from 'next/link';

import { verifyEmail } from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  // 토큰이 없는 경우
  if (!token) {
    return (
      <>
        <h1 className="text-2xl font-bold text-center mb-6">이메일 인증</h1>
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded text-center" role="alert">
          잘못된 접근입니다. 인증 링크를 다시 확인해주세요.
        </div>
        <div className="mt-4 text-center">
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            로그인으로 돌아가기
          </Link>
        </div>
      </>
    );
  }

  // 토큰으로 이메일 인증 수행
  const result = await verifyEmail({ token }, { prisma });

  if (result.ok) {
    return (
      <>
        <h1 className="text-2xl font-bold text-center mb-6">이메일 인증</h1>
        <div className="text-green-700 bg-green-50 p-4 rounded text-center">
          <p className="font-medium">이메일 인증이 완료되었습니다.</p>
          <p className="text-sm mt-2 text-gray-600">
            이제 로그인할 수 있습니다.
          </p>
        </div>
        <div className="mt-4 text-center">
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            로그인하기
          </Link>
        </div>
      </>
    );
  }

  // 인증 실패
  const errorMessage =
    result.code === 'TOKEN_EXPIRED'
      ? '인증 링크가 만료되었습니다. 다시 발송해주세요.'
      : '인증 링크가 유효하지 않습니다. 다시 확인해주세요.';

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">이메일 인증</h1>
      <div className="text-red-600 text-sm p-3 bg-red-50 rounded text-center" role="alert">
        {errorMessage}
      </div>
      <div className="mt-4 text-center">
        <Link href="/login" className="text-blue-600 hover:underline text-sm">
          로그인으로 돌아가기
        </Link>
      </div>
    </>
  );
}
