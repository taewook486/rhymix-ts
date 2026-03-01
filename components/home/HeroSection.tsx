'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileText, Users, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'

interface HeroSectionProps {
  locale: string
  title: string
  subtitle: string
  description: string
  ctaText: string
  ctaLink: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
}

export function HeroSection({
  locale,
  title,
  subtitle,
  description,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
}: HeroSectionProps) {
  const localePrefix = `/${locale}`

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Animated title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
          >
            {title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl text-primary font-medium mb-4"
          >
            {subtitle}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            {description}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href={`${localePrefix}${ctaLink}`}>
              <Button size="lg" className="gap-2">
                {ctaText}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {secondaryCtaText && secondaryCtaLink && (
              <Link href={`${localePrefix}${secondaryCtaLink}`}>
                <Button size="lg" variant="outline" className="gap-2">
                  {secondaryCtaText}
                </Button>
              </Link>
            )}
          </motion.div>
        </div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-4 p-4 rounded-lg bg-card border">
            <div className="p-2 rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Rich Content</h3>
              <p className="text-sm text-muted-foreground">WYSIWYG editor support</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-card border">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Community</h3>
              <p className="text-sm text-muted-foreground">Member profiles & groups</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-card border">
            <div className="p-2 rounded-full bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Communication</h3>
              <p className="text-sm text-muted-foreground">Comments & messaging</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
