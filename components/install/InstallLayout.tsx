'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StepIndicator } from './StepIndicator'
import {
  InstallationStepType,
  stepLabels,
  stepDescriptions,
} from '@/lib/install/types'

interface InstallLayoutProps {
  children: React.ReactNode
  currentStep: InstallationStepType
  title?: string
  description?: string
  onNext?: () => void | Promise<void>
  onBack?: () => void | Promise<void>
  nextDisabled?: boolean
  nextLoading?: boolean
  nextLabel?: string
  backDisabled?: boolean
  backLoading?: boolean
  hideBack?: boolean
  hideNext?: boolean
}

export function InstallLayout({
  children,
  currentStep,
  title,
  description,
  onNext,
  onBack,
  nextDisabled = false,
  nextLoading = false,
  nextLabel = 'Next',
  backDisabled = false,
  backLoading = false,
  hideBack = false,
  hideNext = false,
}: InstallLayoutProps) {
  const router = useRouter()

  const handleBack = async () => {
    if (onBack) {
      await onBack()
    } else {
      // Default back navigation
      const prevStep = currentStep - 1
      if (prevStep >= 1) {
        const routes = ['', 'welcome', 'supabase', 'admin', 'config', 'complete']
        router.push(`/install/${routes[prevStep]}`)
      }
    }
  }

  const handleNext = async () => {
    if (onNext) {
      await onNext()
    }
  }

  const displayTitle = title || stepLabels[currentStep]
  const displayDescription = description || stepDescriptions[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Rhymix TS</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Installation Wizard
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <StepIndicator currentStep={currentStep} />
        </div>

        {/* Main content card */}
        <Card data-testid={`install-step-${currentStep}`}>
          <CardHeader>
            <CardTitle className="text-xl">{displayTitle}</CardTitle>
            {displayDescription && (
              <p className="text-sm text-muted-foreground">
                {displayDescription}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {children}

            {/* Navigation buttons */}
            <div className="mt-6 flex items-center justify-between border-t pt-6">
              <div>
                {!hideBack && currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={backDisabled || backLoading}
                    data-testid="button-back"
                  >
                    {backLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowLeft className="mr-2 h-4 w-4" />
                    )}
                    Back
                  </Button>
                )}
              </div>

              <div>
                {!hideNext && onNext && (
                  <Button
                    onClick={handleNext}
                    disabled={nextDisabled || nextLoading}
                    data-testid="button-next"
                  >
                    {nextLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="ml-2 h-4 w-4" />
                    )}
                    {nextLabel}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Rhymix TS v0.1.0 - Modern CMS Platform</p>
        </div>
      </div>
    </div>
  )
}
