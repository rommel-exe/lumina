import { create } from 'zustand'
import { addDays } from 'date-fns'
import { createId } from '../lib/ids'
import type {
  AppData,
  EmailItem,
  Link,
  Note,
  NotePage,
  Priority,
  Task,
  TaskKind,
  TaskStatus,
  ViewKey,
  WhiteboardElementKind,
  CanvasState,
} from './models'
import { canTransitionTaskStatus } from './models'
import { normalizeTaskOrder, sortTasksByArrangement } from './taskOrdering'
import { saveSnapshot, loadSnapshot } from './persistence/indexedDbAdapter'
import { loadSettings, saveSettings } from './persistence/localStorageAdapter'

const now = () => new Date().toISOString()

const normalizeTaskStatus = (status: string | undefined): TaskStatus => {
  if (!status) return 'inbox'

  if (
    status === 'inbox' ||
    status === 'next' ||
    status === 'active' ||
    status === 'waiting' ||
    status === 'scheduled' ||
    status === 'done' ||
    status === 'archived'
  ) {
    return status
  }

  if (status === 'Backlog') return 'inbox'
  if (status === 'Todo') return 'next'
  if (status === 'InProgress') return 'active'
  if (status === 'Done') return 'done'

  return 'inbox'
}

const seedData = (): AppData => {
  const inboxTaskId = createId()
  const noteId = createId()
  const pageId = createId()
  const emailId = createId()

  return {
    tasks: [
      {
        id: inboxTaskId,
        title: 'Finalize Lumina interaction spec',
        priority: 'High',
        status: 'next',
        dueDate: addDays(new Date(), 1).toISOString(),
        tagIds: [],
        projectId: undefined,
        noteLinks: [noteId],
        createdAt: now(),
      },
      {
        id: createId(),
        title: 'Review weekly product notes',
        priority: 'Medium',
        status: 'next',
        dueDate: addDays(new Date(), 2).toISOString(),
        tagIds: [],
        projectId: undefined,
        noteLinks: [],
        createdAt: now(),
      },
    ],
    projects: [
      { id: createId(), name: 'Lumina Core', color: '#60a5fa' },
      { id: createId(), name: 'Growth', color: '#f59e0b' },
    ],
    tags: [
      { id: createId(), name: 'planning' },
      { id: createId(), name: 'deep-work' },
    ],
    notebooks: [{ id: 'default-notebook', name: 'Main Notebook' }],
    sections: [{ id: 'default-section', notebookId: 'default-notebook', name: 'Quick Notes' }],
    pages: [
      {
        id: pageId,
        sectionId: 'default-section',
        name: 'Main Page',
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    notes: [
      {
        id: noteId,
        sectionId: 'default-section',
        pageId,
        title: 'Sprint Brainstorm',
        tags: ['planning'],
        content:
          'Capture release scope and decisions here.\\n\\nLink to tasks using their IDs or note references like [[another-note-id]].',
        links: [],
        linkedTaskIds: [inboxTaskId],
        createdAt: now(),
        updatedAt: now(),
        x: 180,
        y: 120,
        width: 420,
        height: 280,
        zIndex: 1,
      },
    ],
    whiteboards: [{ id: createId(), name: 'Main Board', elements: [] }],
    emails: [
      {
        id: emailId,
        from: 'design@lumina.local',
        subject: 'UI polish notes for sprint',
        snippet: 'Can we tighten spacing in the task board columns?',
        receivedAt: now(),
        linkedTaskIds: [inboxTaskId],
        linkedNoteIds: [noteId],
      },
    ],
    links: [
      {
        id: createId(),
        sourceId: inboxTaskId,
        targetId: noteId,
        type: 'task-note',
        createdAt: now(),
      },
      {
        id: createId(),
        sourceId: emailId,
        targetId: inboxTaskId,
        type: 'task-email',
        createdAt: now(),
      },
    ],
    pomodoro: {
      state: 'idle',
      durationMinutes: 25,
      elapsedSeconds: 0,
    },
    settings: {
      theme: 'dark',
    },
  }
}

const createInitialData = (): AppData => {
  const data = seedData()
  return { ...data, tasks: normalizeTaskOrder(data.tasks) }
}

const normalizeTasks = (tasks: Task[]) =>
  normalizeTaskOrder(
    tasks.map((task) => ({
      ...task,
      status: normalizeTaskStatus(task.status),
      todayFocus: Boolean(task.todayFocus),
      dueDate: task.dueDate,
      dueDateTime: task.dueDateTime,
      endDateTime: task.endDateTime,
      recurrenceRule: task.recurrenceRule,
      scheduledAt: task.scheduledAt,
      kind: task.kind ?? 'task',
      contextId: task.contextId,
      parentId: task.parentId,
      sectionId: task.sectionId,
      order: task.order,
    })),
  )

const nextTaskOrder = (tasks: Task[]) => {
  const ordered = tasks
    .map((task) => task.order)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  return ordered.length > 0 ? Math.min(...ordered) - 1 : 0
}

type LuminaState = {
  data: AppData
  activeView: ViewKey
  settingsOpen: boolean
  hydrated: boolean
  canvasState: CanvasState
  canvasEditingNoteId: string | null
  hydrate: () => Promise<void>
  setActiveView: (view: ViewKey) => void
  setSettingsOpen: (open: boolean) => void
  addTask: (
    title: string,
    priority: Priority,
    options?: {
      description?: string
      todayFocus?: boolean
      dueDate?: string
      dueDateTime?: string
      endDateTime?: string
      recurrenceRule?: string
      scheduledAt?: string
      kind?: TaskKind
      contextId?: string
      parentId?: string
      sectionId?: string
      order?: number
      projectId?: string
      tagIds?: string[]
      status?: TaskStatus
    },
  ) => string
  updateTaskStatus: (id: string, status: TaskStatus) => void
  updateTask: (
    id: string,
    patch: Partial<
      Pick<
        Task,
        | 'title'
        | 'description'
        | 'priority'
        | 'status'
        | 'todayFocus'
        | 'dueDate'
        | 'dueDateTime'
        | 'endDateTime'
        | 'recurrenceRule'
        | 'scheduledAt'
        | 'kind'
        | 'contextId'
        | 'parentId'
        | 'sectionId'
        | 'order'
        | 'tagIds'
        | 'projectId'
        | 'noteLinks'
      >
    >,
  ) => void
  moveTaskWithinStatus: (id: string, direction: 'up' | 'down') => void
  deleteTask: (id: string) => void
  addProject: (name: string, color?: string) => string
  addTag: (name: string) => string
  addNotebook: (name: string) => string
  renameNotebook: (id: string, name: string) => void
  addSection: (notebookId: string, name: string) => string
  renameSection: (id: string, name: string) => void
  addPage: (sectionId: string, name: string) => string
  renamePage: (id: string, name: string) => void
  upsertNote: (payload: Pick<Note, 'id'> & Partial<Note>) => void
  addCanvasNote: (pageId: string, x: number, y: number) => string
  updateNotePosition: (id: string, x: number, y: number) => void
  updateNoteSize: (id: string, width: number, height: number) => void
  bringNoteToFront: (id: string) => void
  deleteNote: (id: string) => void
  linkNoteToNote: (sourceNoteId: string, targetNoteId: string) => void
  linkTaskToNote: (taskId: string, noteId: string) => void
  addWhiteboardElement: (kind: WhiteboardElementKind) => void
  linkEmailToTask: (emailId: string, taskId: string) => void
  updatePomodoro: (elapsedSeconds: number, state: AppData['pomodoro']['state']) => void
  setTheme: (theme: AppData['settings']['theme']) => void
  exportData: () => string
  importData: (raw: string) => { ok: boolean; message: string }
  setPan: (offsetX: number, offsetY: number) => void
  panBy: (deltaX: number, deltaY: number) => void
  setZoom: (zoom: number) => void
  setCanvasEditingNoteId: (id: string | null) => void
}

const syncSnapshot = (data: AppData) => {
  void saveSnapshot(data)
  saveSettings(data.settings)
}

const parseInlineLinks = (content: string): string[] => {
  const regex = /\[\[([^\]]+)\]\]/g
  const links: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(content))) {
    links.push(match[1].trim())
  }
  return links
}

const updateLinks = (existing: Link[], sourceId: string, targetId: string, type: Link['type']) => {
  const found = existing.some(
    (link) =>
      link.sourceId === sourceId && link.targetId === targetId && link.type === type,
  )
  if (found) {
    return existing
  }

  return [...existing, { id: createId(), sourceId, targetId, type, createdAt: now() }]
}

type SpatialNoteFields = Pick<Note, 'x' | 'y' | 'width' | 'height' | 'zIndex'>
type PartialSpatialNote = Omit<Note, keyof SpatialNoteFields> & Partial<SpatialNoteFields>

const normalizeNote = (note: PartialSpatialNote): Note => ({
  ...note,
  pageId: note.pageId ?? 'default-page',
  x: note.x ?? 120,
  y: note.y ?? 120,
  width: note.width ?? 300,
  height: note.height ?? 170,
  zIndex: note.zIndex ?? 1,
})

const toTopZIndex = (notes: Note[]) => notes.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1

export const useLuminaStore = create<LuminaState>((set, get) => ({
  data: createInitialData(),
  activeView: 'Dashboard',
  settingsOpen: false,
  hydrated: false,
  canvasState: { offsetX: 0, offsetY: 0, zoom: 1 },
  canvasEditingNoteId: null,

  hydrate: async () => {
    const [snapshot, localSettings] = await Promise.all([loadSnapshot(), Promise.resolve(loadSettings())])
    const fallback = createInitialData()
    const fallbackPageId = fallback.pages[0]?.id ?? 'default-page'
    const snapshotPages = snapshot?.pages ?? fallback.pages
    const merged: AppData = {
      ...(snapshot ?? fallback),
      tasks: normalizeTasks(snapshot?.tasks ?? fallback.tasks),
      pages: snapshotPages,
      notes: (snapshot?.notes ?? fallback.notes).map((note) =>
        normalizeNote({
          ...note,
          pageId: note.pageId ?? snapshotPages.find((page) => page.sectionId === note.sectionId)?.id ?? fallbackPageId,
        }),
      ),
      settings: localSettings ?? snapshot?.settings ?? fallback.settings,
    }

    set({ data: merged, hydrated: true })
    syncSnapshot(merged)
  },

  setActiveView: (view) => set({ activeView: view }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  addTask: (title, priority, options) => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return ''

    const id = createId()
    set((state) => {
      const timestamp = now()
      const updated: Task = {
        id,
        title: trimmedTitle,
        description: options?.description,
        priority,
        status: normalizeTaskStatus(options?.status),
        todayFocus: options?.todayFocus ?? false,
        dueDate: options?.dueDate,
        dueDateTime: options?.dueDateTime,
        endDateTime: options?.endDateTime,
        recurrenceRule: options?.recurrenceRule,
        scheduledAt: options?.scheduledAt,
        kind: options?.kind ?? 'task',
        contextId: options?.contextId,
        parentId: options?.parentId,
        sectionId: options?.sectionId,
        order: options?.order ?? nextTaskOrder(state.data.tasks),
        tagIds: options?.tagIds ?? [],
        projectId: options?.projectId,
        noteLinks: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      const data = { ...state.data, tasks: [updated, ...state.data.tasks] }
      syncSnapshot(data)
      return { data }
    })
    return id
  },

  updateTaskStatus: (id, status) =>
    set((state) => {
      const nextStatus = normalizeTaskStatus(status)
      const data = {
        ...state.data,
        tasks: state.data.tasks.map((task) => {
          if (task.id !== id) return task
          if (task.status === nextStatus) return task
          if (!canTransitionTaskStatus(task.status, nextStatus)) return task
          return { ...task, status: nextStatus, updatedAt: now() }
        }),
      }
      syncSnapshot(data)
      return { data }
    }),

  moveTaskWithinStatus: (id, direction) =>
    set((state) => {
      const sorted = sortTasksByArrangement(state.data.tasks)
      const task = sorted.find((item) => item.id === id)
      if (!task) return state

      const siblings = sorted.filter((item) => item.status === task.status)
      const currentIndex = siblings.findIndex((item) => item.id === id)
      if (currentIndex === -1) return state

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= siblings.length) return state

      const target = siblings[targetIndex]
      const sourceOrder = task.order ?? currentIndex
      const targetOrder = target.order ?? targetIndex

      const data = {
        ...state.data,
        tasks: state.data.tasks.map((item) => {
          if (item.id === task.id) return { ...item, order: targetOrder, updatedAt: now() }
          if (item.id === target.id) return { ...item, order: sourceOrder, updatedAt: now() }
          return item
        }),
      }
      syncSnapshot(data)
      return { data }
    }),

  updateTask: (id, patch) =>
    set((state) => {
      const data = {
        ...state.data,
        tasks: state.data.tasks.map((task) => {
          if (task.id !== id) return task

          const nextTitle = patch.title?.trim()
          const nextStatus = patch.status ? normalizeTaskStatus(patch.status) : task.status
          const safeStatus =
            patch.status && patch.status !== task.status && canTransitionTaskStatus(task.status, nextStatus)
              ? nextStatus
              : task.status

          return {
            ...task,
            ...patch,
            status: safeStatus,
            title: nextTitle && nextTitle.length > 0 ? nextTitle : task.title,
            updatedAt: now(),
          }
        }),
      }
      syncSnapshot(data)
      return { data }
    }),

  deleteTask: (id) =>
    set((state) => {
      const tasks = state.data.tasks.filter((task) => task.id !== id)
      const notes = state.data.notes.map((note) => ({
        ...note,
        linkedTaskIds: note.linkedTaskIds.filter((taskId) => taskId !== id),
      }))
      const emails = state.data.emails.map((email) => ({
        ...email,
        linkedTaskIds: email.linkedTaskIds.filter((taskId) => taskId !== id),
      }))
      const links = state.data.links.filter((link) => link.sourceId !== id && link.targetId !== id)

      const data = { ...state.data, tasks, notes, emails, links }
      syncSnapshot(data)
      return { data }
    }),

  addProject: (name, color) => {
    const trimmed = name.trim()
    if (!trimmed) return ''

    let resolvedId = ''
    set((state) => {
      const existing = state.data.projects.find(
        (project) => project.name.trim().toLowerCase() === trimmed.toLowerCase(),
      )
      if (existing) {
        resolvedId = existing.id
        return state
      }

      const createdId = createId()
      resolvedId = createdId

      const data = {
        ...state.data,
        projects: [...state.data.projects, { id: createdId, name: trimmed, color: color ?? '#60a5fa' }],
      }
      syncSnapshot(data)
      return { data }
    })
    return resolvedId
  },

  addTag: (name) => {
    const trimmed = name.trim()
    if (!trimmed) return ''

    let resolvedId = ''
    set((state) => {
      const existing = state.data.tags.find((tag) => tag.name.trim().toLowerCase() === trimmed.toLowerCase())
      if (existing) {
        resolvedId = existing.id
        return state
      }

      const createdId = createId()
      resolvedId = createdId

      const data = {
        ...state.data,
        tags: [...state.data.tags, { id: createdId, name: trimmed }],
      }
      syncSnapshot(data)
      return { data }
    })
    return resolvedId
  },

  addNotebook: (name) => {
    const id = createId()
    set((state) => {
      const data = {
        ...state.data,
        notebooks: [...state.data.notebooks, { id, name }]
      }
      syncSnapshot(data)
      return { data }
    })
    return id
  },

  renameNotebook: (id, name) =>
    set((state) => {
      const trimmed = name.trim()
      if (!trimmed) return state

      const data = {
        ...state.data,
        notebooks: state.data.notebooks.map((notebook) =>
          notebook.id === id ? { ...notebook, name: trimmed } : notebook,
        ),
      }
      syncSnapshot(data)
      return { data }
    }),

  addSection: (notebookId, name) => {
    const id = createId()
    set((state) => {
      const data = {
        ...state.data,
        sections: [...state.data.sections, { id, notebookId, name }]
      }
      syncSnapshot(data)
      return { data }
    })
    return id
  },

  renameSection: (id, name) =>
    set((state) => {
      const trimmed = name.trim()
      if (!trimmed) return state

      const data = {
        ...state.data,
        sections: state.data.sections.map((section) =>
          section.id === id ? { ...section, name: trimmed } : section,
        ),
      }
      syncSnapshot(data)
      return { data }
    }),

  addPage: (sectionId, name) => {
    const id = createId()
    set((state) => {
      const page: NotePage = {
        id,
        sectionId,
        name,
        createdAt: now(),
        updatedAt: now(),
      }
      const data = {
        ...state.data,
        pages: [...state.data.pages, page],
      }
      syncSnapshot(data)
      return { data }
    })
    return id
  },

  renamePage: (id, name) =>
    set((state) => {
      const trimmed = name.trim()
      if (!trimmed) return state

      const data = {
        ...state.data,
        pages: state.data.pages.map((page) =>
          page.id === id ? { ...page, name: trimmed, updatedAt: now() } : page,
        ),
      }
      syncSnapshot(data)
      return { data }
    }),

  upsertNote: ({ id, title, content, x, y, width, height, sectionId, pageId, tags, links }) =>
    set((state) => {
      const existing = state.data.notes.find((note) => note.id === id)
      const contentToParse = content ?? existing?.content ?? ''
      const parsedLinks = parseInlineLinks(contentToParse)
      const mergedLinks = [...new Set([...(links ?? existing?.links ?? []), ...parsedLinks])]
      const currentTop = toTopZIndex(state.data.notes)
      const resolvedSectionId = sectionId ?? existing?.sectionId ?? 'default-section'
      const resolvedPageId =
        pageId ??
        existing?.pageId ??
        state.data.pages.find((page) => page.sectionId === resolvedSectionId)?.id ??
        state.data.pages[0]?.id ??
        'default-page'
      
      const note = normalizeNote({
        id,
        title: title ?? existing?.title ?? 'Untitled Note',
        content: content ?? existing?.content ?? '',
        tags: tags ?? existing?.tags ?? [],
        sectionId: resolvedSectionId,
        pageId: resolvedPageId,
        links: mergedLinks,
        linkedTaskIds: existing?.linkedTaskIds ?? [],
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
        x: x ?? existing?.x ?? 120,
        y: y ?? existing?.y ?? 120,
        width: width ?? existing?.width ?? 300,
        height: height ?? existing?.height ?? 170,
        zIndex: existing?.zIndex ?? currentTop,
      })

      const notes = existing
        ? state.data.notes.map((item) => (item.id === id ? note : item))
        : [note, ...state.data.notes]

      const noteNoteLinks = mergedLinks.reduce(
        (acc, targetId) => updateLinks(acc, id, targetId, 'note-note'),
        state.data.links,
      )

      const pages = state.data.pages.map((page) =>
        page.id === resolvedPageId ? { ...page, updatedAt: now() } : page,
      )

      const data = { ...state.data, notes, pages, links: noteNoteLinks }
      syncSnapshot(data)
      return { data }
    }),

  addCanvasNote: (pageId, x, y) => {
    const id = createId()
    set((state) => {
      const page = state.data.pages.find((item) => item.id === pageId)
      const note = normalizeNote({
        id,
        sectionId: page?.sectionId ?? 'default-section',
        pageId,
        title: 'Untitled',
        content: '',
        links: [],
        tags: [],
        linkedTaskIds: [],
        createdAt: now(),
        updatedAt: now(),
        x,
        y,
        width: 300,
        height: 170,
        zIndex: toTopZIndex(state.data.notes),
      })

      const pages = state.data.pages.map((item) =>
        item.id === pageId ? { ...item, updatedAt: now() } : item,
      )

      const data = { ...state.data, notes: [note, ...state.data.notes], pages }
      syncSnapshot(data)
      return { data }
    })
    return id
  },

  updateNotePosition: (id, x, y) =>
    set((state) => {
      const notes = state.data.notes.map((note) =>
        note.id === id ? { ...note, x, y, updatedAt: now() } : note,
      )
      const data = { ...state.data, notes }
      syncSnapshot(data)
      return { data }
    }),

  updateNoteSize: (id, width, height) =>
    set((state) => {
      const notes = state.data.notes.map((note) =>
        note.id === id ? { ...note, width, height, updatedAt: now() } : note,
      )
      const data = { ...state.data, notes }
      syncSnapshot(data)
      return { data }
    }),

  bringNoteToFront: (id) =>
    set((state) => {
      const nextZ = toTopZIndex(state.data.notes)
      const notes = state.data.notes.map((note) =>
        note.id === id ? { ...note, zIndex: nextZ } : note,
      )
      const data = { ...state.data, notes }
      syncSnapshot(data)
      return { data }
    }),

  deleteNote: (id) =>
    set((state) => {
      const notes = state.data.notes.filter((item) => item.id !== id)
      const data = { ...state.data, notes }
      syncSnapshot(data)
      return { data }
    }),

  linkNoteToNote: (sourceNoteId, targetNoteId) =>
    set((state) => {
      if (!sourceNoteId || !targetNoteId || sourceNoteId === targetNoteId) {
        return state
      }

      const source = state.data.notes.find((note) => note.id === sourceNoteId)
      if (!source) return state

      const nextLinks = source.links.includes(targetNoteId)
        ? source.links
        : [...source.links, targetNoteId]

      const notes = state.data.notes.map((note) =>
        note.id === sourceNoteId ? { ...note, links: nextLinks, updatedAt: now() } : note,
      )

      const links = updateLinks(state.data.links, sourceNoteId, targetNoteId, 'note-note')
      const data = { ...state.data, notes, links }
      syncSnapshot(data)
      return { data }
    }),

  linkTaskToNote: (taskId, noteId) =>
    set((state) => {
      const tasks = state.data.tasks.map((task) =>
        task.id === taskId && !task.noteLinks.includes(noteId)
          ? { ...task, noteLinks: [...task.noteLinks, noteId] }
          : task,
      )
      const notes = state.data.notes.map((note) =>
        note.id === noteId && !note.linkedTaskIds.includes(taskId)
          ? { ...note, linkedTaskIds: [...note.linkedTaskIds, taskId] }
          : note,
      )

      const links = updateLinks(state.data.links, taskId, noteId, 'task-note')
      const data = { ...state.data, tasks, notes, links }
      syncSnapshot(data)
      return { data }
    }),

  addWhiteboardElement: (kind) =>
    set((state) => {
      const board = state.data.whiteboards[0]
      if (!board) {
        return state
      }

      const element = {
        id: createId(),
        kind,
        x: 24 + board.elements.length * 14,
        y: 24 + board.elements.length * 14,
        w: kind === 'sticky' ? 220 : 160,
        h: 120,
        text: kind === 'sticky' ? 'Idea' : undefined,
        color: kind === 'sticky' ? '#fef08a' : '#93c5fd',
      }

      const whiteboards = [{ ...board, elements: [...board.elements, element] }]
      const data = { ...state.data, whiteboards }
      syncSnapshot(data)
      return { data }
    }),

  linkEmailToTask: (emailId, taskId) =>
    set((state) => {
      const emails: EmailItem[] = state.data.emails.map((email) =>
        email.id === emailId && !email.linkedTaskIds.includes(taskId)
          ? { ...email, linkedTaskIds: [...email.linkedTaskIds, taskId] }
          : email,
      )

      const links = updateLinks(state.data.links, emailId, taskId, 'task-email')
      const data = { ...state.data, emails, links }
      syncSnapshot(data)
      return { data }
    }),

  updatePomodoro: (elapsedSeconds, stateValue) =>
    set((state) => {
      const data = {
        ...state.data,
        pomodoro: {
          ...state.data.pomodoro,
          state: stateValue,
          elapsedSeconds,
          startedAt:
            stateValue === 'running' && !state.data.pomodoro.startedAt
              ? now()
              : state.data.pomodoro.startedAt,
        },
      }
      syncSnapshot(data)
      return { data }
    }),

  setTheme: (theme) =>
    set((state) => {
      const data = { ...state.data, settings: { theme } }
      syncSnapshot(data)
      return { data }
    }),

  exportData: () => JSON.stringify(get().data, null, 2),

  importData: (raw) => {
    try {
      const parsed = JSON.parse(raw) as AppData
      const pages = parsed.pages && parsed.pages.length > 0
        ? parsed.pages
        : [{ id: createId(), sectionId: parsed.sections[0]?.id ?? 'default-section', name: 'Main Page', createdAt: now(), updatedAt: now() }]
      const normalized: AppData = {
        ...parsed,
        tasks: normalizeTasks(parsed.tasks ?? []),
        pages,
        notes: parsed.notes.map((note) =>
          normalizeNote({
            ...note,
            pageId: note.pageId ?? pages.find((page) => page.sectionId === note.sectionId)?.id ?? pages[0].id,
          }),
        ),
      }
      set({ data: normalized })
      syncSnapshot(normalized)
      return { ok: true, message: 'Data imported.' }
    } catch {
      return { ok: false, message: 'Invalid JSON payload.' }
    }
  },

  setPan: (offsetX, offsetY) =>
    set((state) => ({
      canvasState: { ...state.canvasState, offsetX, offsetY },
    })),

  panBy: (deltaX, deltaY) =>
    set((state) => ({
      canvasState: {
        ...state.canvasState,
        offsetX: state.canvasState.offsetX + deltaX,
        offsetY: state.canvasState.offsetY + deltaY,
      },
    })),

  setZoom: (zoom) =>
    set((state) => ({
      canvasState: { ...state.canvasState, zoom: Math.max(0.0005, zoom) },
    })),

  setCanvasEditingNoteId: (id) => set({ canvasEditingNoteId: id }),
}))
