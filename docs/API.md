# API Documentation

## Server Actions

Server Actions are used for mutations (create, update, delete) and are defined in `app/actions/`.

### Authentication Actions

#### `signIn(formData: FormData)`

Signs in a user with email and password.

```typescript
await signIn(formData);
```

#### `signUp(formData: FormData)`

Registers a new user account.

```typescript
await signUp(formData);
```

#### `signOut()`

Signs out the current user.

```typescript
await signOut();
```

### Board Actions

#### `createPost(data: CreatePostInput)`

Creates a new forum post.

```typescript
const result = await createPost({
  board_id: 'board-123',
  title: 'Post Title',
  content: 'Post content...',
  category_id: 'cat-123',
  tags: ['tag1', 'tag2']
});
```

#### `updatePost(postId: string, data: UpdatePostInput)`

Updates an existing post.

```typescript
await updatePost('post-123', {
  title: 'Updated Title',
  content: 'Updated content...'
});
```

#### `deletePost(postId: string)`

Deletes a post (soft delete).

```typescript
await deletePost('post-123');
```

### Member Actions

#### `updateProfile(data: UpdateProfileInput)`

Updates user profile.

```typescript
await updateProfile({
  username: 'newusername',
  nickname: 'New Nickname',
  bio: 'About me...'
});
```

### Comment Actions

#### `createComment(data: CreateCommentInput)`

Creates a new comment.

```typescript
await createComment({
  post_id: 'post-123',
  content: 'Comment content...',
  parent_id: 'parent-comment-id' // Optional, for replies
});
```

## Database Queries

### Supabase Client Usage

#### Server Component

```typescript
import { createServerClient } from '@/lib/supabase/server';

async function getPosts() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username, avatar_url)')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  return data;
}
```

#### Client Component

```typescript
import { createClient } from '@/lib/supabase/client';

function PostsList() {
  const supabase = createClient();

  useEffect(() => {
    async function loadPosts() {
      const { data } = await supabase
        .from('posts')
        .select('*');
      // ...
    }
    loadPosts();
  }, []);

  return <div>...</div>;
}
```

### Realtime Subscriptions

```typescript
const supabase = createClient();

// Subscribe to new posts
const channel = supabase
  .channel('posts-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'posts'
    },
    (payload) => {
      console.log('New post:', payload.new);
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

## Type Definitions

### Post Types

```typescript
interface Post {
  id: string;
  board_id: string;
  author_id: string;
  title: string;
  content: string;
  category_id: string | null;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  is_notice: boolean;
  is_secret: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

interface CreatePostInput {
  board_id: string;
  title: string;
  content: string;
  category_id?: string;
  tags?: string[];
}
```

### Profile Types

```typescript
interface Profile {
  id: string;
  username: string;
  nickname: string;
  bio: string | null;
  avatar_url: string | null;
  role: 'admin' | 'moderator' | 'user' | 'guest';
  created_at: string;
}
```

## Error Handling

All Server Actions return a standardized response:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Usage:

```typescript
const result = await createPost(data);

if (!result.success) {
  console.error(result.error);
  // Handle error
}
```

## Row-Level Security (RLS)

All database queries are protected by RLS policies:

- **Anonymous**: Can read public posts only
- **Authenticated**: Can create posts, read based on visibility
- **Moderators**: Can manage posts in their boards
- **Admins**: Full access

See `supabase/migrations/001_initial_schema.sql` for policy definitions.
