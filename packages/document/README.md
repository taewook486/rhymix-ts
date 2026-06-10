# @rhymix-ts/document

Document domain package — extracted from board (SPEC-DOCUMENT-001).

## Overview

This package contains the document domain logic that was previously part of the `@rhymix-ts/board` package. It provides core document functionality including:

- Document CRUD operations
- Extra fields and custom keys
- Document search with PostgreSQL FTS
- Vote and report functionality
- Trash and restore operations
- Document history tracking
- Rate limiting
- Permissions checking

## Installation

This package is part of the Rhymix TypeScript monorepo and uses workspace dependencies.

```json
{
  "dependencies": {
    "@rhymix-ts/document": "workspace:*"
  }
}
```

## Usage

```typescript
import {
  createDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  getDocument,
  searchDocuments,
  searchTags
} from '@rhymix-ts/document';
```

## Dependencies

- `@rhymix-ts/core` — Core types and utilities
- `@rhymix-ts/db` — Prisma client
- `@rhymix-ts/auth` — Authentication and authorization types
- `zod` — Schema validation
- `isomorphic-dompurify` — HTML sanitization

## Development

```bash
# Run tests
pnpm test

# Type checking
pnpm typecheck
```

## Migration Notes

- Extracted from `@rhymix-ts/board` in SPEC-DOCUMENT-001
- `@rhymix-ts/board` now re-exports all document symbols for backward compatibility
- Category functionality will be moved from board to document in Slice C

## Related Packages

- `@rhymix-ts/board` — Board package that depends on document
- `@rhymix-ts/auth` — Authentication and authorization
- `@rhymix-ts/core` — Core framework types
