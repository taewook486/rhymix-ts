// Board server actions exports
export {
  // Post actions
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,

  // Comment actions
  getComments,
  createComment,
  updateComment,
  deleteComment,

  // Category actions
  getCategories,
  createCategory,
  updateCategory,

  // Vote actions
  toggleVote,

  // Board management actions
  createBoard,
  updateBoard,
  deleteBoard,
  getBoards,
  getBoardBySlug,
} from './board'

// Post actions (standalone module)
export {
  createPost as createPostStandalone,
  updatePost as updatePostStandalone,
  deletePost as deletePostStandalone,
  getPosts as getPostsStandalone,
  getPostById,
  incrementViewCount,
  votePost,
} from './post'
export type { PostFilters } from './post'

// Comment actions (standalone module)
export {
  createComment as createCommentStandalone,
  updateComment as updateCommentStandalone,
  deleteComment as deleteCommentStandalone,
  getComments as getCommentsStandalone,
  voteComment,
} from './comment'

// Member actions
export {
  updateProfile,
  changePassword,
  uploadAvatar,
  getMembers,
  updateMemberRole,
} from './member'
export type { MemberFilters } from './member'

// Document actions
export {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
  getDocumentVersion,
  compareDocumentVersions,
  restoreDocumentVersion,
} from './document'

// Menu actions
export {
  getMenus,
  getMenuById,
  getActiveMenuByLocation,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
} from './menu'

// Settings actions
export {
  getSettings,
  updateSetting,
  getSiteConfig,
  updateSiteConfig,
} from './settings'
export type { SiteConfigData } from './settings'

// Auth actions
export {
  signIn,
  signUp,
  signOut,
  resetPassword,
  updatePassword,
  getSession,
  getCurrentUser,
} from './auth'

// Search actions
export { searchContent, getSearchSuggestions, getPopularSearchTerms } from './search'
export type { SearchResultType, SearchFilters, SearchResult, SearchResponse } from './search'

// Theme actions
export { getThemes, activateTheme, getActiveTheme } from './theme'
export type { SiteTheme } from './theme'
