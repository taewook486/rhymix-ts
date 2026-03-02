# UI/UX Design Specification: ASIS vs TOBE Analysis

## Document Overview

This document provides a comprehensive UI/UX design analysis comparing the ASIS (Rhymix PHP) and TOBE (Rhymix-TS Next.js) systems. The analysis covers visual structure, component architecture, and design patterns for migration planning.

---

## 1. Executive Summary

### 1.1 System Overview

| Aspect | ASIS (Rhymix PHP) | TOBE (Rhymix-TS) |
|--------|------------------|------------------|
| Framework | PHP (Custom MVC) | Next.js 15 (App Router) |
| Styling | CSS + Module Skins | Tailwind CSS + shadcn/ui |
| Component Library | Custom Templates | shadcn/ui (Radix-based) |
| Theme System | Skin-based | CSS Variables (Dark/Light) |
| Responsive | Mobile Skins (m.skins/) | Mobile-first Tailwind |
| Typography | System Default | Inter (Google Fonts) |

### 1.2 Design Maturity

- **ASIS**: Traditional server-rendered templates with table-based layouts, skin customization system
- **TOBE**: Modern component-based architecture with design tokens, responsive utilities, and accessibility support

---

## 2. Color Scheme Analysis

### 2.1 TOBE Design Tokens (globals.css)

```css
/* Light Theme */
--background: 0 0% 100%;           /* Pure White #FFFFFF */
--foreground: 222.2 84% 4.9%;      /* Near Black #0A0A0A */
--primary: 221.2 83.2% 53.3%;      /* Blue #2563EB */
--primary-foreground: 210 40% 98%; /* Light Gray #F8FAFC */
--secondary: 210 40% 96.1%;        /* Light Blue-Gray #F1F5F9 */
--muted: 210 40% 96.1%;            /* Light Gray #F1F5F9 */
--muted-foreground: 215.4 16.3% 46.9%; /* Gray #64748B */
--accent: 210 40% 96.1%;           /* Light Blue-Gray #F1F5F9 */
--destructive: 0 84.2% 60.2%;      /* Red #EF4444 */
--border: 214.3 31.8% 91.4%;       /* Light Border #E2E8F0 */
--ring: 221.2 83.2% 53.3%;         /* Focus Ring Blue #2563EB */
--radius: 0.5rem;                  /* Border Radius 8px */

/* Dark Theme */
--background: 222.2 84% 4.9%;      /* Near Black #0A0A0A */
--foreground: 210 40% 98%;         /* Light Gray #F8FAFC */
--primary: 217.2 91.2% 59.8%;      /* Lighter Blue #3B82F6 */
--primary-foreground: 222.2 47.4% 11.2%; /* Dark Blue #1E293B */
```

### 2.2 Color Palette Summary

| Category | Light Mode | Dark Mode | Usage |
|----------|-----------|-----------|-------|
| Background | White | Dark Navy | Page backgrounds |
| Foreground | Near Black | Light Gray | Text, content |
| Primary | Blue #2563EB | Light Blue | CTAs, links, focus |
| Secondary | Light Gray | Dark Blue | Cards, panels |
| Muted | Light Gray | Dark Blue | Subtle elements |
| Destructive | Red | Dark Red | Errors, delete |
| Border | Light Border | Dark Border | Dividers, inputs |

### 2.3 ASIS Color System

ASIS uses a skin-based approach where colors are defined per skin:
- Default skins use system colors
- No CSS custom properties
- Colors embedded in CSS files per module
- No centralized design token system

---

## 3. Typography Analysis

### 3.1 TOBE Typography

**Font Family**: Inter (Google Fonts)
```typescript
const inter = Inter({ subsets: ['latin'] })
```

**Font Sizes** (Tailwind Defaults):
| Class | Size | Usage |
|-------|------|-------|
| text-xs | 0.75rem (12px) | Small labels |
| text-sm | 0.875rem (14px) | Body small, descriptions |
| text-base | 1rem (16px) | Body text |
| text-lg | 1.125rem (18px) | Large body |
| text-xl | 1.25rem (20px) | Section headers |
| text-2xl | 1.5rem (24px) | Card titles |
| text-3xl | 1.875rem (30px) | Page titles |

**Font Weights**:
| Class | Weight | Usage |
|-------|--------|-------|
| font-normal | 400 | Body text |
| font-medium | 500 | Labels, navigation |
| font-semibold | 600 | Card titles, headings |
| font-bold | 700 | Page titles, emphasis |

### 3.2 ASIS Typography

- System default fonts (serif/sans-serif)
- No web font loading
- Font sizes defined inline in templates
- No consistent typographic scale

---

## 4. Spacing System

### 4.1 TOBE Spacing (Tailwind)

**Base Unit**: 0.25rem (4px)

| Class | Value | Usage |
|-------|-------|-------|
| p-2 | 0.5rem (8px) | Compact padding |
| p-4 | 1rem (16px) | Default padding |
| p-6 | 1.5rem (24px) | Card padding |
| p-8 | 2rem (32px) | Section padding |
| py-8 | 2rem (32px) vertical | Page sections |
| px-4 | 1rem (16px) horizontal | Container padding |
| gap-2 | 0.5rem (8px) | Tight gaps |
| gap-4 | 1rem (16px) | Default gaps |
| gap-6 | 1.5rem (24px) | Section gaps |
| space-y-1.5 | 0.375rem (6px) | Card header spacing |
| space-y-4 | 1rem (16px) | Form spacing |

**Container**:
```typescript
container: {
  center: true,
  padding: '2rem',
  screens: {
    '2xl': '1400px',
  },
}
```

### 4.2 ASIS Spacing

- No systematic spacing scale
- Spacing defined in pixels per template
- Inconsistent across modules and skins

---

## 5. Layout Structure Analysis

### 5.1 TOBE Layout Architecture

```
RootLayout (app/layout.tsx)
├── ConditionalHeader
│   └── Navigation (sticky top, border-b)
│       ├── Logo
│       ├── Desktop Nav (hidden on mobile)
│       ├── User Menu / Auth Links
│       └── Mobile Menu Button
├── {children}
└── Toaster
```

**Navigation Component Structure**:
- Sticky header with backdrop blur
- Responsive: Desktop (horizontal nav) / Mobile (hamburger menu)
- User dropdown menu with profile, settings, sign out
- Admin link visible for admin role users

**Page Layouts**:
```
container mx-auto py-8 px-4
├── Page Header (mb-8)
│   ├── Title (text-3xl font-bold)
│   └── Description (text-muted-foreground mt-2)
├── Content Grid (grid gap-6 lg:grid-cols-3)
│   ├── Main Content (lg:col-span-2)
│   └── Sidebar (space-y-6)
└── Footer Components
```

### 5.2 ASIS Layout Architecture

**Faceoff Layout Structure**:
```html
<div id="xe" class="[type] [align]">
    <div id="container" class="[column]">
        <div id="header">Logo/Title</div>
        <div id="neck">Top navigation</div>
        <div id="body">
            <div id="content">Module Content</div>
            <div class="extension e1">Widget Zone 1</div>
            <div class="extension e2">Widget Zone 2</div>
        </div>
        <div id="knee">Bottom widgets</div>
        <div id="footer">Copyright</div>
    </div>
</div>
```

**Key Differences**:
| Aspect | ASIS | TOBE |
|--------|------|------|
| Layout Method | Fixed ID-based | Flexbox/Grid |
| Responsive | Separate mobile skins | Mobile-first CSS |
| Widget Zones | Named extensions | Component-based |
| Content Area | Single div | Grid system |

---

## 6. Component Architecture

### 6.1 TOBE Component Hierarchy

**shadcn/ui Components Used**:
| Component | Usage Location |
|-----------|---------------|
| Card | Board list, Admin dashboard, Quick links |
| Button | Navigation, Forms, Actions |
| Input | Forms, Search |
| Label | Form fields |
| Select | Filters, Categories |
| Checkbox | Options, Permissions |
| Dialog | Modals, Confirmations |
| Dropdown | User menu, Actions |
| Toast | Notifications |
| Avatar | User profiles |

**Custom Components**:
| Component | Location | Purpose |
|-----------|----------|---------|
| Navigation | components/layout/Navigation.tsx | Site header with nav |
| ThemeSwitcher | components/layout/ThemeSwitcher.tsx | Dark/Light toggle |
| ConditionalHeader | components/layout/ConditionalHeader.tsx | Context-aware header |
| NoticeWidget | components/widgets/NoticeWidget.tsx | Notice display |
| RecentPostsWidget | components/widgets/RecentPostsWidget.tsx | Post list |
| StatCard | components/admin/StatCard.tsx | Admin statistics |
| RecentActivity | components/admin/RecentActivity.tsx | Activity feed |
| SignInForm | components/member/SignInForm.tsx | Authentication |
| OAuthButtons | components/member/OAuthButtons.tsx | Social login |
| DocumentList | components/document/DocumentList.tsx | Document management |

### 6.2 ASIS Component Templates

**Board Module Templates**:
| Template | Purpose |
|----------|---------|
| list.html | Document list view |
| _list.html | List elements |
| read.html | Document read view |
| _read.html | Read elements |
| write_form.html | Write/edit form |
| comment_form.html | Comment form |
| delete_form.html | Delete confirmation |

**Member Module Templates**:
| Template | Purpose |
|----------|---------|
| signup_form.html | Registration |
| login_form.html | Authentication |
| modify_info.html | Profile editing |

---

## 7. Interactive Elements

### 7.1 TOBE Interactive Patterns

**Navigation**:
- Desktop: Horizontal nav with dropdown on hover
- Mobile: Hamburger menu with slide-down panel
- Active state: Primary color text
- Hover: Background accent

**Cards**:
- Hover: border-primary/50, bg-accent/50
- Transition: transition-colors
- Clickable: Entire card wrapped in Link

**Buttons**:
```typescript
// Button Variants
default: "bg-primary text-primary-foreground hover:bg-primary/90"
destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
outline: "border border-input bg-background hover:bg-accent"
secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
ghost: "hover:bg-accent hover:text-accent-foreground"
link: "text-primary underline-offset-4 hover:underline"

// Button Sizes
default: "h-10 px-4 py-2"
sm: "h-9 rounded-md px-3"
lg: "h-11 rounded-md px-8"
icon: "h-10 w-10"
```

**Forms**:
- Input focus: ring-2 ring-ring ring-offset-2
- Validation: Real-time feedback
- Error states: Destructive color
- Disabled: opacity-50 pointer-events-none

**Dropdowns**:
- Trigger: Hover on desktop
- Panel: opacity-0 invisible -> opacity-100 visible
- Transition: transition-all
- Position: absolute with shadow-lg

### 7.2 ASIS Interactive Patterns

- Form submissions via page reload
- Table-based layout for lists
- No client-side state management
- Traditional server-side pagination
- Modal dialogs via JavaScript

---

## 8. Page-by-Page Analysis

### 8.1 Homepage

**TOBE Homepage Structure**:
```
container mx-auto py-8 px-4
├── NoticeWidget (mb-8)
│   └── Notice list with "more" link
├── Welcome Section (mb-8)
│   ├── Title (text-3xl font-bold mb-2)
│   └── Subtitle (text-muted-foreground)
├── Main Grid (grid gap-6 lg:grid-cols-3)
│   ├── RecentPostsWidget (lg:col-span-2)
│   │   ├── Post cards with thumbnails
│   │   └── "View all" link
│   └── Sidebar
│       ├── Quick Links Card
│       │   ├── Board link
│       │   └── Documents link
│       └── Site Stats Card
│           ├── Posts count
│           └── Notices count
```

**ASIS Homepage Structure**:
```
Faceoff Layout
├── Header
│   └── Logo, Navigation
├── Content Area
│   ├── Widget: Content (recent posts)
│   ├── Widget: Login Info
│   └── Widget: Counter Status
└── Footer
```

### 8.2 Board List Page

**TOBE Board List**:
```
container mx-auto py-8
├── Page Header
│   ├── Title (text-3xl font-bold)
│   └── Description (text-muted-foreground mt-2)
└── Board Grid (grid gap-4 md:grid-cols-2 lg:grid-cols-3)
    └── Card per board
        ├── CardHeader
        │   ├── Icon (MessageSquare)
        │   └── Title
        ├── CardDescription
        └── CardContent
            ├── Posts count
            └── Active users
```

**ASIS Board List**:
```
Table Layout
├── Table Header
│   ├── No, Title, Author, Date, Views, Replies, Recommend
├── Table Body
│   └── Rows with document data
└── Pagination
```

### 8.3 Login Page

**TOBE Sign In**:
```
Card (max-w-md centered)
├── CardHeader
│   ├── Title (CardTitle)
│   └── Description (CardDescription)
├── CardContent (space-y-4)
│   ├── OAuthButtons (Google, GitHub, etc.)
│   ├── OAuthDivider
│   ├── SignInForm
│   │   └── Email/Password fields
│   ├── Reset Password Link
│   └── Sign Up Link
```

**ASIS Login**:
```
login_form.html
├── User ID input
├── Password input
├── Auto-login checkbox
└── Find account links
```

### 8.4 Admin Dashboard

**TOBE Admin Page**:
```
container mx-auto py-8
├── Header (space-y-6)
│   ├── Title (text-3xl font-bold)
│   └── Description (text-muted-foreground)
├── Stats Grid (grid gap-4 md:grid-cols-2 lg:grid-cols-4)
│   ├── StatCard: Total Users
│   ├── StatCard: Total Posts
│   ├── StatCard: Comments
│   └── StatCard: Boards
├── Quick Actions (grid gap-4 md:grid-cols-2 lg:grid-cols-3)
│   ├── Create Board Card
│   ├── New Page Card
│   └── Manage Menus Card
└── Bottom Grid (lg:grid-cols-2)
    ├── RecentActivity
    └── Admin Menu Sections
        ├── Member Management
        └── Configuration
```

---

## 9. Responsive Design

### 9.1 TOBE Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| sm | 640px | Small screens |
| md | 768px | Tablets |
| lg | 1024px | Desktops |
| xl | 1280px | Large desktops |
| 2xl | 1400px | Container max |

**Responsive Patterns**:
```
Navigation:
  Mobile: Hamburger menu (md:hidden)
  Desktop: Horizontal nav (hidden md:flex)

Grids:
  Mobile: Single column (default)
  Tablet: 2 columns (md:grid-cols-2)
  Desktop: 3+ columns (lg:grid-cols-3)

Sidebar:
  Mobile: Stacked (default)
  Desktop: Side-by-side (lg:col-span-2)
```

### 9.2 ASIS Responsive

- Separate mobile skins (m.skins/)
- Device detection via User-Agent
- No CSS breakpoints
- Touch-optimized templates for mobile

---

## 10. Accessibility

### 10.1 TOBE Accessibility Features

- **Semantic HTML**: Proper heading hierarchy, landmarks
- **ARIA**: aria-label on interactive elements
- **Focus Management**: ring-2 ring-ring ring-offset-2
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: sr-only utility for hidden labels
- **Color Contrast**: WCAG AA compliant via shadcn/ui

### 10.2 ASIS Accessibility

- Basic semantic structure
- Limited ARIA support
- Table-based layouts
- No focus management system

---

## 11. Widget System Comparison

### 11.1 TOBE Widgets

| Widget | Location | Features |
|--------|----------|----------|
| NoticeWidget | components/widgets/ | Notice list, thumbnails, "more" link |
| RecentPostsWidget | components/widgets/ | Post list, thumbnails, excerpts |
| LoginFormWidget | components/widgets/widgets/ | Login form |
| CalendarWidget | components/widgets/widgets/ | Calendar display |
| BannerWidget | components/widgets/widgets/ | Banner rotation |
| LatestPostsWidget | components/widgets/widgets/ | Latest posts |
| PopularPostsWidget | components/widgets/widgets/ | Popular posts |

### 11.2 ASIS Widgets

| Widget | Purpose |
|--------|---------|
| content | Content display |
| counter_status | Traffic display |
| language_select | Language switcher |
| login_info | User login status |
| mcontent | Mobile content |
| pollWidget | Poll display |

---

## 12. Design System Recommendations

### 12.1 Migration Considerations

1. **Color Tokens**: ASIS has no centralized system; adopt TOBE CSS variables
2. **Typography**: Migrate from system fonts to Inter for consistency
3. **Spacing**: Implement Tailwind spacing scale systematically
4. **Components**: Replace table layouts with shadcn/ui Card components
5. **Responsive**: Merge mobile skins into responsive CSS

### 12.2 Design Principles for Migration

1. **Preserve Information Architecture**: Keep ASIS content structure
2. **Modernize Visual Design**: Apply TOBE design tokens
3. **Improve Accessibility**: Add ARIA, focus management
4. **Enhance Responsiveness**: Replace mobile skins with breakpoints
5. **Component Reusability**: Build atomic components from ASIS templates

---

## 13. Implementation Priority

### Phase 1: Core Components
- Navigation (responsive)
- Card components
- Button variants
- Form elements

### Phase 2: Page Templates
- Homepage layout
- Board list/detail
- Document pages
- Member pages

### Phase 3: Advanced Features
- Admin dashboard
- Widget system
- Theme customization
- Accessibility audit

---

## Appendix A: File References

### TOBE Key Files
- `app/globals.css` - Design tokens
- `tailwind.config.ts` - Tailwind configuration
- `components/layout/Navigation.tsx` - Main navigation
- `components/ui/card.tsx` - Card component
- `components/ui/button.tsx` - Button component
- `app/[locale]/(main)/home/page.tsx` - Homepage
- `app/[locale]/(main)/board/page.tsx` - Board list
- `app/(auth)/signin/page.tsx` - Sign in page
- `app/(admin)/admin/page.tsx` - Admin dashboard

### ASIS Key Files
- `modules/board/skins/` - Board templates
- `modules/member/skins/` - Member templates
- `modules/layout/` - Layout system
- `widgets/` - Widget templates

---

Document Version: 1.0.0
Created: 2026-03-01
Author: expert-frontend agent
Language: Korean (user-facing), English (technical terms)
