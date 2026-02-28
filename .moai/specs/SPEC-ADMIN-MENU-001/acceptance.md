---
spec_id: SPEC-ADMIN-MENU-001
title: Admin Menu System - Acceptance Criteria
created: 2026-02-28T12:30:00Z
status: Planned
---

# Acceptance Criteria: Admin Menu System

## Overview

This document defines the acceptance criteria for the Admin Menu System using Gherkin syntax (Given-When-Then) to ensure testable requirements.

---

## Feature: Dashboard Menu

### Scenario: Admin views dashboard menu
```gherkin
GIVEN I am logged in as an admin
WHEN I navigate to the admin panel
THEN I should see a "Dashboard" menu item
AND the menu item should have a dashboard icon
AND the menu item should be first in the list
```

### Scenario: Dashboard menu is active on dashboard page
```gherkin
GIVEN I am logged in as an admin
WHEN I navigate to "/admin"
THEN the "Dashboard" menu item should be highlighted
AND clicking it should navigate to the dashboard
```

---

## Feature: Members Menu Group

### Scenario: Admin views members menu group
```gherkin
GIVEN I am logged in as an admin
AND I have "member.access" permission
WHEN I navigate to the admin panel
THEN I should see a "Members" menu group
AND it should contain sub-items:
  | All Members |
  | Groups      |
  | Permissions |
  | Points      |
```

### Scenario: Members menu expands when active
```gherkin
GIVEN I am logged in as an admin
WHEN I navigate to "/admin/members"
THEN the "Members" menu group should be expanded
AND the "All Members" sub-item should be highlighted
```

### Scenario: Non-admin cannot see members menu
```gherkin
GIVEN I am logged in as a regular user
AND I do not have "member.access" permission
WHEN I navigate to the admin panel
THEN I should NOT see the "Members" menu group
```

---

## Feature: Content Menu Group

### Scenario: Admin views content menu with all items
```gherkin
GIVEN I am logged in as an admin
AND I have "content.access" permission
WHEN I navigate to the admin panel
THEN I should see a "Content" menu group
AND it should contain sub-items:
  | Boards         |
  | Pages          |
  | Documents      |
  | Comments       |
  | Media Library  |
  | Polls          |
  | Editor         |
  | Spam Filter    |
  | Trash          |
```

### Scenario: Content menu shows only permitted items
```gherkin
GIVEN I am logged in as a content editor
AND I have "board.admin" permission
BUT I do not have "spamfilter.admin" permission
WHEN I navigate to the admin panel
THEN I should see "Boards" in the Content menu
BUT I should NOT see "Spam Filter" in the Content menu
```

---

## Feature: Site Menu Group

### Scenario: Admin views site menu group
```gherkin
GIVEN I am logged in as an admin
AND I have "site.access" permission
WHEN I navigate to the admin panel
THEN I should see a "Site" menu group
AND it should contain sub-items:
  | Menus    |
  | Widgets  |
  | Layouts  |
  | Themes   |
```

---

## Feature: Notifications Menu Group

### Scenario: Admin views notifications menu when enabled
```gherkin
GIVEN I am logged in as an admin
AND I have "notification.access" permission
WHEN I navigate to the admin panel
THEN I should see a "Notifications" menu group
AND it should contain sub-items:
  | Mail/SMS/Push        |
  | Notification Center  |
```

### Scenario: Notifications menu hidden when disabled
```gherkin
GIVEN I am logged in as an admin
AND I do not have "notification.access" permission
WHEN I navigate to the admin panel
THEN I should NOT see the "Notifications" menu group
```

---

## Feature: Configuration Menu Group

### Scenario: Admin views configuration menu group
```gherkin
GIVEN I am logged in as an admin
AND I have "config.access" permission
WHEN I navigate to the admin panel
THEN I should see a "Configuration" menu group
AND it should contain sub-items:
  | General       |
  | Admin Setup   |
  | Filebox       |
  | Translations  |
  | Modules       |
  | Analytics     |
```

---

## Feature: Advanced Menu Group

### Scenario: Super admin views advanced menu
```gherkin
GIVEN I am logged in as a super admin
AND I have "advanced.access" permission
WHEN I navigate to the admin panel
THEN I should see an "Advanced" menu group
AND it should contain sub-items:
  | Easy Install        |
  | Installed Layouts   |
  | Installed Modules   |
```

### Scenario: Regular admin cannot see advanced menu
```gherkin
GIVEN I am logged in as a regular admin
AND I do not have "advanced.access" permission
WHEN I navigate to the admin panel
THEN I should NOT see the "Advanced" menu group
```

---

## Feature: Logs Menu

### Scenario: Admin views logs menu
```gherkin
GIVEN I am logged in as an admin
AND I have "logs.access" permission
WHEN I navigate to the admin panel
THEN I should see a "Logs" menu item
AND it should have a scroll icon
```

---

## Feature: Mobile Responsive Menu

### Scenario: Mobile user sees hamburger menu
```gherkin
GIVEN I am logged in as an admin
AND my viewport width is 768px (mobile)
WHEN I navigate to the admin panel
THEN I should see a hamburger menu icon in the top-left
AND the sidebar should be hidden
```

### Scenario: Mobile user opens menu
```gherkin
GIVEN I am logged in as an admin
AND my viewport width is 768px (mobile)
WHEN I click the hamburger menu icon
THEN the sidebar should slide in from the left
AND the hamburger icon should change to an X icon
AND an overlay should appear behind the sidebar
```

### Scenario: Mobile user closes menu by clicking overlay
```gherkin
GIVEN I am logged in as an admin
AND my viewport width is 768px (mobile)
AND the mobile menu is open
WHEN I click the overlay backdrop
THEN the sidebar should slide out to the left
AND the X icon should change back to a hamburger icon
AND the overlay should disappear
```

### Scenario: Mobile user closes menu by clicking menu item
```gherkin
GIVEN I am logged in as an admin
AND my viewport width is 768px (mobile)
AND the mobile menu is open
WHEN I click any menu item
THEN the sidebar should close
AND I should navigate to the selected page
```

---

## Feature: Active State Tracking

### Scenario: Parent menu highlighted when child is active
```gherkin
GIVEN I am logged in as an admin
WHEN I navigate to "/admin/members"
THEN the "Members" menu group should have active styling
AND the "All Members" sub-item should be highlighted
```

### Scenario: Only one parent expanded at a time
```gherkin
GIVEN I am logged in as an admin
AND I am viewing "/admin/members"
WHEN I navigate to "/admin/boards"
THEN the "Members" menu group should collapse
AND the "Content" menu group should expand
AND the "Boards" sub-item should be highlighted
```

---

## Feature: Locale-Aware Navigation

### Scenario: Korean user sees Korean menu
```gherkin
GIVEN I am logged in as an admin
AND my locale is set to "ko"
WHEN I navigate to the admin panel
THEN I should see menu items in Korean:
  | 대시보드    |
  | 회원       |
  | 콘텐츠     |
  | 사이트     |
  | 설정       |
```

### Scenario: Korean locale prefixes routes
```gherkin
GIVEN I am logged in as an admin
AND my locale is set to "ko"
WHEN I click on "회원 목록"
THEN I should navigate to "/ko/admin/members"
```

### Scenario: English locale uses default routes
```gherkin
GIVEN I am logged in as an admin
AND my locale is set to "en"
WHEN I click on "All Members"
THEN I should navigate to "/en/admin/members"
```

---

## Feature: Permission-Based Visibility

### Scenario: Menu item hidden without permission
```gherkin
GIVEN I am logged in as an admin
AND I do not have "point.admin" permission
WHEN I view the "Members" menu group
THEN I should NOT see the "Points" sub-item
```

### Scenario: Entire menu group hidden without any permission
```gherkin
GIVEN I am logged in as an admin
AND I do not have any "notification.*" permissions
WHEN I view the admin sidebar
THEN I should NOT see the "Notifications" menu group
```

### Scenario: Permission check is performant
```gherkin
GIVEN I am logged in as an admin
WHEN the menu renders
THEN permission checks should complete within 50ms
AND the menu should not flicker during load
```

---

## Feature: Sign Out Action

### Scenario: Admin signs out from sidebar
```gherkin
GIVEN I am logged in as an admin
WHEN I click the "Sign Out" button in the sidebar
THEN I should be logged out
AND I should be redirected to the sign-in page
AND the locale prefix should be preserved in the redirect
```

---

## Feature: Accessibility

### Scenario: Keyboard navigation
```gherkin
GIVEN I am logged in as an admin
WHEN I press the Tab key
THEN focus should move through menu items in logical order
AND I should be able to activate menu items with Enter key
```

### Scenario: Screen reader support
```gherkin
GIVEN I am logged in as an admin
AND I am using a screen reader
WHEN I navigate the menu
THEN each menu item should have an appropriate aria-label
AND expanded/collapsed state should be announced
AND current page should be announced as "current"
```

### Scenario: Color contrast
```gherkin
GIVEN I am viewing the admin sidebar
WHEN I check color contrast
THEN active menu items should have a contrast ratio of at least 4.5:1
AND inactive menu items should have a contrast ratio of at least 3:1
```

---

## Feature: Complete Menu Coverage

### Scenario: All ASIS menu items have TOBE routes
```gherkin
GIVEN the ASIS admin panel has 30 menu items
WHEN I compare with the TOBE admin panel
THEN all 30 menu items should have corresponding routes
AND no ASIS functionality should be missing
```

### Scenario: Missing routes show placeholder
```gherkin
GIVEN I am logged in as an admin
WHEN I navigate to a newly created route
THEN I should see a placeholder page
AND the page should indicate "Coming Soon"
AND the page should have the correct title
```

---

## Quality Gate Criteria

### TRUST 5 Validation

#### Tested
- [ ] Unit test coverage >= 80%
- [ ] All Gherkin scenarios automated
- [ ] E2E tests for critical paths
- [ ] Permission checking tested

#### Readable
- [ ] Menu item names are clear
- [ ] Korean translations are accurate
- [ ] Code comments explain permission logic
- [ ] Component structure is intuitive

#### Unified
- [ ] Consistent styling across all menu items
- [ ] Same icon library used throughout
- [ ] Uniform interaction patterns
- [ ] Consistent spacing and typography

#### Secured
- [ ] Permission checks on every menu item
- [ ] No unauthorized menu access
- [ ] Sign-out clears session properly
- [ ] RLS policies enforce data access

#### Trackable
- [ ] Navigation events logged
- [ ] Permission denials tracked
- [ ] Error reporting configured
- [ ] Analytics on menu usage

---

## Test Execution Plan

### Phase 1: Component Tests
- Test menu rendering
- Test permission filtering
- Test active state logic
- Test locale prefix generation

### Phase 2: Integration Tests
- Test full navigation flow
- Test permission system integration
- Test i18n integration
- Test mobile menu behavior

### Phase 3: E2E Tests
- Test complete admin workflows
- Test multi-language switching
- Test permission denial scenarios
- Test accessibility compliance

---

## Verification Checklist

- [ ] All 30 ASIS menu items implemented
- [ ] 7 menu groups with proper hierarchy
- [ ] 11 missing routes created
- [ ] Permission checking working
- [ ] Korean translations complete
- [ ] English translations complete
- [ ] Mobile menu responsive
- [ ] Active state tracking accurate
- [ ] Locale-aware routing working
- [ ] Sign-out functionality working
- [ ] Keyboard navigation working
- [ ] Screen reader support added
- [ ] Color contrast compliant
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Lighthouse score >= 90
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Documentation updated

---

## Sign-Off Requirements

### Development Sign-Off
- All code reviewed and approved
- All tests passing
- No known bugs

### QA Sign-Off
- All acceptance criteria met
- All Gherkin scenarios passing
- Accessibility audit passed

### Product Sign-Off
- Feature matches requirements
- UX meets expectations
- i18n quality verified

---

## References

- ASIS Admin Screenshot: `screenshots/admin-with-cookies.png`
- ASIS Menu JSON: `scripts/asis-admin-complete-2026-02-28T12-25-41.json`
- Current Sidebar: `components/admin/AdminSidebar.tsx`
- SPEC Document: `.moai/specs/SPEC-ADMIN-MENU-001/spec.md`
- Implementation Plan: `.moai/specs/SPEC-ADMIN-MENU-001/plan.md`
