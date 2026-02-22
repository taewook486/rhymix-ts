'use client'

import { Card } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'

interface BannerWidgetProps {
  config: {
    title: string
    imageUrl: string
    linkUrl: string
    altText: string
    openInNewTab: boolean
  }
  title: string
}

export function BannerWidget({ config, title }: BannerWidgetProps) {
  if (!config.imageUrl) {
    return (
      <Card className="bg-muted flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-muted-foreground">배너 이미지를 설정해주세요</p>
      </Card>
    )
  }

  const banner = (
    <Card className="overflow-hidden border-0">
      <Image
        src={config.imageUrl}
        alt={config.altText || title || config.title}
        width={300}
        height={200}
        className="w-full h-auto object-cover"
      />
    </Card>
  )

  if (config.linkUrl) {
    return (
      <Link href={config.linkUrl} target={config.openInNewTab ? '_blank' : undefined} rel={config.openInNewTab ? 'noopener noreferrer' : undefined}>
        {banner}
      </Link>
    )
  }

  return banner
}
