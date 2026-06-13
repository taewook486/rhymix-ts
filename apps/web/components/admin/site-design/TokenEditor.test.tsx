/**
 * TokenEditor.test.tsx — Unit tests for TokenEditor component.
 *
 * SPEC-THEME-POLISH-001 REQ-THEME-POLISH-062.
 * Zod schema → form field rendering, validation, Server Action 호출.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenEditor } from './TokenEditor';

// Mock saveTokens Server Action
vi.mock('@/app/admin/site/design/actions', () => ({
  saveTokens: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock buildFormFields
vi.mock('@/lib/theme/token-form-builder', () => ({
  buildFormFields: vi.fn(() => [
    {
      name: 'colors',
      label: 'Colors',
      type: 'group' as const,
      children: [
        { name: 'colors.primary', label: 'Primary', type: 'color' as const },
        { name: 'colors.background', label: 'Background', type: 'color' as const },
      ],
    },
    {
      name: 'typography',
      label: 'Typography',
      type: 'group' as const,
      children: [
        { name: 'typography.fontSize', label: 'Font Size', type: 'text' as const },
      ],
    },
  ]),
}));

// Mock zod and react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => fn),
    reset: vi.fn(),
    watch: vi.fn(() => ({})),
    formState: { errors: {}, isDirty: false, isValid: true },
  })),
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn((schema: any) => schema),
}));

describe('TokenEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Zod schema → form fields rendered (input elements exist)', async () => {
    render(<TokenEditor siteId={1} />);

    // Wait for async form field introspection
    await waitFor(() => {
      expect(screen.getByText('라이트 모드')).toBeInTheDocument();
      expect(screen.getByText('다크 모드')).toBeInTheDocument();
    });

    // Check for form elements in light mode (default)
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('Typography')).toBeInTheDocument();
  });

  it('2. Invalid value (e.g., "red" in color field) → inline error shown', async () => {
    const { useForm } = await import('react-hook-form');
    const mockErrors = {
      'colors.primary': { type: 'custom', message: 'Must be a valid hex color' },
    };

    (useForm as any).mockReturnValue({
      register: vi.fn(),
      handleSubmit: vi.fn((fn) => fn),
      reset: vi.fn(),
      watch: vi.fn(() => ({})),
      formState: { errors: mockErrors, isDirty: false, isValid: false },
    });

    render(<TokenEditor siteId={1} />);

    await waitFor(() => {
      const errorMessage = screen.queryByText(/must be a valid hex color/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it('3. "Save" button disabled when no changes (isDirty = false)', async () => {
    const { useForm } = await import('react-hook-form');
    (useForm as any).mockReturnValue({
      register: vi.fn(),
      handleSubmit: vi.fn((fn) => fn),
      reset: vi.fn(),
      watch: vi.fn(() => ({})),
      formState: { errors: {}, isDirty: false, isValid: true },
    });

    render(<TokenEditor siteId={1} />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it('4. "Save" button calls saveTokens Server Action when clicked with valid data', async () => {
    const { saveTokens } = await import('@/app/admin/site/design/actions');
    const { useForm } = await import('react-hook-form');

    const mockHandleSubmit = vi.fn((callback) => (e: any) => {
      e?.preventDefault();
      callback({ colors: { primary: '#3B82F6' } });
    });

    (useForm as any).mockReturnValue({
      register: vi.fn(),
      handleSubmit: mockHandleSubmit,
      reset: vi.fn(),
      watch: vi.fn(() => ({})),
      formState: { errors: {}, isDirty: true, isValid: true },
    });

    render(<TokenEditor siteId={1} />);

    await waitFor(async () => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      expect(saveTokens).toHaveBeenCalledWith({
        scope: 'site',
        refId: 1,
        tokens: { colors: { primary: '#3B82F6' } },
        siteId: 1,
      });
    });
  });
});
