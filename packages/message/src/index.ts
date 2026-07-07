export { MessageService, createMessageService } from './service';
export {
  MessageReceiverNotFoundError,
  MessageBlockedError,
  MessageSelfSendError,
  MessageNotFoundError,
  MessageNoPermissionError,
  MessageSystemDisabledError,
} from './errors';
export {
  MessageSendInputSchema,
  MessageListInputSchema,
  MessageReadInputSchema,
  MessageDeleteInputSchema,
  MessageCountUnreadInputSchema,
} from './schemas';
export type {
  MessageSendInput,
  MessageListInput,
  MessageReadInput,
  MessageDeleteInput,
  MessageCountUnreadInput,
} from './schemas';
export { defaultMessageConfig } from './config';
export type { MessageConfig } from './config';
export type { MessageHooks } from './service';
