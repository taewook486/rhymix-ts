/**
 * SelectorPane.test.tsx — Unit tests for SelectorPane component.
 *
 * SPEC-THEME-POLISH-001 REQ-THEME-POLISH-062.
 * Theme list rendering, selection state, AssignScopeDialog trigger.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectorPane } from './SelectorPane';

// Mock helpers
vi.mock('@/lib/theme/admin-helpers', () => ({
  getLayoutsForTheme: vi.fn(() =>
    Promise.resolve([
      { id: 'layout1', name: 'default', title: 'Default Layout' },
      { id: 'layout2', name: 'blog', title: 'Blog Layout' },
    ])
  ),
  getSkinsForLayout: vi.fn(() =>
    Promise.resolve([
      { id: 'skin1', name: 'default', title: 'Default Skin' },
      { id: 'skin2', name: 'blue', title: 'Blue Skin' },
    ])
  ),
}));

// Mock actions
vi.mock('@/app/admin/site/design/actions', () => ({
  assignTheme: vi.fn(() => Promise.resolve({ success: true })),
  assignLayout: vi.fn(() => Promise.resolve({ success: true })),
  assignSkin: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('SelectorPane', () => {
  const mockThemes = [
    {
      id: 'theme1',
      name: 'default',
      displayName: 'Default Theme',
      status: 'INSTALLED',
      version: '1.0.0',
      author: null,
      parent: null,
      manifest: {},
      tokensSchema: {},
      installedAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      layouts: [],
    },
    {
      id: 'theme2',
      name: 'blue',
      displayName: 'Blue Theme',
      status: 'INSTALLED',
      version: '1.0.0',
      author: null,
      parent: null,
      manifest: {},
      tokensSchema: {},
      installedAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      layouts: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Renders theme list', () => {
    render(<SelectorPane themes={mockThemes as any} siteId={1} />);

    expect(screen.getByText('Default Theme')).toBeInTheDocument();
    expect(screen.getByText('Blue Theme')).toBeInTheDocument();
    expect(screen.getByText('테마')).toBeInTheDocument();
  });

  it('2. Click theme → selectedThemeId updates', async () => {
    render(<SelectorPane themes={mockThemes as any} siteId={1} />);

    const blueTheme = screen.getByText('Blue Theme');
    await userEvent.click(blueTheme);

    // Check icon appears (Check icon from lucide-react)
    await waitFor(() => {
      const checkIcon = blueTheme.parentElement?.querySelector('svg');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  it('3. "적용" button opens AssignScopeDialog', async () => {
    render(<SelectorPane themes={mockThemes as any} siteId={1} />);

    // Click theme first
    const blueTheme = screen.getByText('Blue Theme');
    await userEvent.click(blueTheme);

    // Click "적용" button
    await waitFor(async () => {
      const applyButton = await screen.findByRole('button', { name: '적용' });
      expect(applyButton).toBeInTheDocument();
      await userEvent.click(applyButton);
    });

    // Check dialog opens
    await waitFor(() => {
      expect(screen.getByText(/테마 적용 범위/i)).toBeInTheDocument();
      expect(screen.getAllByText(/모듈 인스턴스/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/도메인/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/사이트/i).length).toBeGreaterThan(0);
    });
  });
});
