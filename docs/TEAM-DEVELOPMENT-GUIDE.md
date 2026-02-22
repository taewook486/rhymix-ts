# Team Development Setup Guide

## Rhymix TS Conversion Project

**Created:** 2026-02-22
**Purpose:** Guide for setting up parallel team development

---

## Prerequisites

### Environment Requirements

- Node.js 20+
- pnpm 9+ (recommended) or npm 10+
- Docker Desktop (for local Rhymix PHP)
- VS Code with recommended extensions

### VS Code Extensions

```
- dbaeumer.vscode-eslint
- esbenp.prettier-vscode
- bradlc.vscode-tailwindcss
- ms-python.python
- ms-vscode.sublime-keybindings
```

---

## Repository Structure

```
rhymix-ts/
├── .moai/                    # MoAI configuration
│   ├── specs/               # Specification documents
│   │   └── SPEC-RHYMIX-001/
│   └── config/              # Project configuration
├── docs/                    # Project documentation
│   ├── ANALYSIS-RHYMIX-ORIGINAL.md
│   ├── REQUIREMENTS-TRACEABILITY.md
│   └── IMPLEMENTATION-PLAN.md
├── app/                     # Next.js 16 App Router
├── components/              # React components
├── lib/                     # Utilities
├── supabase/                # Database migrations
└── public/                  # Static assets
```

---

## Team Structure

### Recommended Team Composition (3-4 Developers)

**Team Lead (MoAI Orchestrator)**
- Coordinates work distribution
- Manages dependencies
- Quality gate validation
- Merge conflict resolution

**Developer 1 (Backend Focus)**
- Server Actions
- Database schema
- API endpoints
- Migration scripts

**Developer 2 (Frontend Focus)**
- React components
- UI/UX implementation
- State management
- Client features

**Developer 3 (Full Stack)**
- Complete features
- Integration testing
- Bug fixes
- Documentation

**Developer 4 (QA/DevOps)**
- Test development
- CI/CD pipeline
- Performance monitoring

---

## Work Distribution Strategy

### File Ownership Boundaries

| Developer | Primary Ownership | Files |
|-----------|------------------|-------|
| Dev 1 (Backend) | Server Actions | `app/actions/*.ts` |
| Dev 1 (Backend) | Database | `supabase/migrations/*.sql` |
| Dev 1 (Backend) | Utilities | `lib/supabase/*.ts`, `lib/utils.ts` |
| Dev 2 (Frontend) | Admin UI | `components/admin/*.tsx` |
| Dev 2 (Frontend) | Public UI | `components/public/*.tsx` |
| Dev 2 (Frontend) | Layout | `components/layout/*.tsx` |
| Dev 3 (Full Stack) | Features | `app/(admin)/**/*.tsx` + actions |
| Dev 3 (Full Stack) | Integration | Cross-cutting concerns |
| Dev 4 (QA) | Tests | `**/*.test.ts`, `**/*.spec.ts` |
| Dev 4 (DevOps) | CI/CD | `.github/workflows/*.yml` |

### Communication Protocol

**Daily Standup Format:**
1. What I completed yesterday
2. What I'm working on today
3. Blockers or dependencies
4. Estimated completion

**Merge Protocol:**
1. Pull latest from main before starting
2. Create feature branch from main
3. Complete work with tests
4. Create PR with description
5. Request review from team lead
6. Address feedback
7. Merge after approval

---

## Phase 1 Tasks (Week 1-2)

### Priority 1.1: Media Management

**Backend Tasks (Dev 1):**
- [ ] Create `app/actions/media.ts`
  - `uploadFile(formData)` - Validate, upload to Supabase Storage, save to DB
  - `deleteFile(fileId)` - Permission check, delete from Storage and DB
  - `getFiles(filters)` - Query with pagination
  - `updateFile(fileId, data)` - Update metadata

**Frontend Tasks (Dev 2):**
- [ ] Create `components/admin/MediaBrowser.tsx`
  - Grid/list view toggle
  - File preview modal
  - Folder navigation
- [ ] Create `components/admin/MediaUploader.tsx`
  - Drag & drop zone
  - Progress indicator
  - File type validation
- [ ] Update `app/(admin)/admin/media/page.tsx`
  - Connect to real data
  - Implement pagination

**Integration Tasks (Dev 3):**
- [ ] Connect uploader to backend
- [ ] Handle file selection for posts
- [ ] Implement file manager dialog

### Priority 1.2: Editor Integration

**Backend Tasks (Dev 1):**
- [ ] Create `app/actions/editor.ts`
  - `saveAutosave(targetType, targetId, content)` - Save draft
  - `getAutosave(targetType, targetId)` - Retrieve draft
  - `deleteAutosave(autosaveId)` - Clear draft

**Frontend Tasks (Dev 2):**
- [ ] Install and configure Tiptap
  ```bash
  pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-image
  ```
- [ ] Create `components/editor/RichTextEditor.tsx`
  - Toolbar with formatting options
  - Image upload button
  - Link insertion
  - Code block support
- [ ] Create `components/editor/EditorToolbar.tsx`
  - Bold, italic, underline, strikethrough
  - Headings (H1-H6)
  - Lists (ordered, unordered)
  - Undo/redo

**Integration Tasks (Dev 3):**
- [ ] Integrate editor into post creation
- [ ] Integrate editor into page creation
- [ ] Implement autosave functionality
- [ ] Handle image uploads from editor

### Priority 1.3: Menu System

**Backend Tasks (Dev 1):**
- [ ] Create `app/actions/menu.ts`
  - `createMenu(data)` - Create new menu
  - `updateMenu(menuId, data)` - Update menu
  - `deleteMenu(menuId)` - Delete menu
  - `createMenuItem(data)` - Create menu item
  - `updateMenuItem(itemId, data)` - Update item
  - `deleteMenuItem(itemId)` - Delete item
  - `reorderMenuItems(menuId, items)` - Reorder items

**Frontend Tasks (Dev 2):**
- [ ] Create `components/admin/MenuEditor.tsx`
  - Tree view of menu items
  - Drag-and-drop reordering
  - Inline editing
- [ ] Create `components/admin/MenuItemEditor.tsx`
  - Add/edit menu item form
  - Type selection (link, divider, header)
  - Role selection
- [ ] Create `components/layout/Navigation.tsx`
  - Display menu on frontend
  - Active state highlighting
  - Mobile responsive menu

**Integration Tasks (Dev 3):**
- [ ] Connect menu editor to backend
- [ ] Implement menu preview
- [ ] Add menu to layout configuration
- [ ] Test menu permissions

---

## Git Workflow

### Branch Naming

```
feature/media-upload
feature/editor-integration
feature/menu-system
fix/board-creation
hotfix/security-patch
```

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Adding tests
- `docs`: Documentation
- `chore`: Maintenance

Examples:
```
feat(media): implement file upload action
- Add uploadFile server action
- Integrate with Supabase Storage
- Add file metadata to database

fix(editor): resolve autosave race condition
test(menu): add menu CRUD tests
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Test
- [ ] Docs

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Browser testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

---

## Development Commands

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Start Docker (Rhymix PHP)
cd C:/project/rhymix
docker-compose up -d

# Run tests
pnpm test

# Run linting
pnpm lint

# Run type checking
pnpm type-check
```

### Database

```bash
# Apply migrations
npx supabase db push

# Reset database
npx supabase db reset

# Generate types
npx supabase gen types typescript
```

---

## Quality Standards

### Code Review Checklist

- [ ] No console.log statements
- [ ] Proper error handling
- [ ] TypeScript strict mode compliance
- [ ] Accessible UI (ARIA labels)
- [ ] Responsive design
- [ ] No hardcoded values
- [ ] Proper comments for complex logic

### Testing Requirements

- **Unit Tests:** 80%+ coverage for business logic
- **Integration Tests:** Critical user flows
- **E2E Tests:** Authentication, CRUD operations

---

## Progress Tracking

### Daily Update Format

```markdown
## [Date] - [Developer Name]

### Completed
- [Task 1]
- [Task 2]

### In Progress
- [Task 3] (50% complete)

### Blocked
- None (or describe blocker)

### Next
- [Task 4]
```

### Weekly Review

1. Review completed tasks
2. Update progress in REQUIREMENTS-TRACEABILITY.md
3. Adjust priorities if needed
4. Plan next week's tasks

---

## Troubleshooting

### Common Issues

**Issue:** Supabase connection error
**Solution:** Check `.env.local` has correct values

**Issue:** Type errors after migration
**Solution:** Run `npx supabase gen types typescript`

**Issue:** Merge conflicts
**Solution:** Contact team lead, don't force push

**Issue:** Tests failing locally but passing in CI
**Solution:** Check Node version, clear cache

---

## Contact Information

**Team Lead:** [To be assigned]
**Project Channel:** [#rhymix-ts]
**Issue Tracker:** [GitHub Issues]

---

**Document Version:** 1.0
**Last Updated:** 2026-02-22
