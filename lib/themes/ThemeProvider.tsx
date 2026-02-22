'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Theme {
  id: string
  name: string
  title: string
  description?: string
  config: Record<string, any>
  is_active: boolean
}

interface ThemeContextValue {
  theme: Theme | null
  setTheme: (theme: Theme) => void
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadActiveTheme()
  }, [])

  const loadActiveTheme = async () => {
    try {
      const supabase = createClient()

      // Get active theme
      const { data: themeData, error: themeError } = await supabase
        .from('site_themes')
        .select('*')
        .eq('is_active', true)
        .single()

      if (themeError && themeError.code !== 'PGRST116') {
        throw themeError
      }

      if (themeData) {
        setThemeState({
          id: themeData.id,
          name: themeData.name,
          title: themeData.title,
          description: themeData.description || undefined,
          config: themeData.config,
          is_active: themeData.is_active,
        })

        // Apply CSS variables
        applyThemeVariables(themeData.config)
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyThemeVariables = (config: Record<string, any>) => {
    const root = document.documentElement

    // Apply primary color
    if (config.primary_color) {
      root.style.setProperty('--primary', config.primary_color)
    }

    // Apply secondary color
    if (config.secondary_color) {
      root.style.setProperty('--secondary', config.secondary_color)
    }

    // Apply background color
    if (config.background_color) {
      root.style.setProperty('--background', config.background_color)
    }

    // Apply border radius
    if (config.border_radius) {
      root.style.setProperty('--radius', config.border_radius)
    }

    // Apply custom CSS
    if (config.custom_css) {
      const existingStyle = document.getElementById('theme-custom-css')
      if (existingStyle) {
        existingStyle.remove()
      }

      const style = document.createElement('style')
      style.id = 'theme-custom-css'
      style.textContent = config.custom_css
      document.head.appendChild(style)
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    applyThemeVariables(newTheme.config)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
