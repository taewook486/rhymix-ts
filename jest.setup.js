require('@testing-library/jest-dom')

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill for fetch using node-fetch v2 (CommonJS)
const nodeFetch = require('node-fetch')
global.fetch = nodeFetch
global.Request = nodeFetch.Request
global.Response = nodeFetch.Response
global.Headers = nodeFetch.Headers

// Mock Next.js cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn(() => jest.fn()),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Default spam config for tests
const defaultSpamConfig = {
  enable_link_check: true,
  max_links_count: 3,
  enable_keyword_filter: true,
  blocked_keywords: ['viagra', 'casino'],
  enable_frequency_limit: true,
  max_posts_per_hour: 5,
  enable_captcha: false,
}

// Helper to create chainable mock for Supabase queries
function createMockQuery(data = null, error = null) {
  return {
    select: jest.fn(() => createMockQuery(data, error)),
    insert: jest.fn(() => createMockQuery(data, error)),
    update: jest.fn(() => createMockQuery(data, error)),
    delete: jest.fn(() => createMockQuery(data, error)),
    eq: jest.fn(() => createMockQuery(data, error)),
    gte: jest.fn(() => createMockQuery(data, error)),
    lte: jest.fn(() => createMockQuery(data, error)),
    gt: jest.fn(() => createMockQuery(data, error)),
    or: jest.fn(() => createMockQuery(data, error)),
    is: jest.fn(() => createMockQuery(data, error)),
    order: jest.fn(() => createMockQuery(data, error)),
    limit: jest.fn(() => createMockQuery(data, error)),
    range: jest.fn(() => createMockQuery(data, error)),
    upsert: jest.fn(() => createMockQuery(data, error)),
    single: jest.fn(() => Promise.resolve({ data, error })),
    maybeSingle: jest.fn(() => Promise.resolve({ data, error })),
    rpc: jest.fn(() => Promise.resolve({ data, error })),
  }
}

// Create mock client factory
const createMockClient = () => {
  const mockClient = {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => createMockQuery()),
  }

  // Allow tests to override the mock
  mockClient.__mockQuery = (data, error) => {
    mockClient.from.mockReturnValueOnce(createMockQuery(data, error))
  }

  return mockClient
}

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(createMockClient),
}))

// Mock Supabase auth
jest.mock('@/lib/supabase/auth', () => {
  const authMock = {
    getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  }
  return {
    auth: authMock,
    getUser: authMock.getUser,
  }
})

// Global setup for spam tests
beforeEach(() => {
  const { createClient } = require('@/lib/supabase/server')

  // Reset and setup default spam config mock
  createClient.mockImplementation(() => {
    const mockClient = {
      auth: {
        getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
      },
      from: jest.fn(() => createMockQuery({ config: defaultSpamConfig })),
    }
    return mockClient
  })
})

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
