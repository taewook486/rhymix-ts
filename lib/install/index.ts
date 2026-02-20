/**
 * Installation Module
 *
 * Provides all installation-related functionality:
 * - Server actions for installation wizard
 * - State management and validation
 * - Type definitions
 */

// Server Actions
export {
  // Installation status
  checkInstallationStatus,
  getInstallationState,

  // Database connection
  validateSupabaseConnection,

  // Admin account
  createAdminAccount,

  // Site configuration
  saveConfiguration,
  getSiteConfigValue,
  getAllSiteConfig,

  // Installation completion
  finalizeInstallation,

  // Environment variables
  writeEnvironmentVariables,

  // Utilities
  resetInstallation,
  saveInstallationStep,

  // Types
  type ActionResult,
  type ConnectionTestResult,
  type AdminUserResult,
} from './actions'

// State utilities and types
export {
  // Step types
  type InstallationStep,
  type InstallationStatus,
  type InstallationState,
  STEP_NUMBERS,

  // Data types
  type AdminAccountData,
  type SiteConfigurationData,
  type SupabaseConnectionData,
  type StepDataMap,

  // Validation functions
  isValidEmail,
  isValidPassword,
  isValidSupabaseUrl,
  isValidSupabaseAnonKey,
  isValidDisplayName,
  isValidTimezone,
  isValidLanguage,

  // Step validation
  validateWelcomeStep,
  validateRequirementsStep,
  validateDatabaseStep,
  validateAdminAccountStep,
  validateSiteConfigurationStep,

  // State helpers
  getNextStep,
  getPreviousStep,
  getStepName,
  getStepNumber,
  canProceedToStep,

  // Error handling
  type InstallationErrorType,
  type InstallationError,
  createInstallationError,
  formatErrorMessage,
} from './state'

// Existing types (from types.ts)
export {
  // Enums
  InstallationStatus as InstallationStatusConstant,
  InstallationStep as InstallationStepConstant,

  // Type definitions
  type InstallationStatusType,
  type InstallationStepType,
  type InstallationStatusRecord,
  type SupabaseConfigFormData,
  type AdminAccountFormData,
  type SiteConfigFormData,

  // Validation schemas
  supabaseConfigSchema,
  adminAccountSchema,
  siteConfigSchema,

  // UI helpers
  stepLabels,
  stepDescriptions,
  availableTimezones,
  availableLanguages,
} from './types'

// Installation state persistence
export {
  getInstallationStatus,
  isInstallationComplete,
  isInstallationStarted,
  updateInstallationStep,
  saveSupabaseConfig,
  saveAdminInfo,
  saveSiteConfig,
  completeInstallation,
  resetInstallation as resetInstallationState,
} from './installation-state'
