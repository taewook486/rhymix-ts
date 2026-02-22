import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignInForm } from '@/components/member/SignInForm'
import { OAuthButtons, OAuthDivider } from '@/components/member/OAuthButtons'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Welcome back! Sign in to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OAuthButtons redirectTo="/member/profile" />
        <OAuthDivider />
        <SignInForm redirectTo="/member/profile" />
        <p className="text-center text-sm text-muted-foreground">
          Forgot your password?{' '}
          <Link href="/reset-password" className="text-primary hover:underline">
            Reset it here
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
