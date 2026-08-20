/**
 * Admin Export Bundle Schema Tests
 */
import { describe, it, expect } from 'vitest';
import {
  exportFormatVersion,
  SUPPORTED_VERSIONS,
  adminExportBundleSchema,
  exportRequestSchema,
} from './bundle-schema';

describe('bundle-schema', () => {
  describe('exportFormatVersion', () => {
    it('should be 1.0.0', () => {
      expect(exportFormatVersion).toBe('1.0.0');
    });
  });

  describe('SUPPORTED_VERSIONS', () => {
    it('should include 1.0.0', () => {
      expect(SUPPORTED_VERSIONS).toContain('1.0.0');
    });
  });

  describe('exportRequestSchema', () => {
    it('should validate with defaults', () => {
      const result = exportRequestSchema.safeParse({
        siteId: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.menu).toBe(false);
        expect(result.data.moduleInstances).toBe(false);
        expect(result.data.documents.include).toBe(false);
        expect(result.data.comments.include).toBe(false);
        expect(result.data.siteSettings).toBe(false);
        expect(result.data.minify).toBe(false);
      }
    });

    it('should validate with all fields', () => {
      const result = exportRequestSchema.safeParse({
        siteId: 1,
        menu: true,
        moduleInstances: true,
        documents: { include: true, mids: ['board', 'blog'] },
        comments: { include: true, mids: ['board'] },
        siteSettings: true,
        minify: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid siteId', () => {
      const result = exportRequestSchema.safeParse({
        siteId: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid mids (non-array)', () => {
      const result = exportRequestSchema.safeParse({
        siteId: 1,
        documents: { include: true, mids: 'board' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('adminExportBundleSchema', () => {
    it('should validate minimal bundle', () => {
      const result = adminExportBundleSchema.safeParse({
        metadata: {
          version: '1.0.0',
          exportedAt: new Date(),
          exportedBy: { actorId: 1, nickname: 'admin' },
          sourceSiteId: 1,
          format: 'partial',
          selection: {
            menu: false,
            moduleInstances: false,
            documents: { include: false },
            comments: { include: false },
            siteSettings: false,
          },
          entityCounts: {
            menus: 0,
            menuItems: 0,
            moduleInstances: 0,
            documents: 0,
            comments: 0,
          },
          bundleSizeBytes: 0,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate full bundle', () => {
      const result = adminExportBundleSchema.safeParse({
        metadata: {
          version: '1.0.0',
          exportedAt: new Date(),
          exportedBy: { actorId: 1, nickname: 'admin' },
          sourceSiteId: 1,
          sourceSiteTitle: 'Test Site',
          format: 'full',
          selection: {
            menu: true,
            moduleInstances: true,
            documents: { include: true },
            comments: { include: true },
            siteSettings: true,
          },
          entityCounts: {
            menus: 1,
            menuItems: 5,
            moduleInstances: 3,
            documents: 10,
            comments: 20,
          },
          bundleSizeBytes: 1024,
        },
        menus: [
          {
            id: 1,
            siteId: 1,
            title: 'Main Menu',
            isAdminMenu: false,
            listOrder: 0,
            exportKey: 'menu:1',
            items: [],
          },
        ],
        moduleInstances: [
          {
            id: 1,
            siteId: 1,
            moduleCode: 'board',
            mid: 'board',
            name: 'Board',
            exportKey: 'module:board',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid version', () => {
      const result = adminExportBundleSchema.safeParse({
        metadata: {
          version: 123, // invalid type
          exportedAt: new Date(),
          exportedBy: { actorId: 1, nickname: 'admin' },
          sourceSiteId: 1,
          format: 'partial',
          selection: {
            menu: false,
            moduleInstances: false,
            documents: { include: false },
            comments: { include: false },
            siteSettings: false,
          },
          entityCounts: {
            menus: 0,
            menuItems: 0,
            moduleInstances: 0,
            documents: 0,
            comments: 0,
          },
          bundleSizeBytes: 0,
        },
      });
      expect(result.success).toBe(false);
    });

    it('should carry optional droppedButtonImages through metadata parse (D3 방어 수리)', () => {
      // metadataSchema는 비-strict이므로 스키마에 선언되지 않은 키는 parse가
      // 성공해도 strip된다 — 필드가 실제로 살아남는지(선언되었는지)를 검증한다.
      const result = adminExportBundleSchema.safeParse({
        metadata: {
          version: '1.0.0',
          exportedAt: new Date(),
          exportedBy: { actorId: 1, nickname: 'admin' },
          sourceSiteId: 1,
          format: 'partial',
          selection: {
            menu: true,
            moduleInstances: false,
            documents: { include: false },
            comments: { include: false },
            siteSettings: false,
          },
          entityCounts: {
            menus: 1,
            menuItems: 1,
            moduleInstances: 0,
            documents: 0,
            comments: 0,
          },
          bundleSizeBytes: 1024,
          droppedButtonImages: 2,
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.droppedButtonImages).toBe(2);
      }
    });

    it('should reject negative droppedButtonImages', () => {
      const result = adminExportBundleSchema.safeParse({
        metadata: {
          version: '1.0.0',
          exportedAt: new Date(),
          exportedBy: { actorId: 1, nickname: 'admin' },
          sourceSiteId: 1,
          format: 'partial',
          selection: {
            menu: false,
            moduleInstances: false,
            documents: { include: false },
            comments: { include: false },
            siteSettings: false,
          },
          entityCounts: {
            menus: 0,
            menuItems: 0,
            moduleInstances: 0,
            documents: 0,
            comments: 0,
          },
          bundleSizeBytes: 0,
          droppedButtonImages: -1,
        },
      });
      expect(result.success).toBe(false);
    });
  });
});
