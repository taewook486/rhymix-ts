/**
 * 사용자 인증 영역 — SPEC-INSTALL-002 Group 1
 *
 * 인증 상태에 따라 다른 UI를 표시하는 Client Component.
 * - 미인증: "로그인" 링크
 * - 인증: 닉네임 + 로그아웃 버튼
 */
'use client';

import Link from 'next/link';

interface UserAuthSectionProps {
  userId: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userIdString?: string | null;
}

export function UserAuthSection({
  userId,
  userName,
  userEmail,
  userIdString,
}: UserAuthSectionProps) {
  // REQ-INSTALL2-005: 미인증 시 세션 정보 누출 방지
  if (userId == null) {
    return (
      <Link href="/login" className="text-sm text-gray-500 hover:text-blue-600">
        로그인
      </Link>
    );
  }

  // REQ-INSTALL2-001: 인증된 사용자 정보 표시
  // 닉네임 우선, 없으면 이메일, 그것도 없으면 ID
  const displayName = userName ?? userEmail ?? userIdString;

  return (
    <>
      <span className="text-sm text-gray-700">{displayName}</span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-sm text-gray-500 hover:text-blue-600"
        >
          로그아웃
        </button>
      </form>
    </>
  );
}
