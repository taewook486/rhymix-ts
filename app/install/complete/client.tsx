'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Home, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InstallLayout } from '@/components/install/InstallLayout'
import { InstallationStep } from '@/lib/install/types'
import { finalizeInstallation } from '@/lib/install/actions'

export function CompleteClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const completeInstallation = async () => {
      try {
        const result = await finalizeInstallation()

        if (result.success) {
          setCompleted(true)
        } else {
          setError(result.error || 'Failed to complete installation')
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred'
        )
      } finally {
        setLoading(false)
      }
    }

    completeInstallation()
  }, [])

  const handleGoHome = () => {
    router.push('/')
  }

  const handleGoAdmin = () => {
    router.push('/admin')
  }

  return (
    <InstallLayout
      currentStep={InstallationStep.COMPLETE}
      hideBack={true}
      hideNext={true}
    >
      <div className="space-y-6">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg">Finalizing installation...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Success state */}
        {completed && !loading && (
          <div className="space-y-6">
            {/* Success icon and message */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Installation Complete!</h2>
              <p className="mt-2 text-center text-muted-foreground">
                Your Rhymix TS installation is now ready.
                <br />
                You can start building your community platform.
              </p>
            </div>

            {/* Quick links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={handleGoHome}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Visit Homepage</h3>
                    <p className="text-sm text-muted-foreground">
                      View your new site
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={handleGoAdmin}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Admin Panel</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your site
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Next steps */}
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="mb-3 font-medium">Recommended Next Steps</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    1
                  </span>
                  <span>Verify your admin email address in Supabase</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    2
                  </span>
                  <span>Configure additional site settings in the admin panel</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    3
                  </span>
                  <span>Create boards and categories for your community</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    4
                  </span>
                  <span>Set up email notifications if needed</span>
                </li>
              </ul>
            </div>

            {/* Go home button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={handleGoHome}
                className="min-w-[200px]"
                data-testid="button-go-home"
              >
                <Home className="mr-2 h-5 w-5" />
                Go to Homepage
              </Button>
            </div>
          </div>
        )}
      </div>
    </InstallLayout>
  )
}
