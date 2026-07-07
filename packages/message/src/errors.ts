/**
 * Custom error classes for message operations
 *
 * SPEC-MESSAGE-001 error scenarios:
 * - Receiver not found (REQ-MSG-001)
 * - Receiver has blocked messages (REQ-MSG-004)
 * - Cannot send to self (implicit)
 * - Message not found (delete/read operations)
 * - No permission (accessing other's messages)
 */

export class MessageReceiverNotFoundError extends Error {
  constructor(receiverId: number) {
    super(`Receiver not found: ${receiverId}`);
    this.name = 'MessageReceiverNotFoundError';
  }
}

export class MessageBlockedError extends Error {
  constructor() {
    super('Cannot send message: receiver has blocked messages');
    this.name = 'MessageBlockedError';
  }
}

export class MessageSelfSendError extends Error {
  constructor() {
    super('Cannot send message to yourself');
    this.name = 'MessageSelfSendError';
  }
}

export class MessageNotFoundError extends Error {
  constructor(messageId: number) {
    super(`Message not found: ${messageId}`);
    this.name = 'MessageNotFoundError';
  }
}

export class MessageNoPermissionError extends Error {
  constructor() {
    super('No permission to access this message');
    this.name = 'MessageNoPermissionError';
  }
}

export class MessageSystemDisabledError extends Error {
  constructor() {
    super('Message system is disabled by admin');
    this.name = 'MessageSystemDisabledError';
  }
}
