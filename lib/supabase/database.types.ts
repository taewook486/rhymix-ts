/**
 * Rhymix-TS Database Types
 *
 * This file contains TypeScript types that match the Supabase PostgreSQL schema.
 * These types are auto-generated compatible and provide type safety for all database operations.
 *
 * Generated: 2026-02-20
 * Database: Supabase PostgreSQL 16
 */

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Common JSON field types used across tables
 */
export interface Json {
  [key: string]: JsonValue;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | Json
  | JsonValue[];

/**
 * Timestamp with timezone
 */
export type TIMESTAMPTZ = string;

/**
 * UUID type
 */
export type UUID = string;

/**
 * Array of strings (for tags, categories)
 */
export type TextArray = string[];

// =====================================================
// PROFILE TYPES
// =====================================================

/**
 * User role enum
 */
export type UserRole = 'admin' | 'user' | 'guest' | 'moderator';

/**
 * Notification settings structure
 */
export interface NotificationSettings {
  email: boolean;
  push: boolean;
  comment: boolean;
  mention?: boolean;
  like?: boolean;
  reply?: boolean;
  system?: boolean;
  admin?: boolean;
}

/**
 * Profile metadata structure
 */
export interface ProfileMetadata {
  [key: string]: JsonValue;
}

/**
 * Main profile type (extends auth.users)
 */
export interface Profile {
  id: UUID;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website_url: string | null;
  location: string | null;
  role: UserRole;
  email_verified: TIMESTAMPTZ;
  last_login_at: TIMESTAMPTZ | null;
  signature: string | null;
  notification_settings: NotificationSettings;
  metadata: ProfileMetadata;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

/**
 * Profile insert type (all optional fields for partial inserts)
 */
export type ProfileInsert = Omit<Partial<Profile>, 'id' | 'created_at' | 'updated_at'> & {
  id: UUID;
};

/**
 * Profile update type
 */
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

// =====================================================
// BOARD TYPES
// =====================================================

/**
 * Board list order enum
 */
export type BoardListOrder = 'latest' | 'voted' | 'blamed' | 'readed' | 'commented' | 'title' | 'updated' | 'random';

/**
 * Board sort order enum
 */
export type BoardSortOrder = 'asc' | 'desc';

/**
 * Board configuration structure
 */
export interface BoardConfig {
  post_permission: 'all' | 'member' | 'admin';
  comment_permission: 'all' | 'member' | 'admin';
  list_count: number;
  search_list_count: number;
  page_count: number;
  anonymous: boolean;
  use_category: boolean;
  use_tags: boolean;
  use_editor: boolean;
  use_file: boolean;
  max_file_size: number;
  allowed_file_extensions: string[];
  max_file_count: number;
  thumbnail_type: 'crop' | 'ratio' | 'none';
  thumbnail_width: number;
  thumbnail_height: number;
  allow_captcha: boolean;
  allow_anonymous: boolean;
  allow_signup: boolean;
  hide_category: boolean;
  list_categories: boolean;
  protect_content: boolean;
  protect_comment: boolean;
  protect_view_count: boolean;
  protect_voted_count: boolean;
  protect_blamed_count: boolean;
  protect_noticed: boolean;
  protect_secret: boolean;
  protect_document_category: boolean;
  non_login_vote: boolean;
  only_image: boolean;
  only_image_extension: string[];
  disable_copy: boolean;
}

/**
 * Main board type
 */
export interface Board {
  id: UUID;
  slug: string;
  title: string;
  description: string | null;
  content: string | null;
  icon: string | null;
  banner_url: string | null;
  config: BoardConfig;
  skin: string;
  list_order: BoardListOrder;
  sort_order: BoardSortOrder;
  view_count: number;
  post_count: number;
  comment_count: number;
  is_notice: boolean;
  is_hidden: boolean;
  is_locked: boolean;
  is_secret: boolean;
  admin_id: UUID | null;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
  deleted_at: TIMESTAMPTZ | null;
}

/**
 * Board with relations
 */
export interface BoardWithRelations extends Board {
  admin: Profile | null;
}

/**
 * Board insert type
 */
export type BoardInsert = Omit<Partial<Board>, 'id' | 'created_at' | 'updated_at'> & {
  slug: string;
  title: string;
};

/**
 * Board update type
 */
export type BoardUpdate = Partial<Omit<Board, 'id' | 'slug' | 'created_at' | 'updated_at'>>;

// =====================================================
// CATEGORY TYPES
// =====================================================

/**
 * Main category type
 */
export interface Category {
  id: UUID;
  board_id: UUID;
  parent_id: UUID | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order_index: number;
  depth: number;
  path: string;
  post_count: number;
  is_hidden: boolean;
  is_locked: boolean;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

/**
 * Category with relations
 */
export interface CategoryWithRelations extends Category {
  board: Board;
  parent: Category | null;
  children: Category[];
}

/**
 * Category insert type
 */
export type CategoryInsert = Omit<Partial<Category>, 'id' | 'created_at' | 'updated_at'> & {
  board_id: UUID;
  name: string;
  slug: string;
};

/**
 * Category update type
 */
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'board_id' | 'created_at' | 'updated_at'>>;

// =====================================================
// POST TYPES
// =====================================================

/**
 * Post status enum
 */
export type PostStatus = 'draft' | 'published' | 'trash' | 'temp' | 'embossed' | 'secret';

/**
 * Post visibility enum
 */
export type PostVisibility = 'all' | 'member' | 'admin' | 'only_me';

/**
 * Post metadata structure
 */
export interface PostMetadata {
  [key: string]: JsonValue;
}

/**
 * Main post type
 */
export interface Post {
  id: UUID;
  board_id: UUID;
  category_id: UUID | null;
  author_id: UUID | null;
  author_name: string | null;
  author_password: string | null;
  title: string;
  content: string;
  content_html: string | null;
  excerpt: string | null;
  status: PostStatus;
  visibility: PostVisibility;
  is_notice: boolean;
  is_secret: boolean;
  is_locked: boolean;
  is_blind: boolean;
  is_hidden: boolean;
  allow_comment: boolean;
  allow_trackback: boolean;
  notify_message: boolean;
  ip_address: string | null;
  tags: TextArray;
  metadata: PostMetadata;
  view_count: number;
  vote_count: number;
  blamed_count: number;
  comment_count: number;
  trackback_count: number;
  attached_count: number;
  readed_count: number;
  voted_count: number;
  comment_notified: boolean;
  last_commenter_id: UUID | null;
  last_commented_at: TIMESTAMPTZ | null;
  published_at: TIMESTAMPTZ | null;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
  deleted_at: TIMESTAMPTZ | null;
  search_vector?: string; // Full-text search vector (usually not selected)
}

/**
 * Post with relations
 */
export interface PostWithRelations extends Post {
  board: Board;
  category: Category | null;
  author: Profile | null;
  last_commenter: Profile | null;
  files: File[];
}

/**
 * Post insert type
 */
export type PostInsert = Omit<Partial<Post>, 'id' | 'created_at' | 'updated_at' | 'search_vector'> & {
  board_id: UUID;
  title: string;
  content: string;
};

/**
 * Post update type
 */
export type PostUpdate = Partial<Omit<Post, 'id' | 'board_id' | 'author_id' | 'created_at' | 'updated_at' | 'search_vector'>>;

/**
 * Post list item (lightweight for list views)
 */
export interface PostListItem {
  id: UUID;
  board_id: UUID;
  category_id: UUID | null;
  author_id: UUID | null;
  author_name: string | null;
  title: string;
  excerpt: string | null;
  status: PostStatus;
  is_notice: boolean;
  is_secret: boolean;
  view_count: number;
  vote_count: number;
  comment_count: number;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

// =====================================================
// COMMENT TYPES
// =====================================================

/**
 * Comment status enum
 */
export type CommentStatus = 'visible' | 'hidden' | 'trash' | 'secret';

/**
 * Comment metadata structure
 */
export interface CommentMetadata {
  [key: string]: JsonValue;
}

/**
 * Main comment type
 */
export interface Comment {
  id: UUID;
  post_id: UUID;
  parent_id: UUID | null;
  author_id: UUID | null;
  author_name: string | null;
  author_password: string | null;
  content: string;
  content_html: string | null;
  status: CommentStatus;
  is_secret: boolean;
  is_blind: boolean;
  ip_address: string | null;
  vote_count: number;
  blamed_count: number;
  depth: number;
  path: string;
  order_index: number;
  like_count: number;
  dislike_count: number;
  report_count: number;
  metadata: CommentMetadata;
  notified_at: TIMESTAMPTZ | null;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
  deleted_at: TIMESTAMPTZ | null;
}

/**
 * Comment with relations
 */
export interface CommentWithRelations extends Comment {
  post: Post;
  parent: Comment | null;
  author: Profile | null;
  children: Comment[];
}

/**
 * Comment insert type
 */
export type CommentInsert = Omit<Partial<Comment>, 'id' | 'created_at' | 'updated_at'> & {
  post_id: UUID;
  content: string;
};

/**
 * Comment update type
 */
export type CommentUpdate = Partial<Omit<Comment, 'id' | 'post_id' | 'author_id' | 'created_at' | 'updated_at'>>;

// =====================================================
// DOCUMENT TYPES
// =====================================================

/**
 * Document status enum
 */
export type DocumentStatus = 'draft' | 'published' | 'trash' | 'archived';

/**
 * Document visibility enum
 */
export type DocumentVisibility = 'public' | 'private' | 'password' | 'member' | 'admin';

/**
 * Document metadata structure
 */
export interface DocumentMetadata {
  [key: string]: JsonValue;
}

/**
 * Main document type
 */
export interface Document {
  id: UUID;
  module: string;
  title: string;
  content: string;
  content_html: string | null;
  excerpt: string | null;
  slug: string | null;
  author_id: UUID | null;
  status: DocumentStatus;
  visibility: DocumentVisibility;
  password: string | null;
  template: string;
  layout: string;
  language: string;
  tags: TextArray;
  categories: TextArray;
  metadata: DocumentMetadata;
  version: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_featured: boolean;
  is_sticky: boolean;
  allow_comment: boolean;
  allow_ping: boolean;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
  published_at: TIMESTAMPTZ | null;
  deleted_at: TIMESTAMPTZ | null;
  search_vector?: string; // Full-text search vector
}

/**
 * Document with relations
 */
export interface DocumentWithRelations extends Document {
  author: Profile | null;
  versions: DocumentVersion[];
}

/**
 * Document insert type
 */
export type DocumentInsert = Omit<Partial<Document>, 'id' | 'created_at' | 'updated_at' | 'search_vector'> & {
  module: string;
  title: string;
  content: string;
};

/**
 * Document update type
 */
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'search_vector'>>;

// =====================================================
// DOCUMENT VERSION TYPES
// =====================================================

/**
 * Document version change type
 */
export type DocumentVersionChangeType = 'create' | 'update' | 'restore' | 'publish';

/**
 * Document version metadata
 */
export interface DocumentVersionMetadata {
  [key: string]: JsonValue;
}

/**
 * Main document version type
 */
export interface DocumentVersion {
  id: UUID;
  document_id: UUID;
  version: number;
  title: string;
  content: string;
  content_html: string | null;
  excerpt: string | null;
  author_id: UUID | null;
  author_name: string | null;
  change_summary: string | null;
  change_type: DocumentVersionChangeType;
  metadata: DocumentVersionMetadata;
  created_at: TIMESTAMPTZ;
}

/**
 * Document version with relations
 */
export interface DocumentVersionWithRelations extends DocumentVersion {
  document: Document;
  author: Profile | null;
}

// =====================================================
// TRANSLATION TYPES
// =====================================================

/**
 * Language code format (e.g., 'en', 'en_US', 'ko')
 */
export type LanguageCode = string;

/**
 * Main translation type
 */
export interface Translation {
  id: UUID;
  lang_code: LanguageCode;
  namespace: string;
  key: string;
  value: string;
  context: string | null;
  plural: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

/**
 * Translation insert type
 */
export type TranslationInsert = Omit<Partial<Translation>, 'id' | 'created_at' | 'updated_at'> & {
  lang_code: LanguageCode;
  namespace: string;
  key: string;
  value: string;
};

/**
 * Translation update type
 */
export type TranslationUpdate = Partial<Omit<Translation, 'id' | 'created_at' | 'updated_at'>>;

// =====================================================
// FILE TYPES
// =====================================================

/**
 * File target type enum
 */
export type FileTargetType = 'post' | 'comment' | 'document' | 'profile';

/**
 * File status enum
 */
export type FileStatus = 'active' | 'trash' | 'deleted';

/**
 * File metadata structure
 */
export interface FileMetadata {
  [key: string]: JsonValue;
}

/**
 * Main file type
 */
export interface File {
  id: UUID;
  target_type: FileTargetType;
  target_id: UUID;
  author_id: UUID | null;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration: number | null; // For video/audio in seconds
  storage_path: string;
  cdn_url: string | null;
  thumbnail_path: string | null;
  is_image: boolean;
  is_video: boolean;
  is_audio: boolean;
  is_document: boolean;
  download_count: number;
  status: FileStatus;
  metadata: FileMetadata;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
  deleted_at: TIMESTAMPTZ | null;
}

/**
 * File with relations
 */
export interface FileWithRelations extends File {
  author: Profile | null;
}

/**
 * File insert type
 */
export type FileInsert = Omit<Partial<File>, 'id' | 'created_at' | 'updated_at'> & {
  target_type: FileTargetType;
  target_id: UUID;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
};

/**
 * File update type
 */
export type FileUpdate = Partial<Omit<File, 'id' | 'target_type' | 'target_id' | 'created_at' | 'updated_at'>>;

// =====================================================
// MENU TYPES
// =====================================================

/**
 * Menu location enum
 */
export type MenuLocation = 'header' | 'footer' | 'sidebar' | 'top' | 'bottom';

/**
 * Menu config structure
 */
export interface MenuConfig {
  type: 'normal' | 'dropdown' | 'mega';
  max_depth: number;
  expandable: boolean;
  show_title: boolean;
}

/**
 * Main menu type
 */
export interface Menu {
  id: UUID;
  name: string;
  title: string;
  location: MenuLocation;
  description: string | null;
  config: MenuConfig;
  is_active: boolean;
  order_index: number;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

/**
 * Menu with relations
 */
export interface MenuWithRelations extends Menu {
  items: MenuItem[];
}

// =====================================================
// MENU ITEM TYPES
// =====================================================

/**
 * Menu item type enum
 */
export type MenuItemType = 'link' | 'divider' | 'header' | 'action' | 'custom';

/**
 * Menu item target enum
 */
export type MenuItemTarget = '_self' | '_blank' | '_parent' | '_top';

/**
 * Menu item required role enum
 */
export type MenuItemRequiredRole = 'all' | 'member' | 'admin';

/**
 * Menu item config structure
 */
export interface MenuItemConfig {
  [key: string]: JsonValue;
}

/**
 * Main menu item type
 */
export interface MenuItem {
  id: UUID;
  menu_id: UUID;
  parent_id: UUID | null;
  title: string;
  url: string | null;
  type: MenuItemType;
  icon: string | null;
  badge: string | null;
  target: MenuItemTarget;
  rel: string | null;
  css_class: string | null;
  style: string | null;
  depth: number;
  path: string;
  order_index: number;
  is_active: boolean;
  is_visible: boolean;
  is_new_window: boolean;
  is_nofollow: boolean;
  required_role: MenuItemRequiredRole;
  config: MenuItemConfig;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

/**
 * Menu item with relations
 */
export interface MenuItemWithRelations extends MenuItem {
  menu: Menu;
  parent: MenuItem | null;
  children: MenuItem[];
}

// =====================================================
// VOTE TYPES
// =====================================================

/**
 * Vote target type enum
 */
export type VoteTargetType = 'post' | 'comment' | 'document';

/**
 * Vote type enum
 */
export type VoteType = 'up' | 'down';

/**
 * Main vote type
 */
export interface Vote {
  id: UUID;
  target_type: VoteTargetType;
  target_id: UUID;
  user_id: UUID;
  vote_type: VoteType;
  ip_address: string | null;
  created_at: TIMESTAMPTZ;
}

/**
 * Vote with relations
 */
export interface VoteWithRelations extends Vote {
  user: Profile;
}

// =====================================================
// SCRAP TYPES
// =====================================================

/**
 * Scrap target type enum
 */
export type ScrapTargetType = 'post' | 'comment' | 'document';

/**
 * Main scrap type
 */
export interface Scrap {
  id: UUID;
  user_id: UUID;
  target_type: ScrapTargetType;
  target_id: UUID;
  title: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  url: string;
  folder_id: UUID | null;
  tags: TextArray;
  notes: string | null;
  is_favorite: boolean;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

/**
 * Scrap with relations
 */
export interface ScrapWithRelations extends Scrap {
  user: Profile;
  folder: ScrapFolder | null;
}

// =====================================================
// SCRAP FOLDER TYPES
// =====================================================

/**
 * Main scrap folder type
 */
export interface ScrapFolder {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parent_id: UUID | null;
  order_index: number;
  is_default: boolean;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

/**
 * Scrap folder with relations
 */
export interface ScrapFolderWithRelations extends ScrapFolder {
  user: Profile;
  parent: ScrapFolder | null;
  children: ScrapFolder[];
  scraps: Scrap[];
}

// =====================================================
// NOTIFICATION TYPES
// =====================================================

/**
 * Notification type enum
 */
export type NotificationType = 'comment' | 'mention' | 'like' | 'reply' | 'system' | 'admin';

/**
 * Notification metadata structure
 */
export interface NotificationMetadata {
  [key: string]: JsonValue;
}

/**
 * Main notification type
 */
export interface Notification {
  id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  content: string | null;
  action_url: string | null;
  action_label: string | null;
  icon: string | null;
  metadata: NotificationMetadata;
  is_read: boolean;
  read_at: TIMESTAMPTZ | null;
  created_at: TIMESTAMPTZ;
}

/**
 * Notification with relations
 */
export interface NotificationWithRelations extends Notification {
  user: Profile;
}

/**
 * Notification insert type (all optional fields for partial inserts)
 */
export type NotificationInsert = Omit<Partial<Notification>, 'id' | 'created_at'> & {
  user_id: UUID;
  type: NotificationType;
  title: string;
};

/**
 * Notification update type
 */
export type NotificationUpdate = Partial<Omit<Notification, 'id' | 'user_id' | 'created_at'>>;

/**
 * Notification with computed fields (from useNotifications hook)
 */
export interface NotificationWithMeta extends Notification {
  /** Time ago string (e.g., "5 minutes ago") */
  timeAgo?: string;
  /** Whether this notification is new (just received) */
  isNew?: boolean;
}

// =====================================================
// MESSAGE TYPES
// =====================================================

/**
 * Message status enum
 */
export type MessageStatus = 'draft' | 'sent' | 'read' | 'deleted';

/**
 * Message metadata structure
 */
export interface MessageMetadata {
  [key: string]: JsonValue;
}

/**
 * Main message type
 */
export interface Message {
  id: UUID;
  sender_id: UUID;
  receiver_id: UUID;
  title: string;
  content: string;
  is_read: boolean;
  read_at: TIMESTAMPTZ | null;
  is_sender_deleted: boolean;
  is_receiver_deleted: boolean;
  sender_deleted_at: TIMESTAMPTZ | null;
  receiver_deleted_at: TIMESTAMPTZ | null;
  parent_id: UUID | null;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

/**
 * Message with relations
 */
export interface MessageWithRelations extends Message {
  sender: Profile;
  receiver: Profile;
  parent: Message | null;
}

/**
 * Message insert type
 */
export type MessageInsert = Omit<
  Partial<Message>,
  'id' | 'created_at' | 'updated_at' | 'is_read' | 'read_at' | 'is_sender_deleted' | 'is_receiver_deleted' | 'sender_deleted_at' | 'receiver_deleted_at'
> & {
  sender_id: UUID;
  receiver_id: UUID;
  title: string;
  content: string;
  parent_id?: UUID | null;
};

/**
 * Message update type
 */
export type MessageUpdate = Partial<
  Pick<Message, 'title' | 'content' | 'is_read' | 'read_at' | 'is_sender_deleted' | 'is_receiver_deleted' | 'sender_deleted_at' | 'receiver_deleted_at'>
>;

/**
 * Message block type
 */
export interface MessageBlock {
  id: UUID;
  blocker_id: UUID;
  blocked_id: UUID;
  created_at: TIMESTAMPTZ;
}

/**
 * Message block with relations
 */
export interface MessageBlockWithRelations extends MessageBlock {
  blocker: Profile;
  blocked: Profile;
}

/**
 * Message block insert type
 */
export type MessageBlockInsert = Omit<MessageBlock, 'id' | 'created_at'>;

/**
 * Message list filters
 */
export interface MessageListFilters {
  folder: 'inbox' | 'sent';
  is_read?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// TAG TYPES
// =====================================================

/**
 * Main tag type
 */
export interface Tag {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  count: number;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

// =====================================================
// POINT TYPES
// =====================================================

/**
 * Main point type
 */
export interface Point {
  id: UUID;
  user_id: UUID;
  point: number;
  reason: string;
  target_type: string | null;
  target_id: UUID | null;
  created_at: TIMESTAMPTZ;
}

/**
 * Point with relations
 */
export interface PointWithRelations extends Point {
  user: Profile;
}

// =====================================================
// SETTING TYPES
// =====================================================

/**
 * Setting value type (any JSON)
 */
export type SettingValue = Json;

/**
 * Main setting type
 */
export interface Setting {
  id: UUID;
  module: string;
  key: string;
  value: SettingValue;
  description: string | null;
  is_public: boolean;
  is_system: boolean;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}

// =====================================================
// AGGREGATE TYPES
// =====================================================

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  total_users: number;
  total_posts: number;
  total_comments: number;
  total_views: number;
  today_posts: number;
  today_comments: number;
  today_views: number;
  active_boards: number;
}

/**
 * Search result type
 */
export interface SearchResult<T = Post | Document> {
  type: 'post' | 'document';
  item: T;
  rank: number;
  highlight: {
    title: string;
    content: string;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// =====================================================
// FILTER AND QUERY TYPES
// =====================================================

/**
 * Post filter options
 */
export interface PostFilterOptions {
  board_id?: UUID;
  category_id?: UUID;
  author_id?: UUID;
  status?: PostStatus;
  visibility?: PostVisibility;
  tags?: string[];
  search?: string;
  is_notice?: boolean;
  is_secret?: boolean;
  date_from?: TIMESTAMPTZ;
  date_to?: TIMESTAMPTZ;
}

/**
 * Post sort options
 */
export type PostSortOption =
  | 'created_at'
  | 'updated_at'
  | 'published_at'
  | 'view_count'
  | 'vote_count'
  | 'comment_count'
  | 'title';

/**
 * Post query options
 */
export interface PostQueryOptions {
  filter?: PostFilterOptions;
  sort?: PostSortOption;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Comment filter options
 */
export interface CommentFilterOptions {
  post_id?: UUID;
  author_id?: UUID;
  status?: CommentStatus;
  is_secret?: boolean;
}

/**
 * Document filter options
 */
export interface DocumentFilterOptions {
  module?: string;
  author_id?: UUID;
  status?: DocumentStatus;
  visibility?: DocumentVisibility;
  language?: string;
  tags?: string[];
  search?: string;
}

// =====================================================
// FORM INPUT TYPES
// =====================================================

/**
 * Post creation input
 */
export interface CreatePostInput {
  board_id: UUID;
  category_id?: UUID;
  title: string;
  content: string;
  tags?: string[];
  is_secret?: boolean;
  is_notice?: boolean;
  status?: PostStatus;
}

/**
 * Post update input
 */
export interface UpdatePostInput {
  title?: string;
  content?: string;
  category_id?: UUID;
  tags?: string[];
  is_secret?: boolean;
  is_notice?: boolean;
  status?: PostStatus;
}

/**
 * Comment creation input
 */
export interface CreateCommentInput {
  post_id: UUID;
  parent_id?: UUID;
  content: string;
  is_secret?: boolean;
}

/**
 * Profile update input
 */
export interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  website_url?: string;
  location?: string;
  signature?: string;
}

/**
 * Document creation input
 */
export interface CreateDocumentInput {
  module: string;
  title: string;
  content: string;
  slug?: string;
  template?: string;
  layout?: string;
  language?: string;
  tags?: string[];
  categories?: string[];
  status?: DocumentStatus;
  visibility?: DocumentVisibility;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: TIMESTAMPTZ;
    request_id: string;
  };
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: Record<string, string[]>;
  meta?: {
    timestamp: TIMESTAMPTZ;
    request_id: string;
  };
}

/**
 * Auth response
 */
export interface AuthResponse {
  user: Profile;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// =====================================================
// SUPABASE TYPE GENERATION COMPATIBILITY
// =====================================================

/**
 * This type maps to the Supabase generated database types.
 * When running `npx supabase gen types typescript --local`, the output
 * will be compatible with these manually defined types.
 *
 * To generate types from your actual Supabase project:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/generated.types.ts
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      boards: {
        Row: Board;
        Insert: BoardInsert;
        Update: BoardUpdate;
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      posts: {
        Row: Post;
        Insert: PostInsert;
        Update: PostUpdate;
      };
      comments: {
        Row: Comment;
        Insert: CommentInsert;
        Update: CommentUpdate;
      };
      documents: {
        Row: Document;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
      };
      document_versions: {
        Row: DocumentVersion;
        Insert: Omit<DocumentVersion, 'id' | 'created_at'>;
        Update: Partial<Omit<DocumentVersion, 'id' | 'document_id' | 'created_at'>>;
      };
      translations: {
        Row: Translation;
        Insert: TranslationInsert;
        Update: TranslationUpdate;
      };
      files: {
        Row: File;
        Insert: FileInsert;
        Update: FileUpdate;
      };
      menus: {
        Row: Menu;
        Insert: Omit<Menu, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Menu, 'id' | 'created_at' | 'updated_at'>>;
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MenuItem, 'id' | 'menu_id' | 'created_at' | 'updated_at'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: never;
      };
      scraps: {
        Row: Scrap;
        Insert: Omit<Scrap, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Scrap, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      scrap_folders: {
        Row: ScrapFolder;
        Insert: Omit<ScrapFolder, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ScrapFolder, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'user_id' | 'created_at'>>;
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Tag, 'id' | 'created_at' | 'updated_at'>>;
      };
      points: {
        Row: Point;
        Insert: Omit<Point, 'id' | 'created_at'>;
        Update: never;
      };
      settings: {
        Row: Setting;
        Insert: Omit<Setting, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Setting, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_view_count: {
        Args: {
          table_name: string;
          row_id: UUID;
        };
        Returns: void;
      };
      get_user_points: {
        Args: {
          user_uuid: UUID;
        };
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
      board_list_order: BoardListOrder;
      post_status: PostStatus;
      post_visibility: PostVisibility;
      comment_status: CommentStatus;
      document_status: DocumentStatus;
      document_visibility: DocumentVisibility;
      file_target_type: FileTargetType;
      menu_location: MenuLocation;
      menu_item_type: MenuItemType;
      vote_target_type: VoteTargetType;
      notification_type: NotificationType;
    };
  };
};

// =====================================================
// EXPORTS
// =====================================================

export default Database;
