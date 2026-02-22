'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Save, Loader2 } from 'lucide-react'
import { updateSiteConfig } from '@/app/actions/admin'
import { useToast } from '@/hooks/use-toast'

interface Settings {
  site_name: string
  site_description: string
  timezone: string
  language: string
  meta_title: string
  meta_description: string
  allow_registration: boolean
  email_verification: boolean
  admin_approval: boolean
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    site_name: settings.site_name || '',
    site_description: settings.site_description || '',
    timezone: settings.timezone || 'Asia/Seoul',
    language: settings.language || 'ko',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.site_name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Site name is required',
      })
      return
    }

    startTransition(async () => {
      const result = await updateSiteConfig(formData)

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Settings saved successfully',
        })
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to save settings',
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="site_name">
            Site Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="site_name"
            name="site_name"
            value={formData.site_name}
            onChange={(e) => handleChange('site_name', e.target.value)}
            placeholder="My Community"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="site_description">Site Description</Label>
          <Textarea
            id="site_description"
            name="site_description"
            value={formData.site_description}
            onChange={(e) => handleChange('site_description', e.target.value)}
            placeholder="A community for sharing ideas and discussions"
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              placeholder="Asia/Seoul"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Input
              id="language"
              name="language"
              value={formData.language}
              onChange={(e) => handleChange('language', e.target.value)}
              placeholder="ko"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export function SEOSettings({ settings }: { settings: Settings }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    meta_title: settings.meta_title || '',
    meta_description: settings.meta_description || '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      const result = await updateSiteConfig(formData)

      if (result.success) {
        toast({
          title: 'Success',
          description: 'SEO settings saved successfully',
        })
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to save settings',
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="meta_title">Meta Title</Label>
        <Input
          id="meta_title"
          placeholder="Default meta title for search engines"
          value={formData.meta_title}
          onChange={(e) => handleChange('meta_title', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meta_description">Meta Description</Label>
        <Textarea
          id="meta_description"
          placeholder="Default meta description"
          rows={3}
          value={formData.meta_description}
          onChange={(e) => handleChange('meta_description', e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>
    </form>
  )
}

export function RegistrationSettings({ settings }: { settings: Settings }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    allow_registration: settings.allow_registration,
    email_verification: settings.email_verification,
    admin_approval: settings.admin_approval,
  })

  const handleToggle = (field: string, value: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      const result = await updateSiteConfig(formData)

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Registration settings saved successfully',
        })
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to save settings',
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="allow_registration">Allow Registration</Label>
          <p className="text-xs text-muted-foreground">Allow new users to register</p>
        </div>
        <Switch
          id="allow_registration"
          checked={formData.allow_registration}
          onCheckedChange={(checked) => handleToggle('allow_registration', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email_verification">Email Verification</Label>
          <p className="text-xs text-muted-foreground">Require email verification</p>
        </div>
        <Switch
          id="email_verification"
          checked={formData.email_verification}
          onCheckedChange={(checked) => handleToggle('email_verification', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="admin_approval">Admin Approval</Label>
          <p className="text-xs text-muted-foreground">Require admin approval for new accounts</p>
        </div>
        <Switch
          id="admin_approval"
          checked={formData.admin_approval}
          onCheckedChange={(checked) => handleToggle('admin_approval', checked)}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>
    </form>
  )
}
