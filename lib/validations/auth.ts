import { z } from 'zod'

const passwordMinLength = 8
const passwordMaxLength = 100

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`),
})

export const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`)
      .max(passwordMaxLength, `Password must be at most ${passwordMaxLength} characters`)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
    displayName: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(20, 'Display name must be at most 20 characters')
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email'),
})

export const passwordUpdateSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`)
      .max(passwordMaxLength, `Password must be at most ${passwordMaxLength} characters`)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type SignInFormData = z.infer<typeof signInSchema>
export type SignUpFormData = z.infer<typeof signUpSchema>
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>
export type PasswordUpdateFormData = z.infer<typeof passwordUpdateSchema>
