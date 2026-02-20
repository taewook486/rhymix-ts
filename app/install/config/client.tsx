'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InstallLayout } from '@/components/install/InstallLayout'
import {
  siteConfigSchema,
  type SiteConfigFormData,
  InstallationStep,
  availableTimezones,
  availableLanguages,
} from '@/lib/install/types'
import { saveConfiguration } from '@/lib/install/actions'

export function ConfigClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<SiteConfigFormData>({
    resolver: zodResolver(siteConfigSchema),
    defaultValues: {
      siteName: '',
      timezone: 'Asia/Seoul',
      language: 'ko',
    },
  })

  const onSubmit = async (data: SiteConfigFormData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await saveConfiguration(data)

      if (result.success) {
        router.push('/install/complete')
      } else {
        setError(result.error || 'Failed to save configuration')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <InstallLayout
      currentStep={InstallationStep.CONFIG}
      onNext={form.handleSubmit(onSubmit)}
      nextDisabled={!form.formState.isValid}
      nextLoading={loading}
      nextLabel="Save & Continue"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Site Configuration</AlertTitle>
          <AlertDescription>
            Configure your site&apos;s basic settings. These can be changed later in
            the admin panel.
          </AlertDescription>
        </Alert>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Site Name */}
            <FormField
              control={form.control}
              name="siteName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Community"
                      {...field}
                      data-testid="input-site-name"
                    />
                  </FormControl>
                  <FormDescription>
                    The name of your website displayed in the title bar and header
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timezone */}
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTimezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Default timezone for date/time display
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Language */}
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Language</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableLanguages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Default language for the interface
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Preview */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-medium">Preview</h4>
          <div className="rounded-lg bg-background p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-primary" />
              <span className="text-lg font-semibold">
                {form.watch('siteName') || 'Your Site Name'}
              </span>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="text-sm text-muted-foreground">
          <p>
            After installation, you can further customize your site from the
            admin panel including themes, SEO settings, and more.
          </p>
        </div>
      </div>
    </InstallLayout>
  )
}
