// Authentication type definitions

export interface SignInInput {
  email: string
  password: string
}

export interface SignUpInput {
  email: string
  password: string
  displayName?: string
}

export interface AuthResponse {
  success: boolean
  error?: string
  message?: string
}

export interface AuthError {
  code: AuthErrorCode
  message: string
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'USER_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN_ERROR'

export interface PasswordResetInput {
  email: string
}

export interface PasswordUpdateInput {
  password: string
  confirmPassword: string
}
