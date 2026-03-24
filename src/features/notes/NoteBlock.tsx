import { memo, useRef, useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import {
  Bold,
  Circle,
  Code2,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Unlink,
  Undo2,
  X,
} from 'lucide-react'
import type { Note } from '../../state/models'
import { useLuminaStore } from '../../state/store'

type NoteBlockProps = {
  note: Note
  isEditing: boolean
  isLinkSource: boolean
  isLinkTargetMode: boolean
  onSelect: (noteId: string) => void
  onStartLink: (noteId: string) => void
}

const toolbarButtonClass = (isActive: boolean) => {
  const base =
    'rounded-full p-1.5 text-text-secondary transition hover:bg-window/75 hover:text-text-primary'
  return isActive ? `${base} bg-accent-soft text-accent` : base
}

const toolbarActionClass =
  'rounded-full p-1.5 text-text-secondary transition hover:bg-window/75 hover:text-text-primary text-center'

export const NoteBlock = memo(function NoteBlock({
  note,
  isEditing,
  isLinkSource,
  isLinkTargetMode,
  onSelect,
  onStartLink,
}: NoteBlockProps) {
  const canvasState = useLuminaStore((s) => s.canvasState)
  const upsertNote = useLuminaStore((s) => s.upsertNote)
  const updateNotePosition = useLuminaStore((s) => s.updateNotePosition)
  const updateNoteSize = useLuminaStore((s) => s.updateNoteSize)
  const bringNoteToFront = useLuminaStore((s) => s.bringNoteToFront)
  const setCanvasEditingNoteId = useLuminaStore((s) => s.setCanvasEditingNoteId)

  const editorRef = useRef<HTMLDivElement | null>(null)
  const blockRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const resizeStartRef = useRef<{
    x: number
    y: number
    startWidth: number
    startHeight: number
    startX: number
    startY: number
    handle: string
  } | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: note.content,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      upsertNote({
        id: note.id,
        content,
      })
    },
  })

  useEffect(() => {
    if (editor && note.content !== editor.getHTML() && !isEditing) {
      editor.commands.setContent(note.content)
    }
  }, [note.content, editor, isEditing])

  useEffect(() => {
    if (!isEditing || !editor) return
    editor.commands.focus('end')
  }, [isEditing, editor])

  useEffect(() => {
    if (!editor) return

    editor.setEditable(isEditing)
    if (!isEditing) {
      editor.commands.blur()
    }
  }, [editor, isEditing])

  const handleBlockClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    onSelect(note.id)
  }

  const handleBlur = () => {
    setCanvasEditingNoteId(null)
  }

  const runToolbarCommand = (command: () => void) => (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    command()
  }

  const handleToolbarWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!toolbarRef.current) return

    e.preventDefault()
    e.stopPropagation()

    const horizontalDelta = Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY
    toolbarRef.current.scrollLeft += horizontalDelta
  }

  const textColorPresets = ['#111827', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed']
  const activeTextColor = (editor?.getAttributes('textStyle').color as string | undefined)?.toLowerCase() ?? ''

  const handleSetLink = () => {
    if (!editor) return

    const currentUrl = (editor.getAttributes('link').href as string | undefined) ?? 'https://'
    const input = window.prompt('Enter link URL', currentUrl)
    if (input === null) return

    const trimmed = input.trim()
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    if (/^javascript:/i.test(normalized)) return

    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()

    if (isEditing || isResizing) return
    if (e.button !== 0) return
    if (document.body.dataset.canvasPan === '1') return
    if ((e.target as HTMLElement)?.closest('[data-resizer]')) return

    e.preventDefault()
    setIsDragging(true)
    bringNoteToFront(note.id)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return

    e.stopPropagation()
    e.preventDefault()

    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y

    const canvasDeltaX = deltaX / canvasState.zoom
    const canvasDeltaY = deltaY / canvasState.zoom

    updateNotePosition(note.id, note.x + canvasDeltaX, note.y + canvasDeltaY)

    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.stopPropagation()
      setIsDragging(false)
      dragStartRef.current = null
    }
  }

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startWidth: note.width,
      startHeight: note.height,
      startX: note.x,
      startY: note.y,
      handle,
    }
  }

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing || !resizeStartRef.current) return

    e.stopPropagation()

    const deltaX = e.clientX - resizeStartRef.current.x
    const deltaY = e.clientY - resizeStartRef.current.y

    const canvasDeltaX = deltaX / canvasState.zoom
    const canvasDeltaY = deltaY / canvasState.zoom

    const handle = resizeStartRef.current.handle
    let newWidth = resizeStartRef.current.startWidth
    let newHeight = resizeStartRef.current.startHeight
    let newX = resizeStartRef.current.startX
    let newY = resizeStartRef.current.startY

    if (handle === 'top') {
      newY = resizeStartRef.current.startY + canvasDeltaY
      newHeight = Math.max(80, resizeStartRef.current.startHeight - canvasDeltaY)
    } else if (handle === 'bottom') {
      newHeight = Math.max(80, resizeStartRef.current.startHeight + canvasDeltaY)
    } else if (handle === 'left') {
      newX = resizeStartRef.current.startX + canvasDeltaX
      newWidth = Math.max(150, resizeStartRef.current.startWidth - canvasDeltaX)
    } else if (handle === 'right') {
      newWidth = Math.max(150, resizeStartRef.current.startWidth + canvasDeltaX)
    } else if (handle === 'top-left') {
      newX = resizeStartRef.current.startX + canvasDeltaX
      newY = resizeStartRef.current.startY + canvasDeltaY
      newWidth = Math.max(150, resizeStartRef.current.startWidth - canvasDeltaX)
      newHeight = Math.max(80, resizeStartRef.current.startHeight - canvasDeltaY)
    } else if (handle === 'top-right') {
      newY = resizeStartRef.current.startY + canvasDeltaY
      newWidth = Math.max(150, resizeStartRef.current.startWidth + canvasDeltaX)
      newHeight = Math.max(80, resizeStartRef.current.startHeight - canvasDeltaY)
    } else if (handle === 'bottom-left') {
      newX = resizeStartRef.current.startX + canvasDeltaX
      newWidth = Math.max(150, resizeStartRef.current.startWidth - canvasDeltaX)
      newHeight = Math.max(80, resizeStartRef.current.startHeight + canvasDeltaY)
    } else if (handle === 'bottom-right') {
      newWidth = Math.max(150, resizeStartRef.current.startWidth + canvasDeltaX)
      newHeight = Math.max(80, resizeStartRef.current.startHeight + canvasDeltaY)
    }

    updateNotePosition(note.id, newX, newY)
    updateNoteSize(note.id, newWidth, newHeight)
  }

  const handleResizeUp = () => {
    setIsResizing(false)
    resizeStartRef.current = null
  }

  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (e: MouseEvent) => {
      if (!blockRef.current?.contains(e.target as Node)) {
        handleBlur()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing])

  useEffect(() => {
    if (!isDragging) return

    const prevUserSelect = document.body.style.userSelect
    const prevWebkitUserSelect = document.body.style.webkitUserSelect
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    return () => {
      document.body.style.userSelect = prevUserSelect
      document.body.style.webkitUserSelect = prevWebkitUserSelect
    }
  }, [isDragging])

  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleBlur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing])

  if (!editor) return null

  return (
    <div
      data-note-block
      data-note-id={note.id}
      ref={blockRef}
      className={`absolute ${isEditing ? 'cursor-auto' : 'cursor-grab active:cursor-grabbing select-none'} transition-shadow`}
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.width}px`,
        height: `${note.height}px`,
        zIndex: note.zIndex,
        pointerEvents: 'auto',
      }}
      onClick={handleBlockClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className={`h-full w-full rounded-[22px] border transition ${
          isEditing
            ? 'border-accent-soft bg-panel shadow-[0_24px_50px_-22px_rgba(15,23,42,0.38)]'
            : isLinkSource
              ? 'border-accent bg-input shadow-md'
              : isLinkTargetMode
                ? 'border-green-500 bg-input shadow-md'
                : 'border-border-subtle bg-input shadow-sm hover:border-border-strong hover:shadow-md'
        }`}
      >
        <button
          type="button"
          className={`absolute -right-2 top-1/2 z-20 h-4 w-4 -translate-y-1/2 rounded-full border-2 transition ${
            isLinkSource
              ? 'border-accent bg-accent'
              : isLinkTargetMode
                ? 'border-green-500 bg-green-500'
                : 'border-border-strong bg-window hover:border-accent'
          }`}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onStartLink(note.id)
          }}
          title="Drag to connect cards"
        />

        {isEditing && editor && (
          <div
            ref={toolbarRef}
            className="lumina-panel absolute -top-10 left-2 right-2 z-20 flex items-center gap-1 overflow-x-auto overflow-y-hidden rounded-full px-2 py-1.5 backdrop-blur"
            onWheel={handleToolbarWheel}
          >
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().setParagraph().run())} className={toolbarButtonClass(editor.isActive('paragraph'))} title="Paragraph">
              <Pilcrow size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleBold().run())} className={toolbarButtonClass(editor.isActive('bold'))} title="Bold (Ctrl+B)">
              <Bold size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleItalic().run())} className={toolbarButtonClass(editor.isActive('italic'))} title="Italic (Ctrl+I)">
              <Italic size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleStrike().run())} className={toolbarButtonClass(editor.isActive('strike'))} title="Strikethrough">
              <Strikethrough size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleUnderline().run())} className={toolbarButtonClass(editor.isActive('underline'))} title="Underline">
              <UnderlineIcon size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleHighlight({ color: '#fde68a' }).run())} className={toolbarButtonClass(editor.isActive('highlight'))} title="Highlight">
              <Highlighter size={12} />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run())} className={toolbarButtonClass(editor.isActive('heading', { level: 1 }))} title="Heading 1">
              <Heading1 size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} className={toolbarButtonClass(editor.isActive('heading', { level: 2 }))} title="Heading 2">
              <Heading2 size={12} />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleBulletList().run())} className={toolbarButtonClass(editor.isActive('bulletList'))} title="Bullet List">
              <List size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleOrderedList().run())} className={toolbarButtonClass(editor.isActive('orderedList'))} title="Numbered List">
              <ListOrdered size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleTaskList().run())} className={toolbarButtonClass(editor.isActive('taskList'))} title="Task List">
              <ListChecks size={12} />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleBlockquote().run())} className={toolbarButtonClass(editor.isActive('blockquote'))} title="Blockquote">
              <Quote size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().toggleCode().run())} className={toolbarButtonClass(editor.isActive('code'))} title="Inline Code">
              <Code2 size={12} />
            </button>
            <button
              type="button"
              onMouseDown={runToolbarCommand(handleSetLink)}
              className={toolbarButtonClass(editor.isActive('link'))}
              title="Add/Edit Link"
            >
              <Link2 size={12} />
            </button>
            <button
              type="button"
              onMouseDown={runToolbarCommand(() => editor.chain().focus().extendMarkRange('link').unsetLink().run())}
              className={toolbarActionClass}
              title="Remove Link"
            >
              <Unlink size={12} />
            </button>
            {textColorPresets.map((color) => (
              <button
                key={color}
                type="button"
                onMouseDown={runToolbarCommand(() => editor.chain().focus().setColor(color).run())}
                className={`${toolbarActionClass} ${activeTextColor === color ? 'ring-1 ring-accent' : ''}`}
                title={`Set color ${color}`}
              >
                <Circle size={12} fill={color} color={color} />
              </button>
            ))}
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().unsetColor().run())} className={toolbarActionClass} title="Clear text color">
              <X size={12} />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().undo().run())} className={toolbarActionClass} title="Undo (Ctrl+Z)">
              <Undo2 size={12} />
            </button>
            <button type="button" onMouseDown={runToolbarCommand(() => editor.chain().focus().redo().run())} className={toolbarActionClass} title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={12} />
            </button>
            <div className="flex-1" />
          </div>
        )}

        <div
          ref={editorRef}
          className={`h-full overflow-hidden rounded-[22px] ${isEditing ? '' : 'overflow-y-auto'}`}
          onClick={(e) => {
            if (!isEditing) return
            e.stopPropagation()
          }}
        >
          <EditorContent
            editor={editor}
            className={`rich-note-editor prose prose-sm max-w-none ${isEditing ? 'focus:outline-none' : ''}`}
            style={{
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'var(--font-ui)',
            }}
          />
        </div>
      </div>

      {isEditing && (
        <>
          <div className="absolute left-1/2 top-0 h-1 w-8 -translate-x-1/2 cursor-ns-resize rounded-full transition hover:bg-accent-soft" onPointerDown={(e) => handleResizeStart(e, 'top')} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerLeave={handleResizeUp} />
          <div className="absolute bottom-0 left-1/2 h-1 w-8 -translate-x-1/2 cursor-ns-resize rounded-full transition hover:bg-accent-soft" onPointerDown={(e) => handleResizeStart(e, 'bottom')} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerLeave={handleResizeUp} />
          <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 cursor-ew-resize rounded-full transition hover:bg-accent-soft" onPointerDown={(e) => handleResizeStart(e, 'left')} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerLeave={handleResizeUp} />
          <div className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 cursor-ew-resize rounded-full transition hover:bg-accent-soft" onPointerDown={(e) => handleResizeStart(e, 'right')} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerLeave={handleResizeUp} />
          <div className="absolute left-0 top-0 h-2.5 w-2.5 cursor-nwse-resize rounded-full bg-accent transition hover:scale-110" onPointerDown={(e) => handleResizeStart(e, 'top-left')} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerLeave={handleResizeUp} />
          <div className="absolute right-0 top-0 h-2.5 w-2.5 cursor-nesw-resize rounded-full bg-accent transition hover:scale-110" onPointerDown={(e) => handleResizeStart(e, 'top-right')} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerLeave={handleResizeUp} />
          <div className="absolute bottom-0 left-0 h-2.5 w-2.5 cursor-nesw-resize rounded-full bg-accent transition hover:scale-110" onPointerDown={(e) => handleResizeStart(e, 'bottom-left')} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerLeave={handleResizeUp} />
          <div className="absolute bottom-0 right-0 h-2.5 w-2.5 cursor-se-resize rounded-full bg-accent transition hover:scale-110" onPointerDown={(e) => handleResizeStart(e, 'bottom-right')} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerLeave={handleResizeUp} />
        </>
      )}
    </div>
  )
})
