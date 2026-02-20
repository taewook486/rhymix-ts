# Development Guide

## Prerequisites

- Node.js 22+
- pnpm 9+
- Supabase account

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-username/rhymix-ts.git
cd rhymix-ts
pnpm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth group layout
│   ├── (dashboard)/       # Dashboard group layout
│   ├── api/               # API routes
│   ├── actions/           # Server actions
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── board/            # Board module
│   ├── member/           # Member module
│   └── shared/           # Shared components
├── lib/                  # Utilities
│   └── supabase/         # Supabase client
│       ├── server.ts     # Server client
│       ├── client.ts     # Browser client
│       └── middleware.ts # Auth middleware
├── types/                # TypeScript types
└── styles/               # Global styles
```

## Available Scripts

```bash
# Development
pnpm dev              # Start dev server

# Building
pnpm build            # Build for production

# Quality
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript check

# Testing
pnpm test             # Run unit tests
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run E2E tests
```

## Coding Guidelines

### TypeScript

- Use strict mode
- Prefer explicit types
- Use `interface` for object shapes, `type` for unions/intersections

### React

- Use Server Components by default
- Use Client Components only when needed (interactivity, state)
- Use Server Actions for mutations

### Naming Conventions

- Components: PascalCase (`UserProfile.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Types: PascalCase (`UserProfile.ts`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)

### File Organization

- Co-locate related files
- Use index files for cleaner imports
- Keep component files focused

## Database Schema

See [supabase/migrations/001_initial_schema.sql](../supabase/migrations/001_initial_schema.sql)

Key tables:
- `profiles` - User profiles
- `boards` - Forum boards
- `posts` - Forum posts
- `comments` - Comments
- `documents` - Document content
- `categories` - Categories
- `menus` - Navigation menus

## Authentication

This project uses Supabase Auth:

- Sign in with email/password
- OAuth providers (Google, GitHub)
- Magic link authentication
- Email verification

See `docs/architecture/auth-system.md` for details.

## Deployment

### Vercel

```bash
vercel deploy
```

### Docker

```bash
docker-compose up -d
```

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules
pnpm install
```

### Database Connection

If you can't connect to Supabase:

1. Check your `.env.local` file
2. Verify your Supabase project URL and keys
3. Check Supabase status page

### Type Errors

If you have TypeScript errors:

```bash
# Regenerate types
pnpm type-check
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Rhymix Original](https://github.com/rhymix/rhymix)
