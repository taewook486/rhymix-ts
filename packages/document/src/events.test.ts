/**
 * packages/document/src/events.test.ts
 *
 * 문서 이벤트 버스 테스트 — SPEC-DOCUMENT-001 Slice C.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  documentEvents,
  emitDocumentCreated,
  emitDocumentUpdated,
  emitDocumentDeleted,
  emitDocumentPublished,
  type DocumentEventType,
  type DocumentCreatedEvent,
  type DocumentUpdatedEvent,
  type DocumentDeletedEvent,
  type DocumentPublishedEvent,
} from './events';

describe('events - Document Event Bus', () => {
  beforeEach(() => {
    // Clean up all listeners before each test to ensure clean state
    documentEvents.removeAllListeners();
  });

  afterEach(() => {
    // Clean up all listeners after each test
    documentEvents.removeAllListeners();
  });

  describe('Event Bus Basic Operations', () => {
    it('should emit and receive created event', async () => {
      const promise = new Promise<DocumentCreatedEvent>((resolve) => {
        const handler = (event: DocumentCreatedEvent) => {
          resolve(event);
        };
        documentEvents.on('created', handler);
      });

      emitDocumentCreated({ documentId: 1, boardId: 10, authorId: 100, status: 'PUBLIC' });

      const event = await promise;
      expect(event.type).toBe('created');
      expect(event.documentId).toBe(1);
      expect(event.boardId).toBe(10);
    });

    it('should emit and receive updated event', async () => {
      const promise = new Promise<DocumentUpdatedEvent>((resolve) => {
        const handler = (event: DocumentUpdatedEvent) => {
          resolve(event);
        };
        documentEvents.on('updated', handler);
      });

      emitDocumentUpdated({
        documentId: 2,
        boardId: 10,
        editorId: 100,
        changes: { title: true },
      });

      const event = await promise;
      expect(event.type).toBe('updated');
      expect(event.documentId).toBe(2);
      expect(event.editorId).toBe(100);
      expect(event.changes.title).toBe(true);
    });

    it('should emit and receive deleted event', async () => {
      const promise = new Promise<DocumentDeletedEvent>((resolve) => {
        const handler = (event: DocumentDeletedEvent) => {
          resolve(event);
        };
        documentEvents.on('deleted', handler);
      });

      emitDocumentDeleted({ documentId: 3, boardId: 10, deletedById: 100 });

      const event = await promise;
      expect(event.type).toBe('deleted');
      expect(event.documentId).toBe(3);
      expect(event.deletedById).toBe(100);
    });

    it('should emit and receive published event', async () => {
      const promise = new Promise<DocumentPublishedEvent>((resolve) => {
        const handler = (event: DocumentPublishedEvent) => {
          resolve(event);
        };
        documentEvents.on('published', handler);
      });

      emitDocumentPublished({ documentId: 4, boardId: 10, publishedBy: 100 });

      const event = await promise;
      expect(event.type).toBe('published');
      expect(event.documentId).toBe(4);
      expect(event.publishedBy).toBe(100);
    });
  });

  describe('Multiple Listeners', () => {
    it('should call multiple listeners for the same event', async () => {
      const calls: number[] = [];

      const promise1 = new Promise<void>((resolve) => {
        documentEvents.on('created', () => {
          calls.push(1);
          resolve();
        });
      });

      const promise2 = new Promise<void>((resolve) => {
        documentEvents.on('created', () => {
          calls.push(2);
          resolve();
        });
      });

      emitDocumentCreated({ documentId: 1, boardId: 10, authorId: 100, status: 'PUBLIC' });

      await Promise.all([promise1, promise2]);
      expect(calls).toEqual([1, 2]);
    });

    it('should not call listeners for different event types', async () => {
      let createdCalled = false;
      let updatedCalled = false;

      documentEvents.on('created', () => {
        createdCalled = true;
      });
      documentEvents.on('updated', () => {
        updatedCalled = true;
      });

      emitDocumentUpdated({
        documentId: 2,
        boardId: 10,
        editorId: 100,
        changes: {},
      });

      expect(createdCalled).toBe(false);
      expect(updatedCalled).toBe(true);
    });
  });

  describe('Listener Management', () => {
    it('should remove specific listener with off()', async () => {
      let callCount = 0;

      const handler = () => {
        callCount++;
      };

      documentEvents.on('created', handler);
      emitDocumentCreated({ documentId: 1, boardId: 10, authorId: 100, status: 'PUBLIC' });

      // Wait for event to be processed
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callCount).toBe(1);

      documentEvents.off('created', handler);
      emitDocumentCreated({ documentId: 2, boardId: 10, authorId: 100, status: 'PUBLIC' });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callCount).toBe(1); // Should not increment
    });

    it('should remove all listeners with removeAllListeners()', async () => {
      let callCount = 0;

      documentEvents.on('created', () => {
        callCount++;
      });
      documentEvents.on('created', () => {
        callCount++;
      });

      emitDocumentCreated({ documentId: 1, boardId: 10, authorId: 100, status: 'PUBLIC' });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callCount).toBe(2);

      documentEvents.removeAllListeners('created');

      emitDocumentCreated({ documentId: 2, boardId: 10, authorId: 100, status: 'PUBLIC' });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callCount).toBe(2); // Should not increment
    });

    it('should support once() for one-time listeners', async () => {
      let callCount = 0;

      const promise = new Promise<void>((resolve) => {
        documentEvents.once('created', () => {
          callCount++;
          resolve();
        });
      });

      emitDocumentCreated({ documentId: 1, boardId: 10, authorId: 100, status: 'PUBLIC' });
      await promise;
      expect(callCount).toBe(1);

      emitDocumentCreated({ documentId: 2, boardId: 10, authorId: 100, status: 'PUBLIC' });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callCount).toBe(1); // Should not increment again
    });
  });

  describe('Event Payload Structure', () => {
    it('should include timestamp in event payload', async () => {
      const promise = new Promise<DocumentCreatedEvent>((resolve) => {
        const handler = (event: DocumentCreatedEvent) => {
          resolve(event);
        };
        documentEvents.on('created', handler);
      });

      emitDocumentCreated({ documentId: 1, boardId: 10, authorId: 100, status: 'PUBLIC' });

      const event = await promise;
      expect(event.timestamp).toBeInstanceOf(Date);
      const now = new Date();
      // Timestamp should be recent (within 1 second)
      expect(event.timestamp.getTime()).toBeGreaterThan(now.getTime() - 1000);
    });

    it('should include all required fields in created event', async () => {
      const promise = new Promise<DocumentCreatedEvent>((resolve) => {
        const handler = (event: DocumentCreatedEvent) => {
          resolve(event);
        };
        documentEvents.on('created', handler);
      });

      emitDocumentCreated({ documentId: 1, boardId: 10, authorId: 100, status: 'PUBLIC' });

      const event = await promise;
      expect(event).toMatchObject({
        type: 'created',
        documentId: 1,
        boardId: 10,
        authorId: 100,
        status: 'PUBLIC',
      });
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should include all required fields in updated event', async () => {
      const promise = new Promise<DocumentUpdatedEvent>((resolve) => {
        const handler = (event: DocumentUpdatedEvent) => {
          resolve(event);
        };
        documentEvents.on('updated', handler);
      });

      emitDocumentUpdated({
        documentId: 2,
        boardId: 10,
        editorId: 100,
        changes: { title: true, content: true },
      });

      const event = await promise;
      expect(event).toMatchObject({
        type: 'updated',
        documentId: 2,
        boardId: 10,
        editorId: 100,
        changes: { title: true, content: true },
      });
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should include all required fields in deleted event', async () => {
      const promise = new Promise<DocumentDeletedEvent>((resolve) => {
        const handler = (event: DocumentDeletedEvent) => {
          resolve(event);
        };
        documentEvents.on('deleted', handler);
      });

      emitDocumentDeleted({ documentId: 3, boardId: 10, deletedById: 100 });

      const event = await promise;
      expect(event).toMatchObject({
        type: 'deleted',
        documentId: 3,
        boardId: 10,
        deletedById: 100,
      });
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should include all required fields in published event', async () => {
      const promise = new Promise<DocumentPublishedEvent>((resolve) => {
        const handler = (event: DocumentPublishedEvent) => {
          resolve(event);
        };
        documentEvents.on('published', handler);
      });

      emitDocumentPublished({ documentId: 4, boardId: 10, publishedBy: 100 });

      const event = await promise;
      expect(event).toMatchObject({
        type: 'published',
        documentId: 4,
        boardId: 10,
        publishedBy: 100,
      });
      expect(event.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Listener Count', () => {
    it('should return correct listener count', () => {
      // Clean up first
      documentEvents.removeAllListeners();

      const initialCount = documentEvents.listenerCount('created');
      expect(initialCount).toBe(0);

      documentEvents.on('created', () => {});
      const afterOne = documentEvents.listenerCount('created');
      expect(afterOne).toBe(1);

      documentEvents.on('created', () => {});
      const afterTwo = documentEvents.listenerCount('created');
      expect(afterTwo).toBe(2);

      documentEvents.removeAllListeners('created');
      const afterClear = documentEvents.listenerCount('created');
      expect(afterClear).toBe(0);
    });

    it('should return 0 for event type with no listeners', () => {
      // Clean up first
      documentEvents.removeAllListeners();

      const count = documentEvents.listenerCount('nonexistent' as DocumentEventType);
      expect(count).toBe(0);
    });
  });

  describe('Event Type Discrimination', () => {
    it('should allow type-safe event handling', async () => {
      const promise = new Promise<string>((resolve) => {
        const handler = (event: any) => {
          // Type narrowing based on event.type
          if (event.type === 'created') {
            // TypeScript knows this is DocumentCreatedEvent
            expect(event.authorId).toBeDefined();
            resolve('created');
          } else if (event.type === 'updated') {
            // TypeScript knows this is DocumentUpdatedEvent
            expect(event.editorId).toBeDefined();
            resolve('updated');
          } else if (event.type === 'deleted') {
            // TypeScript knows this is DocumentDeletedEvent
            expect(event.deletedById).toBeDefined();
            resolve('deleted');
          } else if (event.type === 'published') {
            // TypeScript knows this is DocumentPublishedEvent
            expect(event.publishedBy).toBeDefined();
            resolve('published');
          }
        };
        documentEvents.on('created', handler);
      });

      emitDocumentCreated({ documentId: 1, boardId: 10, authorId: 100, status: 'PUBLIC' });

      const result = await promise;
      expect(result).toBe('created');
    });
  });
});
