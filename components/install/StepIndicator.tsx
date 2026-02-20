'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  InstallationStepType,
  stepLabels,
} from '@/lib/install/types'

interface StepIndicatorProps {
  currentStep: InstallationStepType
  className?: string
}

export function StepIndicator({ currentStep, className }: StepIndicatorProps) {
  const steps = [1, 2, 3, 4, 5] as const

  return (
    <nav aria-label="Installation progress" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep
          const isLast = index === steps.length - 1

          return (
            <li key={step} className="flex-1">
              <div className="flex items-center">
                <div className="flex flex-col items-center">
                  {/* Step circle */}
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                      {
                        'border-primary bg-primary text-primary-foreground': isCurrent || isCompleted,
                        'border-muted-foreground/30 bg-background text-muted-foreground':
                          !isCurrent && !isCompleted,
                      }
                    )}
                    data-testid={`step-indicator-${step}`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-medium">{step}</span>
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={cn('mt-2 text-xs font-medium sm:text-sm', {
                      'text-primary': isCurrent || isCompleted,
                      'text-muted-foreground': !isCurrent && !isCompleted,
                    })}
                  >
                    {stepLabels[step]}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      'mx-4 h-0.5 flex-1 transition-colors',
                      {
                        'bg-primary': isCompleted,
                        'bg-muted-foreground/30': !isCompleted,
                      }
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
