'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, CheckCircle2, Settings, Users, Globe, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InstallLayout } from '@/components/install/InstallLayout'
import { InstallationStep } from '@/lib/install/types'

const features = [
  {
    icon: Zap,
    title: 'Modern Stack',
    description: 'Built with Next.js 16, React 19, and Supabase for optimal performance',
  },
  {
    icon: Settings,
    title: 'Flexible Configuration',
    description: 'Customize every aspect of your community platform',
  },
  {
    icon: Users,
    title: 'User Management',
    description: 'Comprehensive user roles, permissions, and authentication',
  },
  {
    icon: Globe,
    title: 'Multi-language Support',
    description: 'Built-in internationalization for global communities',
  },
]

export function WelcomeClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    // Navigate to Supabase setup
    router.push('/install/supabase')
  }

  return (
    <InstallLayout
      currentStep={InstallationStep.WELCOME}
      hideBack={true}
      hideNext={true}
    >
      <div className="space-y-6">
        {/* Welcome message */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Welcome to Rhymix TS</h2>
          <p className="mt-3 text-muted-foreground">
            This wizard will guide you through setting up your community platform.
            The installation process takes about 5 minutes.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title} className="border-muted">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Installation steps preview */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="mb-3 font-medium">Installation Steps</h3>
          <ul className="space-y-2">
            {[
              'Configure Supabase database connection',
              'Create administrator account',
              'Set up site configuration',
              'Complete installation',
            ].map((step, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Requirements notice */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/50">
          <h3 className="mb-2 font-medium text-yellow-800 dark:text-yellow-200">
            Before You Begin
          </h3>
          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            <li>- A Supabase project with database set up</li>
            <li>- Supabase project URL and Anon Key</li>
            <li>- Valid email address for admin account</li>
          </ul>
        </div>

        {/* Start button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={loading}
            className="min-w-[200px]"
            data-testid="button-start-installation"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-5 w-5" />
            )}
            Get Started
          </Button>
        </div>
      </div>
    </InstallLayout>
  )
}
