export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="container mx-auto py-8">{children}</div>
    </div>
  )
}
