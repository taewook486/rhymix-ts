# Requirements Supplement: Browser-Based Visual Comparison

> Document ID: SPEC-RHYMIX-001-SUPPLEMENT
> Created: 2026-03-01
> Source: Browser comparison between ASIS (http://localhost/) and TOBE (http://localhost:3000/)
> Purpose: Frontend-specific requirements to bridge visual gap between ASIS and TOBE

---

## 1. Navigation Structure Requirements

### REQ-NAV-001 (Ubiquitous)
The system shall display a navigation menu in the header with the following items:
- Welcome (link to homepage)
- Free Board (link to /ko/boards)
- Q&A (link to /ko/qna)
- Notice (link to /ko/notice)

### REQ-NAV-002 (Event-Driven)
WHEN a user clicks a navigation item, THEN the system shall navigate to the corresponding page and update active state indicator.

### REQ-NAV-003 (State-Driven)
IF the current page matches a navigation item, THEN the system shall highlight that item with visual distinction (color, underline, or bold).

### REQ-NAV-004 (Event-Driven)
WHEN on mobile viewport, THEN the system shall collapse navigation into hamburger menu with slide-out drawer.

---

## 2. Homepage Visual Requirements

### REQ-HOME-001 (Ubiquitous)
The system shall display a visual hero section on the homepage with either:
- Swiper-based image slider (4 slides), OR
- Large hero image with overlay text

### REQ-HOME-002 (Event-Driven)
WHEN the hero slider advances, THEN the system shall transition smoothly with fade or slide animation (duration: 500ms).

### REQ-HOME-003 (State-Driven)
IF JavaScript is disabled, THEN the system shall display the first slide as static hero image.

### REQ-HOME-004 (Ubiquitous)
The system shall display a Welcome Guide section below the hero with:
- "Build Your Site" subsection (6 guide items)
- "Get Involved" subsection (4 community links)

### REQ-HOME-005 (Event-Driven)
WHEN a guide item is clicked, THEN the system shall navigate to the corresponding documentation or feature page.

---

## 3. Login Page Requirements

### REQ-LOGIN-001 (Ubiquitous)
The system shall provide login page accessible at both /ko/signin and /ko/members/login (legacy compatibility redirect).

### REQ-LOGIN-002 (Ubiquitous)
The login form shall include:
- User ID input field (with placeholder text)
- Password input field (masked)
- "Remember me" checkbox option
- Login button
- Links to: ID/PW Recovery, Signup

### REQ-LOGIN-003 (Event-Driven)
WHEN user submits login form, THEN the system shall:
1. Validate credentials via Supabase Auth
2. On success: Redirect to originally requested page or homepage
3. On failure: Display error message without page refresh

### REQ-LOGIN-004 (State-Driven)
IF "Remember me" is checked, THEN the system shall extend session duration to 30 days.

### REQ-LOGIN-005 (Ubiquitous)
The login page shall include CSRF protection token in form submission.

---

## 4. Board List Page Requirements

### REQ-BOARD-001 (Ubiquitous)
The system shall display board list page at /ko/boards with:
- Sub-header with board name and background image
- Table layout: Number | Title | Author | Date | View Count
- Write button (top right)
- Tag button (optional)
- Search form (bottom)

### REQ-BOARD-002 (Event-Driven)
WHEN user clicks "Write" button, THEN the system shall navigate to write page (/ko/boards/write).

### REQ-BOARD-003 (Event-Driven)
WHEN user performs search, THEN the system shall filter posts by search term and display results in same table format.

### REQ-BOARD-004 (State-Driven)
IF user is not logged in, THEN the system shall display login prompt instead of write page.

### REQ-BOARD-005 (Event-Driven)
WHEN user clicks column header (Date, View Count), THEN the system shall sort posts by that column in descending order.

### REQ-BOARD-006 (Ubiquitous)
The system shall display pagination controls when posts exceed 20 items per page.

---

## 5. Sidebar Widget Requirements

### REQ-WIDGET-001 (Ubiquitous)
The system shall display a login widget in sidebar when user is not authenticated with:
- Welcome message for guests
- ID input field
- Password input field
- "Remember me" checkbox
- Login button
- Links to ID/PW Recovery, Signup

### REQ-WIDGET-002 (State-Driven)
IF user is authenticated, THEN the system shall display member widget with:
- User display name
- Profile link
- Settings link
- Logout button

### REQ-WIDGET-003 (Ubiquitous)
The system shall display "Recent Posts" widget showing 5 most recent posts across all boards.

### REQ-WIDGET-004 (Ubiquitous)
The system shall display "Notices" widget showing 3 most recent notice posts.

### REQ-WIDGET-005 (Event-Driven)
WHEN a post in Recent Posts or Notices widget is clicked, THEN the system shall navigate to that post.

---

## 6. Page Layout Requirements

### REQ-LAYOUT-001 (Ubiquitous)
The system shall implement responsive layout:
- Desktop: 3-column (sidebar | content | sidebar)
- Tablet: 2-column (content | sidebar)
- Mobile: 1-column (stacked)

### REQ-LAYOUT-002 (Ubiquitous)
The system shall display sub-header on board and content pages with:
- Page title
- Background image or gradient
- Breadcrumb navigation

### REQ-LAYOUT-003 (State-Driven)
IF page has no specific sub-header configuration, THEN the system shall display default gradient background.

### REQ-LAYOUT-004 (Ubiquitous)
The footer shall include links to:
- Terms of Service
- Privacy Policy

---

## 7. Icon System Requirements

### REQ-ICON-001 (Optional)
WHERE icons are needed, the system shall use Lucide icons (shadcn/ui default) for consistency.

### REQ-ICON-002 (Optional)
WHERE XEICON compatibility is required for legacy themes, the system shall provide XEICON mapping layer.

---

## 8. Accessibility Requirements

### REQ-A11Y-001 (Ubiquitous)
The system shall include "Skip to content" link at top of page for keyboard navigation.

### REQ-A11Y-002 (Ubiquitous)
All form inputs shall have associated label elements (visible or aria-label).

### REQ-A11Y-003 (Ubiquitous)
Navigation menus shall use semantic HTML (nav, ul, li) with aria-current for active items.

### REQ-A11Y-004 (Ubiquitous)
Color contrast ratio shall meet WCAG 2.1 AA standard (4.5:1 for normal text).

---

## 9. Performance Requirements

### REQ-PERF-001 (Ubiquitous)
Initial page load shall complete within 3 seconds on 3G connection.

### REQ-PERF-002 (Ubiquitous)
Time to Interactive (TTI) shall be under 5 seconds.

### REQ-PERF-003 (State-Driven)
IF hero slider is implemented, THEN images shall be lazy-loaded and optimized (WebP format, responsive srcset).

---

## 10. SEO Requirements

### REQ-SEO-001 (Ubiquitous)
All pages shall have unique meta title and description.

### REQ-SEO-002 (Ubiquitous)
Open Graph tags shall be present for social sharing:
- og:title
- og:description
- og:image
- og:url

### REQ-SEO-003 (Ubiquitous)
Structured data (JSON-LD) shall be present for:
- Organization
- WebSite
- BreadcrumbList

---

## Implementation Priority

### Phase 1: Critical (Week 1)
1. REQ-NAV-001: Navigation menu
2. REQ-BOARD-001: Board list page
3. REQ-LOGIN-001: Login route redirect
4. REQ-HOME-001: Hero visual section

### Phase 2: High (Week 2)
5. REQ-LOGIN-002: Login form with remember me
6. REQ-WIDGET-001,002: Login/Member widget
7. REQ-BOARD-002,003,005: Board write, search, sort
8. REQ-HOME-004: Welcome guide section

### Phase 3: Medium (Week 3)
9. REQ-WIDGET-003,004: Recent posts and notices widgets
10. REQ-LAYOUT-002: Sub-header with background
11. REQ-A11Y-001-004: Accessibility improvements
12. REQ-SEO-001-003: SEO optimization

---

## Test Scenarios

### Navigation Tests
```gherkin
Feature: Navigation Menu

Scenario: Display navigation items
  Given user is on any page
  When the page loads
  Then navigation should show "Welcome", "Free Board", "Q&A", "Notice"
  And current page should be highlighted

Scenario: Mobile navigation
  Given viewport width is 375px
  When page loads
  Then hamburger menu icon should be visible
  When user clicks hamburger icon
  Then navigation drawer should slide in from right
```

### Login Tests
```gherkin
Feature: Login Page

Scenario: Legacy login route redirect
  Given user navigates to /ko/members/login
  When page loads
  Then user should be redirected to /ko/signin

Scenario: Remember me functionality
  Given user is on login page
  When user checks "Remember me"
  And submits valid credentials
  Then session should persist for 30 days
```

### Board List Tests
```gherkin
Feature: Board List Page

Scenario: Display board list
  Given user navigates to /ko/boards
  When page loads
  Then board list table should display
  And "Write" button should be visible
  And search form should be present

Scenario: Sort by view count
  Given user is on board list page
  When user clicks "View Count" column header
  Then posts should be sorted by view count descending
```

---

## Acceptance Criteria Summary

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| REQ-NAV-001 | Navigation displays 4 items, matches ASIS structure |
| REQ-BOARD-001 | Board list page loads at /ko/boards without 404 |
| REQ-LOGIN-001 | /ko/members/login redirects to /ko/signin |
| REQ-HOME-001 | Hero section displays visual slider or image |
| REQ-WIDGET-001 | Login widget displays in sidebar for guests |
| REQ-WIDGET-002 | Member widget displays for authenticated users |
| REQ-LAYOUT-001 | Responsive breakpoints work at 768px, 1024px |

---

**Next Steps:** Use these requirements to update SPEC-RHYMIX-001 implementation plan with specific frontend tasks.
