'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink, Copy, Check, Loader2, AlertCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  supabaseConfigSchema,
  type SupabaseConfigFormData,
  InstallationStep,
} from '@/lib/install/types'
import { validateSupabaseConnection } from '@/lib/install/actions'

// Local Supabase default credentials (matches .env.local)
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'
const LOCAL_SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

export function SupabaseClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'url' | 'key' | null>(null)
  const [isLocalDev, setIsLocalDev] = useState(false)

  const form = useForm<SupabaseConfigFormData>({
    resolver: zodResolver(supabaseConfigSchema),
    defaultValues: {
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  })

  // Auto-detect and pre-fill local development credentials
  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    setIsLocalDev(isLocal)
    if (isLocal) {
      form.reset({
        supabaseUrl: LOCAL_SUPABASE_URL,
        supabaseAnonKey: LOCAL_SUPABASE_ANON_KEY,
      })
    }
  }, [form])

  const handleUseLocalCredentials = () => {
    form.reset({
      supabaseUrl: LOCAL_SUPABASE_URL,
      supabaseAnonKey: LOCAL_SUPABASE_ANON_KEY,
    })
  }

  const handleCopy = (text: string, field: 'url' | 'key') => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const onSubmit = async (data: SupabaseConfigFormData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await validateSupabaseConnection(data)

      if (result.success) {
        // Save to .env.local hint
        router.push('/install/admin')
      } else {
        setError(result.error || 'Failed to validate Supabase connection')
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
      currentStep={InstallationStep.SUPABASE}
      onNext={form.handleSubmit(onSubmit)}
      nextDisabled={!form.formState.isValid}
      nextLoading={loading}
      nextLabel="Validate & Continue"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Supabase Setup Required</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              You need a Supabase project to use Rhymix TS. If you don&apos;t have one:
            </p>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              <li>Go to Supabase and create a new project</li>
              <li>Run the provided migrations in the SQL Editor</li>
              <li>Copy your project URL and Anon Key from Settings → API</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Local development shortcut */}
        {isLocalDev && (
          <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">Local Development Detected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseLocalCredentials}
                className="text-xs"
              >
                <Download className="mr-2 h-3 w-3" />
                Auto-fill Local Credentials
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Running on localhost. Click the button to auto-fill your local Supabase credentials.
            </p>
          </div>
        )}

        {/* Environment variables hint */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Environment Variables</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                handleCopy(
                  `NEXT_PUBLIC_SUPABASE_URL=${form.getValues('supabaseUrl') || 'your-project-url'}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${form.getValues('supabaseAnonKey') || 'your-anon-key'}`,
                  'url'
                )
              }
            >
              {copied === 'url' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded bg-background p-3 text-xs">
            <code>
              {`NEXT_PUBLIC_SUPABASE_URL=${form.watch('supabaseUrl') || 'your-project-url'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${form.watch('supabaseAnonKey') ? '***' : 'your-anon-key'}`}
            </code>
          </pre>
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supabaseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supabase Project URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://your-project.supabase.co or http://127.0.0.1:54321"
                      {...field}
                      data-testid="input-supabase-url"
                    />
                  </FormControl>
                  <FormDescription>
                    Production: Project Settings → API → Project URL | Local: http://127.0.0.1:54321
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supabaseAnonKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supabase Anon Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      {...field}
                      data-testid="input-supabase-key"
                    />
                  </FormControl>
                  <FormDescription>
                    Found in Project Settings → API → Project API keys → anon public
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Supabase link */}
        <div className="flex justify-center">
          <Button
            variant="link"
            asChild
            className="text-muted-foreground"
          >
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Supabase Dashboard
            </a>
          </Button>
        </div>
      </div>
    </InstallLayout>
  )
}
