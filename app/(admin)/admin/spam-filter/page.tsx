import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function AdminSpamFilterPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spam Filter</h1>
          <p className="text-muted-foreground">Manage spam filters and blocked IPs</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Filter
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Blocked IP Addresses</CardTitle>
            <CardDescription>
              IP addresses blocked from posting content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No blocked IP addresses configured. Add IP addresses or ranges to block
              spam and malicious users from posting content.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Word Filter</CardTitle>
            <CardDescription>
              Words and patterns blocked from content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No word filters configured. Add words or regex patterns to block
              spam content from being posted.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CAPTCHA Settings</CardTitle>
            <CardDescription>
              Configure CAPTCHA protection for forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              CAPTCHA configuration will be available in a future update.
              This includes reCAPTCHA and hCaptcha integration options.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
