'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Link as LinkIcon,
  Image as ImageIcon,
  Code2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorToolbar } from './toolbar/EditorToolbar'
import { MediaUploader } from './MediaUploader'

// @MX:NOTE: Lowlight provides syntax highlighting for code blocks
// Supports common languages (JavaScript, TypeScript, Python, etc.)
const lowlight = createLowlight(common)

// @MX:ANCHOR: Main WYSIWYG editor component with TipTap
// @MX:REASON: Public API used by PostForm for content editing
interface WysiwygEditorProps {
  content: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  onImageUpload?: (file: File) => Promise<string>
}

export function WysiwygEditor({
  content,
  onChange,
  placeholder = 'Enter your content...',
  editable = true,
  className,
  onImageUpload,
}: WysiwygEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: false, // Use CodeBlockLowlight instead
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[300px] focus:outline-none',
      },
    },
  })

  if (!editor) {
    return (
      <div className={cn('min-h-[200px] border rounded-md p-4', className)}>
        Initializing editor...
      </div>
    )
  }

  const handleImageUpload = async (file: File) => {
    if (onImageUpload) {
      const url = await onImageUpload(file)
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className={cn('border rounded-md overflow-hidden', className)}>
      {/* Toolbar */}
      <EditorToolbar editor={editor} onImageUpload={onImageUpload ? handleImageUpload : undefined} />

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Code Block Styles */}
      <style jsx global>{`
        .ProseMirror {
          padding: 1rem;
          min-height: 300px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror code {
          background-color: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          font-size: 0.85em;
        }
        .ProseMirror pre {
          background-color: #1e1e1e;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
        }
        .ProseMirror pre code {
          background-color: transparent;
          padding: 0;
          color: #d4d4d4;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        .ProseMirror a {
          color: rgb(37 99 235);
          text-decoration: underline;
        }
        .ProseMirror a:hover {
          color: rgb(30 64 175);
        }
      `}</style>
    </div>
  )
}
