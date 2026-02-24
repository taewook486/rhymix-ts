'use client'

import { WysiwygEditor } from './WysiwygEditor'
import { uploadEditorMedia } from '@/app/actions/editor'

// @MX:NOTE: Wrapper component for backward compatibility
// Delegates to new WysiwygEditor with image upload support
interface RichTextEditorProps {
  content: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Enter your content...',
  editable = true,
  className
}: RichTextEditorProps) {
  const handleImageUpload = async (file: File): Promise<string> => {
    const result = await uploadEditorMedia(file)
    if (!result.success || !result.url) {
      throw new Error(result.error || 'Failed to upload image')
    }
    return result.url
  }

  return (
    <WysiwygEditor
      content={content}
      onChange={onChange}
      placeholder={placeholder}
      editable={editable}
      className={className}
      onImageUpload={handleImageUpload}
    />
  )
}
