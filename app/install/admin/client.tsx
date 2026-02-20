'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InstallLayout } from '@/components/install/InstallLayout'
import {
  adminAccountSchema,
  type AdminAccountFormData,
  InstallationStep,
} from '@/lib/install/types'
import { createAdminAccount } from '@/lib/install/actions'

export function AdminClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<AdminAccountFormData>({
    resolver: zodResolver(adminAccountSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      nickname: '',
      user_id: '',
    },
  })

  const onSubmit = async (data: AdminAccountFormData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await createAdminAccount(data)

      if (result.success) {
        router.push('/install/config')
      } else {
        setError(result.error || 'Failed to create admin account')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <InstallLayout
      currentStep={InstallationStep.ADMIN}
      onNext={form.handleSubmit(onSubmit)}
      nextDisabled={!form.formState.isValid}
      nextLoading={loading}
      nextLabel="Create Account & Continue"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Administrator Account</AlertTitle>
          <AlertDescription>
            Create the first administrator account. This account will have full
            access to all site settings and features.
          </AlertDescription>
        </Alert>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Creation Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      {...field}
                      data-testid="input-admin-email"
                    />
                  </FormControl>
                  <FormDescription>
                    Used for login and notifications
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* User ID */}
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="admin"
                      {...field}
                      data-testid="input-user-id"
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier (lowercase letters, numbers, underscores only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nickname */}
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Administrator"
                      {...field}
                      data-testid="input-nickname"
                    />
                  </FormControl>
                  <FormDescription>
                    How your name will appear on the site
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    At least 8 characters with uppercase, lowercase, number, and special character
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-confirm-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Password requirements checklist */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-medium">Password Requirements</h4>
          <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <li className={form.watch('password')?.length >= 8 ? 'text-green-600' : ''}>
              • At least 8 characters
            </li>
            <li className={/[A-Z]/.test(form.watch('password') || '') ? 'text-green-600' : ''}>
              • Uppercase letter
            </li>
            <li className={/[a-z]/.test(form.watch('password') || '') ? 'text-green-600' : ''}>
              • Lowercase letter
            </li>
            <li className={/[0-9]/.test(form.watch('password') || '') ? 'text-green-600' : ''}>
              • Number
            </li>
            <li className={/[!@#$%^&*(),.?":{}|<>]/.test(form.watch('password') || '') ? 'text-green-600' : ''}>
              • Special character
            </li>
          </ul>
        </div>
      </div>
    </InstallLayout>
  )
}
