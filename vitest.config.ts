import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Global test settings
    globals: true,
    environment: 'happy-dom',

    // Test file patterns
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],

    // Setup files
    setupFiles: ['./tests/setup/vitest.setup.tsx'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Coverage targets (enforced by quality.yaml)
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },

      // Include patterns
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'actions/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
      ],

      // Exclude patterns
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        'app/**/layout.tsx', // Layout files typically have minimal logic
        'app/**/loading.tsx', // Loading states
        'app/**/error.tsx', // Error boundaries
        'app/**/not-found.tsx', // 404 pages
      ],
    },

    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,

    // Retry failed tests
    retry: 2,

    // Parallel execution
    pool: 'threads',

    // Reporter configuration
    reporters: ['default', 'html'],

    // Watch mode settings
    watch: false,

    // Global test APIs
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/tests': path.resolve(__dirname, './tests'),
    },

    // Environment variables for tests
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      NODE_ENV: 'test',
    },

    // Mock settings
    deps: {
      interopDefault: true,
    },

    // Cache settings
    cache: {
      dir: './node_modules/.vitest',
    },
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
