'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { toggleModule } from '@/app/actions/modules'
import { useToast } from '@/hooks/use-toast'

interface ToggleModuleButtonProps {
  moduleId: string
  isEnabled: boolean
  isSystem: boolean
}

export function ToggleModuleButton({ moduleId, isEnabled, isSystem }: ToggleModuleButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    // Prevent toggling system modules
    if (isSystem) {
      toast({
        title: 'Error',
        description: 'Cannot disable system modules',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await toggleModule(moduleId)

      if (result.success) {
        toast({
          title: 'Success',
          description: result.data?.is_enabled ? 'Module enabled' : 'Module disabled'
        })
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to toggle module',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading || isSystem}
      title={isSystem ? 'System modules cannot be disabled' : isEnabled ? 'Disable module' : 'Enable module'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isEnabled ? (
        <ToggleRight className="h-4 w-4 text-green-500" />
      ) : (
        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  )
}
