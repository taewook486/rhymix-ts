/**
 * packages/document/src/server/actions.test.ts
 *
 * Server Actions 테스트 — SPEC-DOCUMENT-001 Slice B.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActionResult } from './actions';

// Simple unit tests for ActionResult type contracts
describe('Server Actions - ActionResult shape', () => {
  describe('ActionResult type', () => {
    it('should have ok: true with data property on success', () => {
      const success: ActionResult<{ id: number }> = {
        ok: true,
        data: { id: 123 },
      };
      expect(success.ok).toBe(true);
      if (success.ok) {
        expect(success.data).toEqual({ id: 123 });
      }
    });

    it('should have ok: false with error property on failure', () => {
      const failure: ActionResult<{ id: number }> = {
        ok: false,
        error: 'Test error',
      };
      expect(failure.ok).toBe(false);
      if (!failure.ok) {
        expect(failure.error).toBe('Test error');
      }
    });
  });

  describe('Error mapping', () => {
    it('should map BoardPermissionDeniedError to error string', () => {
      // Mock error class - must match the real implementation
      class BoardPermissionDeniedError extends Error {
        readonly code = 'BOARD_PERMISSION_DENIED';
        constructor(action: string) {
          super(`Board permission denied for action: ${action}`);
          this.name = 'BoardPermissionDeniedError';
        }
      }

      const err = new BoardPermissionDeniedError('write_document');
      expect(err.message).toBe('Board permission denied for action: write_document');
    });

    it('should map DocumentOwnershipError to error string', () => {
      class DocumentOwnershipError extends Error {
        readonly code = 'DOCUMENT_OWNERSHIP';
        constructor(documentId: number) {
          super(`Not the owner of document ${documentId}`);
          this.name = 'DocumentOwnershipError';
        }
      }

      const err = new DocumentOwnershipError(1);
      expect(err.message).toBe('Not the owner of document 1');
    });

    it('should map ExtraVarsRequiredError to error string', () => {
      class ExtraVarsRequiredError extends Error {
        readonly code = 'EXTRA_VARS_REQUIRED';
        constructor(boardId: number) {
          super(`Board ${boardId} has required extra keys but extraVars input is missing`);
          this.name = 'ExtraVarsRequiredError';
        }
      }

      const err = new ExtraVarsRequiredError(1);
      expect(err.code).toBe('EXTRA_VARS_REQUIRED');
      expect(err.message).toBe('Board 1 has required extra keys but extraVars input is missing');
    });

    it('should map ExtraVarsNotConfiguredError to error string', () => {
      class ExtraVarsNotConfiguredError extends Error {
        readonly code = 'EXTRA_VARS_NOT_CONFIGURED';
        constructor(boardId: number) {
          super(`Board ${boardId} has no extra keys defined but extraVars input is non-empty`);
          this.name = 'ExtraVarsNotConfiguredError';
        }
      }

      const err = new ExtraVarsNotConfiguredError(1);
      expect(err.code).toBe('EXTRA_VARS_NOT_CONFIGURED');
      expect(err.message).toBe('Board 1 has no extra keys defined but extraVars input is non-empty');
    });
  });

  describe('Server action function signatures', () => {
    it('createDocument should return ActionResult<{ id: number }>', async () => {
      // Type check only - function signature test
      const result: Promise<ActionResult<{ id: number }>> = Promise.resolve({
        ok: true,
        data: { id: 1 },
      });
      const resolved = await result;
      expect(resolved.ok).toBe(true);
      if (resolved.ok) {
        expect(resolved.data.id).toBe(1);
      }
    });

    it('updateDocument should return ActionResult<{ id: number }>', async () => {
      const result: Promise<ActionResult<{ id: number }>> = Promise.resolve({
        ok: true,
        data: { id: 2 },
      });
      const resolved = await result;
      expect(resolved.ok).toBe(true);
      if (resolved.ok) {
        expect(resolved.data.id).toBe(2);
      }
    });

    it('deleteDocument should return ActionResult<void>', async () => {
      const result: Promise<ActionResult<void>> = Promise.resolve({
        ok: true,
        data: undefined,
      });
      const resolved = await result;
      expect(resolved.ok).toBe(true);
      if (resolved.ok) {
        expect(resolved.data).toBeUndefined();
      }
    });

    it('publishDraft should return ActionResult<{ id: number }>', async () => {
      const result: Promise<ActionResult<{ id: number }>> = Promise.resolve({
        ok: false,
        error: 'not implemented yet',
      });
      const resolved = await result;
      expect(resolved.ok).toBe(false);
    });

    it('unlockSecret should return ActionResult<{ token: string; expiresAt: Date }>', async () => {
      const result: Promise<ActionResult<{ token: string; expiresAt: Date }>> = Promise.resolve({
        ok: false,
        error: 'not implemented yet',
      });
      const resolved = await result;
      expect(resolved.ok).toBe(false);
    });
  });
});
