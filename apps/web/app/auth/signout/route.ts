/**
 * Auth.js v5 signOut 경로 — SPEC-INSTALL-002 REQ-INSTALL2-003
 *
 * POST /auth/signout로 호출되며, Auth.js 세션을 종료하고 홈으로 리다이렉트한다.
 */
import { signOut } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export async function POST() {
  await signOut({ redirect: false });
  redirect('/');
}
