'use client'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-900 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-zinc-500',
          actionButton:
            'group-[.toast]:bg-zinc-900 group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-500',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
