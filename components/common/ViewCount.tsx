import { Badge } from '@/components/ui/badge'
import { Eye } from 'lucide-react'
import { getViewCount } from '@/app/actions/view-count'
import { useEffect, useState } from 'react'

import type { ViewCountRecord } from '@/app/actions/view-count'

interface ViewCountProps {
  targetType: 'post' | 'document' | 'page' | 'comment'
  targetId: string
  className?: string
}

export function ViewCount({
  targetType,
  targetId,
  className,
}: ViewCountProps) {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadViewCount()
  }, [targetType, targetId])

  const loadViewCount = async () => {
    setIsLoading(true)
    const result = await getViewCount(targetType, targetId)

    if (result.success) {
      setCount(result.data || 0)
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return null
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Eye className="h-3 w-3" />
        <span>{count.toLocaleString()}</span>
      </div>
    </div>
  )
}
