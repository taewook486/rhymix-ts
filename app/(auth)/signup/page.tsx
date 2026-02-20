import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignUpForm } from '@/components/member/SignUpForm'
import { OAuthButtons, OAuthDivider } from '@/components/member/OAuthButtons'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up for a new account to get started.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OAuthButtons redirectTo="/member/profile" />
        <OAuthDivider />
        <SignUpForm redirectTo="/member/profile" />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
