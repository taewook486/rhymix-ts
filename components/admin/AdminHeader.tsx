import { User } from '@supabase/supabase-js'
import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AdminHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Breadcrumb placeholder */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold">Admin Panel</h1>
      </div>

      {/* Search */}
      <div className="hidden md:flex w-64">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full pl-8"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <div className="hidden md:block text-sm text-muted-foreground">
          {user.email}
        </div>
      </div>
    </header>
  )
}
