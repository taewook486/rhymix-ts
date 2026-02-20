/**
 * Installation State Types and Utilities
 *
 * Provides type definitions and state management utilities
 * for the installation wizard process.
 */

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Installation wizard steps
 */
export type InstallationStep =
  | 'welcome'
  | 'requirements'
  | 'database'
  | 'admin_account'
  | 'site_configuration'
  | 'complete'

/**
 * Step numbers mapping for UI progression
 */
export const STEP_NUMBERS: Record<InstallationStep, number> = {
  welcome: 1,
  requirements: 2,
  database: 3,
  admin_account: 4,
  site_configuration: 5,
  complete: 6,
}

/**
 * Installation status states
 */
export type InstallationStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

/**
 * Installation state interface
 */
export interface InstallationState {
  id: string
  status: InstallationStatus
  currentStep: number
  stepData: Record<string, unknown>
  errorMessage?: string
  errorDetails?: Record<string, unknown>
  siteName?: string
  adminEmail?: string
  adminUserId?: string
  timezone: string
  language: string
  supabaseUrl?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * Admin account creation data
 */
export interface AdminAccountData {
  email: string
  password: string
  displayName: string
}

/**
 * Site configuration data
 */
export interface SiteConfigurationData {
  siteName: string
  siteDescription?: string
  timezone: string
  language: string
  adminEmail: string
}

/**
 * Supabase connection validation data
 */
export interface SupabaseConnectionData {
  url: string
  anonKey: string
}

/**
 * Step data for each installation step
 */
export interface StepDataMap {
  welcome: Record<string, never>
  requirements: {
    nodeVersion: string
    npmVersion: string
    supabaseProjectReady: boolean
  }
  database: {
    connected: boolean
    migrationsApplied: boolean
    connectionTestedAt: string
  }
  admin_account: {
    userId: string
    email: string
    displayName: string
    createdAt: string
  }
  site_configuration: {
    siteName: string
    siteDescription: string
    timezone: string
    language: string
  }
  complete: {
    completedAt: string
    version: string
  }
}

// =====================================================
// VALIDATION UTILITIES
// =====================================================

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function isValidPassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates Supabase URL format
 */
export function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.hostname.includes('supabase')
    )
  } catch {
    return false
  }
}

/**
 * Validates Supabase anon key format (JWT)
 */
export function isValidSupabaseAnonKey(key: string): boolean {
  // JWT format: header.payload.signature
  const jwtParts = key.split('.')
  return jwtParts.length === 3 && key.length > 100
}

/**
 * Validates display name
 */
export function isValidDisplayName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100
}

/**
 * Validates timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  const validTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
  ]
  return validTimezones.includes(timezone) || timezone.includes('/')
}

/**
 * Validates language code
 */
export function isValidLanguage(language: string): boolean {
  const validLanguages = ['ko', 'en', 'ja', 'zh', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'pt', 'ru']
  return validLanguages.includes(language)
}

// =====================================================
// STEP VALIDATION FUNCTIONS
// =====================================================

/**
 * Validates welcome step data
 */
export function validateWelcomeStep(): { valid: boolean; errors: string[] } {
  // Welcome step has no data to validate
  return { valid: true, errors: [] }
}

/**
 * Validates requirements step data
 */
export function validateRequirementsStep(data: Partial<StepDataMap['requirements']>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.nodeVersion) {
    errors.push('Node.js version is required')
  }
  if (!data.supabaseProjectReady) {
    errors.push('Supabase project must be ready')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates database step data
 */
export function validateDatabaseStep(data: Partial<StepDataMap['database']>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.connected) {
    errors.push('Database connection is required')
  }
  if (!data.migrationsApplied) {
    errors.push('Database migrations must be applied')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates admin account step data
 */
export function validateAdminAccountStep(data: Partial<AdminAccountData>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email address is required')
  }

  if (!data.password) {
    errors.push('Password is required')
  } else {
    const passwordValidation = isValidPassword(data.password)
    errors.push(...passwordValidation.errors)
  }

  if (!data.displayName || !isValidDisplayName(data.displayName)) {
    errors.push('Display name must be between 2 and 100 characters')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates site configuration step data
 */
export function validateSiteConfigurationStep(data: Partial<SiteConfigurationData>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.siteName || data.siteName.trim().length < 2) {
    errors.push('Site name must be at least 2 characters')
  }

  if (!data.timezone || !isValidTimezone(data.timezone)) {
    errors.push('Valid timezone is required')
  }

  if (!data.language || !isValidLanguage(data.language)) {
    errors.push('Valid language is required')
  }

  if (!data.adminEmail || !isValidEmail(data.adminEmail)) {
    errors.push('Valid admin email is required')
  }

  return { valid: errors.length === 0, errors }
}

// =====================================================
// STATE TRANSITION HELPERS
// =====================================================

/**
 * Gets the next step in the installation process
 */
export function getNextStep(currentStep: InstallationStep): InstallationStep | null {
  const steps: InstallationStep[] = [
    'welcome',
    'requirements',
    'database',
    'admin_account',
    'site_configuration',
    'complete',
  ]

  const currentIndex = steps.indexOf(currentStep)
  if (currentIndex === -1 || currentIndex === steps.length - 1) {
    return null
  }

  return steps[currentIndex + 1]
}

/**
 * Gets the previous step in the installation process
 */
export function getPreviousStep(currentStep: InstallationStep): InstallationStep | null {
  const steps: InstallationStep[] = [
    'welcome',
    'requirements',
    'database',
    'admin_account',
    'site_configuration',
    'complete',
  ]

  const currentIndex = steps.indexOf(currentStep)
  if (currentIndex <= 0) {
    return null
  }

  return steps[currentIndex - 1]
}

/**
 * Converts step number to step name
 */
export function getStepName(stepNumber: number): InstallationStep | null {
  const stepMap: Record<number, InstallationStep> = {
    1: 'welcome',
    2: 'requirements',
    3: 'database',
    4: 'admin_account',
    5: 'site_configuration',
    6: 'complete',
  }

  return stepMap[stepNumber] || null
}

/**
 * Converts step name to step number
 */
export function getStepNumber(step: InstallationStep): number {
  return STEP_NUMBERS[step]
}

/**
 * Checks if installation can proceed to the given step
 */
export function canProceedToStep(
  targetStep: InstallationStep,
  currentState: InstallationState
): boolean {
  const targetStepNumber = getStepNumber(targetStep)
  const currentStepNumber = currentState.currentStep

  // Can always go back
  if (targetStepNumber <= currentStepNumber) {
    return true
  }

  // Can only go forward one step at a time if current step is complete
  if (targetStepNumber === currentStepNumber + 1 && currentState.status === 'completed') {
    return true
  }

  return false
}

// =====================================================
// ERROR HANDLING UTILITIES
// =====================================================

/**
 * Installation error types
 */
export type InstallationErrorType =
  | 'connection_failed'
  | 'validation_failed'
  | 'user_creation_failed'
  | 'configuration_failed'
  | 'migration_failed'
  | 'unknown'

/**
 * Installation error interface
 */
export interface InstallationError {
  type: InstallationErrorType
  message: string
  details?: Record<string, unknown>
  recoverable: boolean
}

/**
 * Creates a standardized installation error
 */
export function createInstallationError(
  type: InstallationErrorType,
  message: string,
  details?: Record<string, unknown>
): InstallationError {
  const recoverableTypes: InstallationErrorType[] = [
    'connection_failed',
    'validation_failed',
    'configuration_failed',
  ]

  return {
    type,
    message,
    details,
    recoverable: recoverableTypes.includes(type),
  }
}

/**
 * Formats error message for display
 */
export function formatErrorMessage(error: InstallationError | Error | string): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  return error.message
}
