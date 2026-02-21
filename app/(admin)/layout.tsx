import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin?redirected=/admin')
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/?error=admin_only')
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <AdminHeader user={user} />
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
