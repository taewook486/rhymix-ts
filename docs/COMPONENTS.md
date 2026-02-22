# Component Documentation

This document describes the reusable components available in Rhymix TypeScript.

## Table of Contents

- [UI Components](#ui-components)
- [Form Components](#form-components)
- [Layout Components](#layout-components)
- [Widget Components](#widget-components)
- [Poll Components](#poll-components)

---

## UI Components

Location: `components/ui/`

Based on [shadcn/ui](https://ui.shadcn.com).

### Button

```tsx
import { Button } from '@/components/ui/button'

<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="sm">Small</Button>
<Button variant="ghost" size="icon">
  <Icon name="plus" />
</Button>
```

**Variants**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**Sizes**: `default`, `sm`, `lg`, `icon`

### Card

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content</p>
  </CardContent>
</Card>
```

### Input

```tsx
import { Input } from '@/components/ui/input'

<Input type="text" placeholder="Enter text..." />
```

### Textarea

```tsx
import { Textarea } from '@/components/ui/textarea'

<Textarea placeholder="Enter multiple lines..." rows={5} />
```

### Dialog

```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
  </DialogContent>
</Dialog>
```

### Toast

```tsx
import { useToast } from '@/hooks/use-toast'

function Component() {
  const { toast } = useToast()

  return (
    <Button
      onClick={() => {
        toast({
          title: 'Success',
          description: 'Action completed successfully',
        })
      }}
    >
      Show Toast
    </Button>
  )
}
```

---

## Form Components

### PostForm

Location: `components/board/PostForm.tsx`

Form for creating and editing forum posts.

```tsx
import { PostForm } from '@/components/board/PostForm'

<PostForm
  boardId="board-123"
  onSubmit={async (data) => {
    const result = await createPost(data)
    return result
  }}
/>
```

**Props:**
- `boardId`: string - Board ID
- `post?: Post` - Optional post data for editing
- `categories?: Category[]` - Available categories
- `onSubmit`: (data: CreatePostInput) => Promise<ApiResponse<Post>>

### DocumentForm

Location: `components/documents/DocumentForm.tsx`

Form for creating and editing documents.

```tsx
import { DocumentForm } from '@/components/documents/DocumentForm'

<DocumentForm
  onSubmit={async (data) => {
    const result = await createDocument(data)
    return result
  }}
/>
```

**Props:**
- `document?: Document` - Optional document data for editing
- `categories?: DocumentCategory[]` - Available categories
- `onSubmit`: (data: CreateDocumentInput) => Promise<ApiResponse<Document>>

---

## Layout Components

Location: `components/layout/`

### MainNav

Main navigation component with authentication-aware links.

```tsx
import { MainNav } from '@/components/layout/MainNav'

<MainNav />
```

### Footer

Site footer with copyright and navigation links.

```tsx
import { Footer } from '@/components/layout/Footer'

<Footer />
```

### DefaultLayout

Default layout with header, main content, sidebar, and footer.

```tsx
import { DefaultLayout } from '@/components/layouts/DefaultLayout'

<DefaultLayout>
  <PageContent />
</DefaultLayout>
```

---

## Widget Components

Location: `components/widgets/`

### WidgetRenderer

Renders widgets for a specific position.

```tsx
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer'

<WidgetRenderer position="sidebar" />
```

**Positions:** `header`, `sidebar`, `footer`, `content_top`, `content_bottom`

### Built-in Widgets

#### LatestPostsWidget

```tsx
<LatestPostsWidget
  config={{
    title: 'Recent Posts',
    count: 5,
    boardId: 'board-123'
  }}
/>
```

#### LoginFormWidget

```tsx
<LoginFormWidget
  config={{
    title: 'Login'
  }}
/>
```

#### CalendarWidget

```tsx
<CalendarWidget
  config={{
    title: 'Calendar',
    showNavigation: true
  }}
/>
```

#### BannerWidget

```tsx
<BannerWidget
  config={{
    imageUrl: '/banner.jpg',
    linkUrl: '/about',
    alt: 'Banner'
  }}
/>
```

#### PopularPostsWidget

```tsx
<PopularPostsWidget
  config={{
    title: 'Popular Posts',
    count: 5,
    period: 'week' // 'day' | 'week' | 'month'
  }}
/>
```

---

## Poll Components

Location: `components/polls/`

### PollDisplay

Interactive poll voting component.

```tsx
import { PollDisplay } from '@/components/polls/PollDisplay'

<PollDisplay pollId="poll-123" />
```

### PollCreator

Admin interface for creating polls.

```tsx
import { PollCreator } from '@/components/polls/PollCreator'

<PollCreator />
```

---

## Utility Hooks

### useToast

Toast notification hook.

```tsx
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

toast({
  title: 'Success',
  description: 'Operation completed',
  variant: 'default', // 'default' | 'destructive'
})
```

---

## Type Definitions

```typescript
// Common component props
interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// Async action result
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

---

## Usage Examples

### Creating a new page with components

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'

export default function MyPage() {
  return (
    <DefaultLayout>
      <Card>
        <CardHeader>
          <CardTitle>Page Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Page content</p>
          <Button>Action</Button>
        </CardContent>
      </Card>
    </DefaultLayout>
  )
}
```

### Using server actions with forms

```tsx
'use client'

import { useState } from 'react'
import { createPost } from '@/app/actions/post'
import { useToast } from '@/hooks/use-toast'

export function CreatePostForm({ boardId }: { boardId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)

    const result = await createPost({
      board_id: boardId,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    })

    if (result.success) {
      toast({ title: 'Post created' })
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      })
    }

    setIsSubmitting(false)
  }

  return (
    <form action={handleSubmit}>
      <input name="title" required />
      <textarea name="content" required />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Post'}
      </Button>
    </form>
  )
}
```
