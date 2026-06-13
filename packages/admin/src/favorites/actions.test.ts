/**
 * Favorites Validation Tests
 */
import { describe, it, expect } from 'vitest';
import { FAVORITE_MAX_COUNT, validateFavoriteHref } from './actions';

describe('favorites-actions', () => {
  describe('FAVORITE_MAX_COUNT', () => {
    it('should be 50', () => {
      expect(FAVORITE_MAX_COUNT).toBe(50);
    });
  });

  describe('validateFavoriteHref', () => {
    it('should accept valid /admin/ paths', () => {
      expect(validateFavoriteHref('/admin/dashboard')).toBe(true);
      expect(validateFavoriteHref('/admin/modules')).toBe(true);
      expect(validateFavoriteHref('/admin/content/board')).toBe(true);
    });

    it('should reject non-/admin/ paths', () => {
      expect(validateFavoriteHref('/user/profile')).toBe(false);
      expect(validateFavoriteHref('/home')).toBe(false);
      expect(validateFavoriteHref('admin/modules')).toBe(false); // missing leading slash
    });

    it('should reject protocol URLs', () => {
      expect(validateFavoriteHref('https://example.com/admin/dashboard')).toBe(false);
      expect(validateFavoriteHref('http://example.com/admin/modules')).toBe(false);
    });

    it('should reject protocol-relative URLs', () => {
      expect(validateFavoriteHref('//example.com/admin/dashboard')).toBe(false);
    });

    it('should reject empty or non-string', () => {
      expect(validateFavoriteHref('')).toBe(false);
      expect(validateFavoriteHref(null as unknown as string)).toBe(false);
      expect(validateFavoriteHref(undefined as unknown as string)).toBe(false);
    });
  });
});
