import { useEffect, useMemo, useRef, useState } from 'react'
import { BookText, Check, ChevronDown, FileText, Pencil, Plus } from 'lucide-react'
import { useLuminaStore } from '../../state/store'
import { NoteBlock } from './NoteBlock'
import { PageGraphCanvas } from './PageGraphCanvas'

type RenameTarget =
  | { type: 'notebook'; id: string }
  | { type: 'section'; id: string }
  | { type: 'page'; id: string }

type ListRowProps = {
  label: string
  active: boolean
  onClick: () => void
  onRename: () => void
  showPill?: boolean
}

const ListRow = ({ label, active, onClick, onRename, showPill = false }: ListRowProps) => (
  <button
    type="button"
    onClick={onClick}
    onDoubleClick={onRename}
    className={`mx-1.5 my-1 flex h-10 w-[calc(100%-0.75rem)] items-center gap-2 rounded-[16px] px-3 text-left text-[13px] transition ${
      active
        ? 'bg-accent-soft text-text-primary shadow-sm'
        : 'text-text-secondary hover:bg-window hover:text-text-primary'
    }`}
  >
    {showPill ? <span className="h-5 w-1 rounded-r bg-accent" /> : <FileText size={13} className="text-text-tertiary" />}
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <span
      role="button"
      tabIndex={0}
      className="rounded-full p-1 text-text-tertiary hover:bg-window hover:text-text-primary"
      onClick={(e) => {
        e.stopPropagation()
        onRename()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onRename()
        }
      }}
      aria-label={`Rename ${label}`}
    >
      <Pencil size={12} />
    </span>
  </button>
)

const ZOOM_FACTOR = 1.15
const ZOOM_MIN = 0.0005

export const NotesView = () => {
  const notebooks = useLuminaStore((s) => s.data.notebooks)
  const sections = useLuminaStore((s) => s.data.sections)
  const pages = useLuminaStore((s) => s.data.pages)
  const notes = useLuminaStore((s) => s.data.notes)
  const canvasState = useLuminaStore((s) => s.canvasState)
  const canvasEditingNoteId = useLuminaStore((s) => s.canvasEditingNoteId)

  const addNotebook = useLuminaStore((s) => s.addNotebook)
  const renameNotebook = useLuminaStore((s) => s.renameNotebook)
  const addSection = useLuminaStore((s) => s.addSection)
  const renameSection = useLuminaStore((s) => s.renameSection)
  const addPage = useLuminaStore((s) => s.addPage)
  const renamePage = useLuminaStore((s) => s.renamePage)
  const addCanvasNote = useLuminaStore((s) => s.addCanvasNote)
  const upsertNote = useLuminaStore((s) => s.upsertNote)
  const bringNoteToFront = useLuminaStore((s) => s.bringNoteToFront)
  const deleteNote = useLuminaStore((s) => s.deleteNote)
  const linkNoteToNote = useLuminaStore((s) => s.linkNoteToNote)
  const setCanvasEditingNoteId = useLuminaStore((s) => s.setCanvasEditingNoteId)
  const setPan = useLuminaStore((s) => s.setPan)
  const panBy = useLuminaStore((s) => s.panBy)
  const setZoom = useLuminaStore((s) => s.setZoom)

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const panPointerIdRef = useRef<number | null>(null)
  const currentPointerRef = useRef<{ x: number; y: number } | null>(null)
  const pendingCreateRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null)
  const spacePressed = useRef(false)
  const notebookMenuRef = useRef<HTMLDivElement | null>(null)

  const [selectedNotebookId, setSelectedNotebookId] = useState(notebooks[0]?.id ?? '')
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [selectedPageId, setSelectedPageId] = useState('')
  const [notesSidebarTab, setNotesSidebarTab] = useState<'pages' | 'graph'>('pages')
  const [isPanning, setIsPanning] = useState(false)
  const [isNotebookMenuOpen, setIsNotebookMenuOpen] = useState(false)
  const [linkDrag, setLinkDrag] = useState<{
    sourceId: string
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const notesInputClass = 'lumina-control rounded-[16px] px-3 py-2 text-[13px] text-text-primary outline-none'

  const activeNotebook = useMemo(
    () => notebooks.find((n) => n.id === selectedNotebookId) ?? notebooks[0],
    [notebooks, selectedNotebookId],
  )

  const activeSections = useMemo(
    () => sections.filter((section) => section.notebookId === selectedNotebookId),
    [sections, selectedNotebookId],
  )

  const sectionPages = useMemo(
    () => pages.filter((page) => page.sectionId === selectedSectionId),
    [pages, selectedSectionId],
  )

  const pageList = useMemo(
    () => [...sectionPages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [sectionPages],
  )

  const pageNotes = useMemo(
    () => notes.filter((note) => note.pageId === selectedPageId),
    [notes, selectedPageId],
  )

  const sortedPageNotes = useMemo(
    () => [...pageNotes].sort((a, b) => a.zIndex - b.zIndex),
    [pageNotes],
  )

  const sectionGraphPages = useMemo(
    () => pages.filter((page) => page.sectionId === selectedSectionId),
    [pages, selectedSectionId],
  )

  const pageWikilinkGraph = useMemo(() => {
    const pageById = new Map(sectionGraphPages.map((page) => [page.id, page]))
    const pageByName = new Map(sectionGraphPages.map((page) => [page.name.trim().toLowerCase(), page]))
    const edgeSet = new Set<string>()
    const wikiRegex = /\[\[([^\]]+)\]\]/g

    notes.forEach((note) => {
      if (!pageById.has(note.pageId)) return

      const matches = [...note.content.matchAll(wikiRegex)]
      matches.forEach((match) => {
        const raw = match[1]?.trim()
        if (!raw) return

        const byId = pageById.get(raw)
        const byName = pageByName.get(raw.toLowerCase())
        const target = byId ?? byName
        if (!target || target.id === note.pageId) return

        edgeSet.add(`${note.pageId}::${target.id}`)
      })
    })

    const nodes = sectionGraphPages.map((page) => ({ id: page.id, name: page.name || 'Untitled Page' }))
    const links = [...edgeSet].map((edge) => {
      const [source, target] = edge.split('::')
      return { source, target }
    })

    return { nodes, links }
  }, [notes, sectionGraphPages])

  const pageLinks = useMemo(() => {
    const noteById = new Map(sortedPageNotes.map((note) => [note.id, note]))
    return sortedPageNotes.flatMap((source) =>
      source.links
        .map((targetId) => ({ source, target: noteById.get(targetId) }))
        .filter((item): item is { source: typeof source; target: typeof source } => Boolean(item.target)),
    )
  }, [sortedPageNotes])

  useEffect(() => {
    if (!activeSections.length) {
      setSelectedSectionId('')
      return
    }

    if (!activeSections.find((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(activeSections[0].id)
    }
  }, [activeSections, selectedSectionId])

  useEffect(() => {
    if (!pageList.length) {
      setSelectedPageId('')
      return
    }

    if (!pageList.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(pageList[0].id)
    }
  }, [pageList, selectedPageId])

  useEffect(() => {
    if (!isNotebookMenuOpen) return

    const onDocClick = (event: MouseEvent) => {
      if (!notebookMenuRef.current?.contains(event.target as Node)) {
        setIsNotebookMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [isNotebookMenuOpen])

  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (!canvasEditingNoteId) return

      const active = document.activeElement as HTMLElement | null
      const isTypingField =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        active?.tagName === 'SELECT' ||
        active?.isContentEditable === true

      if (isTypingField) return

      event.preventDefault()
      deleteNote(canvasEditingNoteId)
      setCanvasEditingNoteId(null)
    }

    document.addEventListener('keydown', handleDeleteKey)
    return () => document.removeEventListener('keydown', handleDeleteKey)
  }, [canvasEditingNoteId, deleteNote, setCanvasEditingNoteId])

  const beginRename = (target: RenameTarget, currentName: string) => {
    setRenameTarget(target)
    setRenameDraft(currentName)
  }

  const cancelRename = () => {
    setRenameTarget(null)
    setRenameDraft('')
  }

  const commitRename = () => {
    if (!renameTarget) return

    const trimmed = renameDraft.trim()
    if (trimmed) {
      if (renameTarget.type === 'notebook') {
        renameNotebook(renameTarget.id, trimmed)
      } else if (renameTarget.type === 'section') {
        renameSection(renameTarget.id, trimmed)
      } else {
        renamePage(renameTarget.id, trimmed)
      }
    }

    cancelRename()
  }

  const stopPan = (currentTarget?: EventTarget | null) => {
    const target = currentTarget as HTMLDivElement | null
    if (target && panPointerIdRef.current !== null && target.hasPointerCapture(panPointerIdRef.current)) {
      target.releasePointerCapture(panPointerIdRef.current)
    }

    setIsPanning(false)
    pendingCreateRef.current = null
    currentPointerRef.current = null
    panPointerIdRef.current = null
  }

  const createNotebookInline = () => {
    const notebookId = addNotebook('Untitled Notebook')
    const sectionId = addSection(notebookId, 'Untitled Section')
    const pageId = addPage(sectionId, 'Untitled Page')

    setSelectedNotebookId(notebookId)
    setSelectedSectionId(sectionId)
    setSelectedPageId(pageId)
    beginRename({ type: 'notebook', id: notebookId }, 'Untitled Notebook')
    setIsNotebookMenuOpen(false)
  }

  const createSectionInline = () => {
    if (!selectedNotebookId) return

    const sectionId = addSection(selectedNotebookId, 'Untitled Section')
    const pageId = addPage(sectionId, 'Untitled Page')
    setSelectedSectionId(sectionId)
    setSelectedPageId(pageId)
    beginRename({ type: 'section', id: sectionId }, 'Untitled Section')
  }

  const createPageInline = () => {
    const targetSectionId = selectedSectionId || activeSections[0]?.id
    if (!targetSectionId) return

    const pageId = addPage(targetSectionId, 'Untitled Page')
    setSelectedPageId(pageId)
    beginRename({ type: 'page', id: pageId }, 'Untitled Page')
  }

  const ensurePageForNoteCreation = () => {
    let notebookId = selectedNotebookId || activeNotebook?.id
    if (!notebookId) {
      notebookId = addNotebook('Untitled Notebook')
      setSelectedNotebookId(notebookId)
    }

    let sectionId = selectedSectionId || sections.find((section) => section.notebookId === notebookId)?.id
    if (!sectionId) {
      sectionId = addSection(notebookId, 'Untitled Section')
      setSelectedSectionId(sectionId)
    }

    const existingPage = pages.find((page) => page.sectionId === sectionId)
    if (existingPage) {
      setSelectedPageId(existingPage.id)
      return existingPage.id
    }

    const pageId = addPage(sectionId, 'Untitled Page')
    setSelectedPageId(pageId)
    return pageId
  }

  const createNoteAtScreenPoint = (clientX: number, clientY: number) => {
    const targetPageId = selectedPageId || pageList[0]?.id || ensurePageForNoteCreation()
    if (!targetPageId || !viewportRef.current) return null

    const rect = viewportRef.current.getBoundingClientRect()
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top

    const canvasX = (screenX - canvasState.offsetX) / canvasState.zoom
    const canvasY = (screenY - canvasState.offsetY) / canvasState.zoom

    const noteId = addCanvasNote(targetPageId, canvasX - 110, canvasY - 60)
    upsertNote({ id: noteId, title: 'Untitled Card', pageId: targetPageId })
    bringNoteToFront(noteId)
    setCanvasEditingNoteId(noteId)
    return noteId
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (linkDrag) return

    if (e.button === 1 || e.button === 2 || spacePressed.current) {
      e.preventDefault()
      currentPointerRef.current = { x: e.clientX, y: e.clientY }
      panPointerIdRef.current = e.pointerId
      setIsPanning(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    if (e.button !== 0) return

    const target = e.target as HTMLElement
    if (target.closest('[data-note-block]')) return

    if (canvasEditingNoteId) {
      e.preventDefault()
      setCanvasEditingNoteId(null)
      return
    }

    e.preventDefault()
    pendingCreateRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const toCanvasPoint = (clientX: number, clientY: number) => {
    if (!viewportRef.current) {
      return { x: 0, y: 0 }
    }

    const rect = viewportRef.current.getBoundingClientRect()
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top
    return {
      x: (screenX - canvasState.offsetX) / canvasState.zoom,
      y: (screenY - canvasState.offsetY) / canvasState.zoom,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (linkDrag) {
      const point = toCanvasPoint(e.clientX, e.clientY)
      setLinkDrag((prev) => (prev ? { ...prev, currentX: point.x, currentY: point.y } : prev))
      return
    }

    if (pendingCreateRef.current && pendingCreateRef.current.pointerId === e.pointerId) {
      const deltaX = e.clientX - pendingCreateRef.current.startX
      const deltaY = e.clientY - pendingCreateRef.current.startY
      if (Math.hypot(deltaX, deltaY) > 5) {
        currentPointerRef.current = { x: e.clientX, y: e.clientY }
        panPointerIdRef.current = e.pointerId
        pendingCreateRef.current = null
        setIsPanning(true)
      }
      return
    }

    if (!isPanning || !currentPointerRef.current) return
    if (panPointerIdRef.current !== null && e.pointerId !== panPointerIdRef.current) return

    const deltaX = e.clientX - currentPointerRef.current.x
    const deltaY = e.clientY - currentPointerRef.current.y

    currentPointerRef.current = { x: e.clientX, y: e.clientY }
    panBy(deltaX / canvasState.zoom, deltaY / canvasState.zoom)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (linkDrag) {
      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const targetNode = element?.closest('[data-note-block]') as HTMLElement | null
      const targetNoteId = targetNode?.dataset.noteId

      if (targetNoteId && targetNoteId !== linkDrag.sourceId) {
        linkNoteToNote(linkDrag.sourceId, targetNoteId)
      }

      setLinkDrag(null)
      return
    }

    if (pendingCreateRef.current && pendingCreateRef.current.pointerId === e.pointerId) {
      createNoteAtScreenPoint(e.clientX, e.clientY)
      pendingCreateRef.current = null
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      return
    }

    stopPan(e.currentTarget)
  }

  const handleSelectNote = (noteId: string) => {
    if (linkDrag && linkDrag.sourceId !== noteId) {
      linkNoteToNote(linkDrag.sourceId, noteId)
      setLinkDrag(null)
    }
    bringNoteToFront(noteId)
    setCanvasEditingNoteId(noteId)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return

      const active = document.activeElement as HTMLElement | null
      const isTypingField =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        active?.tagName === 'SELECT' ||
        active?.isContentEditable === true

      if (isTypingField) return

      e.preventDefault()
      spacePressed.current = true
      document.body.dataset.canvasPan = '1'
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      spacePressed.current = false
      delete document.body.dataset.canvasPan
      stopPan()
    }

    const handleMouseUp = () => {
      stopPan()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mouseup', handleMouseUp)
      delete document.body.dataset.canvasPan
    }
  }, [])

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!viewportRef.current) return

    const rect = viewportRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const canvasX = (mouseX - canvasState.offsetX) / canvasState.zoom
    const canvasY = (mouseY - canvasState.offsetY) / canvasState.zoom

    const zoomFactor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR
    const newZoom = Math.max(ZOOM_MIN, canvasState.zoom * zoomFactor)

    const newOffsetX = mouseX - canvasX * newZoom
    const newOffsetY = mouseY - canvasY * newZoom

    setPan(newOffsetX, newOffsetY)
    setZoom(newZoom)
  }

  return (
    <div className="lumina-panel flex h-full w-full overflow-hidden rounded-[32px]">
      <aside className="lumina-sidebar flex w-[360px] shrink-0 flex-col">
        <div className="relative flex h-16 items-center justify-between border-b border-border-subtle px-4" ref={notebookMenuRef}>
          <div className="flex items-center gap-2">
            <BookText size={17} className="text-accent" />

            {renameTarget?.type === 'notebook' && renameTarget.id === activeNotebook?.id ? (
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') cancelRename()
                }}
                onBlur={commitRename}
                className={`${notesInputClass} w-[170px] text-[14px]`}
              />
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex items-center gap-1 text-text-primary"
                  onClick={() => setIsNotebookMenuOpen((prev) => !prev)}
                >
                  <span className="max-w-[150px] truncate text-[16px] font-semibold leading-none tracking-[-0.03em]">
                    {activeNotebook?.name ?? 'Notebook'}
                  </span>
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className="rounded-full p-1 text-text-tertiary hover:bg-window hover:text-text-primary"
                  onClick={() => {
                    if (!activeNotebook) return
                    beginRename({ type: 'notebook', id: activeNotebook.id }, activeNotebook.name)
                  }}
                  title="Rename notebook"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="lumina-button lumina-button-secondary h-10 w-10 p-0"
            onClick={createNotebookInline}
            title="Add notebook"
          >
            <Plus size={14} />
          </button>

          {isNotebookMenuOpen && (
            <div className="lumina-panel absolute left-4 top-14 z-30 w-[240px] rounded-[22px] p-2">
              <button
                type="button"
                className="mb-1 flex w-full items-center gap-2 rounded-[16px] px-3 py-2 text-left text-[12px] font-semibold text-text-primary hover:bg-window"
                onClick={createNotebookInline}
              >
                <Plus size={12} />
                New notebook
              </button>
              <div className="max-h-48 overflow-y-auto">
                {notebooks.map((notebook) => (
                  <button
                    key={notebook.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-[16px] px-3 py-2 text-left text-[12px] ${
                      selectedNotebookId === notebook.id
                        ? 'bg-accent-soft text-text-primary'
                        : 'text-text-secondary hover:bg-window'
                    }`}
                    onClick={() => {
                      setSelectedNotebookId(notebook.id)
                      setIsNotebookMenuOpen(false)
                    }}
                    onDoubleClick={() => {
                      beginRename({ type: 'notebook', id: notebook.id }, notebook.name)
                      setIsNotebookMenuOpen(false)
                    }}
                  >
                    <span className="truncate">{notebook.name}</span>
                    {selectedNotebookId === notebook.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-border-subtle px-3 py-3">
          <div className="lumina-segmented rounded-full p-1">
          <button
            type="button"
            onClick={() => setNotesSidebarTab('pages')}
            className={`lumina-segmented-item px-3 py-1.5 text-[12px] font-semibold ${
              notesSidebarTab === 'pages' ? 'is-active' : ''
            }`}
          >
            Pages
          </button>
          <button
            type="button"
            onClick={() => setNotesSidebarTab('graph')}
            className={`lumina-segmented-item px-3 py-1.5 text-[12px] font-semibold ${
              notesSidebarTab === 'graph' ? 'is-active' : ''
            }`}
          >
            Graph
          </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            <div className="flex w-1/2 flex-col border-r border-border-subtle">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {activeSections.map((section) => {
                  const editing = renameTarget?.type === 'section' && renameTarget.id === section.id
                  if (editing) {
                    return (
                      <div key={section.id} className="px-2 py-1">
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename()
                            if (e.key === 'Escape') cancelRename()
                          }}
                          onBlur={commitRename}
                          className={`${notesInputClass} w-full`}
                        />
                      </div>
                    )
                  }

                  return (
                    <ListRow
                      key={section.id}
                      label={section.name}
                      active={selectedSectionId === section.id}
                      onClick={() => setSelectedSectionId(section.id)}
                      onRename={() => beginRename({ type: 'section', id: section.id }, section.name)}
                      showPill
                    />
                  )
                })}
              </div>
              <button
                type="button"
                className="border-t border-border-subtle px-4 py-3 text-left text-[13px] font-semibold text-accent hover:bg-window"
                onClick={createSectionInline}
              >
                Add section
              </button>
            </div>

            <div className="flex w-1/2 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {pageList.map((page) => {
                  const editing = renameTarget?.type === 'page' && renameTarget.id === page.id
                  if (editing) {
                    return (
                      <div key={page.id} className="px-2 py-1">
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename()
                            if (e.key === 'Escape') cancelRename()
                          }}
                          onBlur={commitRename}
                          className={`${notesInputClass} w-full`}
                        />
                      </div>
                    )
                  }

                  return (
                    <ListRow
                      key={page.id}
                      label={page.name || 'Untitled Page'}
                      active={selectedPageId === page.id}
                      onClick={() => {
                        setSelectedPageId(page.id)
                        setCanvasEditingNoteId(null)
                      }}
                      onRename={() => beginRename({ type: 'page', id: page.id }, page.name || 'Untitled Page')}
                    />
                  )
                })}
              </div>
              <button
                type="button"
                className="border-t border-border-subtle px-4 py-3 text-left text-[13px] font-semibold text-accent hover:bg-window"
                onClick={createPageInline}
              >
                Add page
              </button>
            </div>
          </div>

        </div>
      </aside>

      {notesSidebarTab === 'graph' ? (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <div className="lumina-inset min-h-0 flex-1 rounded-[28px] p-2">
            <PageGraphCanvas
              nodes={pageWikilinkGraph.nodes}
              links={pageWikilinkGraph.links}
              selectedPageId={selectedPageId}
              onSelectPage={(pageId) => {
                setSelectedPageId(pageId)
                setNotesSidebarTab('pages')
              }}
            />
          </div>
        </div>
      ) : (
      <div
        ref={viewportRef}
        className="lumina-grid-bg relative flex-1 overflow-hidden bg-panel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${Math.round(canvasState.offsetX * 10) / 10}px, ${Math.round(canvasState.offsetY * 10) / 10}px) scale(${canvasState.zoom})`,
            transition: 'none',
          }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {pageLinks.map((edge) => (
              <line
                key={`${edge.source.id}-${edge.target.id}`}
                x1={edge.source.x + edge.source.width / 2}
                y1={edge.source.y + edge.source.height / 2}
                x2={edge.target.x + edge.target.width / 2}
                y2={edge.target.y + edge.target.height / 2}
                stroke="#5672bc"
                strokeOpacity="0.7"
                strokeWidth="2"
              />
            ))}
            {linkDrag && (
              <line
                x1={linkDrag.startX}
                y1={linkDrag.startY}
                x2={linkDrag.currentX}
                y2={linkDrag.currentY}
                stroke="#2f66dd"
                strokeOpacity="0.75"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            )}
          </svg>

          {sortedPageNotes.map((note) => (
            <NoteBlock
              key={note.id}
              note={note}
              isEditing={canvasEditingNoteId === note.id}
              isLinkSource={linkDrag?.sourceId === note.id}
              isLinkTargetMode={Boolean(linkDrag && linkDrag.sourceId !== note.id)}
              onSelect={handleSelectNote}
              onStartLink={(noteId: string) => {
                const source = sortedPageNotes.find((item) => item.id === noteId)
                if (!source) return

                const startX = source.x + source.width / 2
                const startY = source.y + source.height / 2
                setLinkDrag({ sourceId: noteId, startX, startY, currentX: startX, currentY: startY })
                setCanvasEditingNoteId(null)
              }}
            />
          ))}
        </div>

      </div>
      )}
    </div>
  )
}
