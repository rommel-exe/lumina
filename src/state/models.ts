export type Priority = 'High' | 'Medium' | 'Low'
export type TaskStatus = 'inbox' | 'next' | 'active' | 'waiting' | 'scheduled' | 'done' | 'archived'

const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  inbox: ['next', 'active', 'waiting', 'scheduled', 'done', 'archived'],
  next: ['active', 'waiting', 'scheduled', 'inbox', 'done', 'archived'],
  active: ['done', 'waiting', 'next', 'inbox', 'archived'],
  waiting: ['next', 'active', 'scheduled', 'inbox', 'done', 'archived'],
  scheduled: ['active', 'next', 'waiting', 'inbox', 'done', 'archived'],
  done: ['inbox', 'next', 'archived'],
  archived: ['inbox'],
}

export const getAllowedTaskTransitions = (status: TaskStatus): TaskStatus[] => TASK_STATUS_TRANSITIONS[status]

export const canTransitionTaskStatus = (from: TaskStatus, to: TaskStatus): boolean =>
  getAllowedTaskTransitions(from).includes(to)

export type Task = {
  id: string
  title: string
  description?: string
  priority: Priority
  status: TaskStatus
  todayFocus?: boolean
  dueDate?: string
  dueDateTime?: string
  recurrenceRule?: string
  scheduledAt?: string
  contextId?: string
  parentId?: string
  sectionId?: string
  order?: number
  tagIds: string[]
  projectId?: string
  noteLinks: string[]
  createdAt: string
  updatedAt?: string
}

export type Project = {
  id: string
  name: string
  color: string
}

export type Tag = {
  id: string
  name: string
}

export type Notebook = {
  id: string
  name: string
}

export type Section = {
  id: string
  notebookId: string
  name: string
}

export type NotePage = {
  id: string
  sectionId: string
  name: string
  createdAt: string
  updatedAt: string
}

export type Note = {
  id: string
  sectionId: string
  pageId: string
  title: string
  content: string
  links: string[]
  tags: string[]
  linkedTaskIds: string[]
  createdAt: string
  updatedAt: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

export type WhiteboardElementKind = 'sticky' | 'rect' | 'circle' | 'path'

export type WhiteboardElement = {
  id: string
  kind: WhiteboardElementKind
  x: number
  y: number
  w: number
  h: number
  text?: string
  color?: string
  points?: Array<{ x: number; y: number }>
}

export type Whiteboard = {
  id: string
  name: string
  elements: WhiteboardElement[]
}

export type PomodoroState = 'idle' | 'running' | 'paused' | 'complete'

export type PomodoroSession = {
  state: PomodoroState
  startedAt?: string
  durationMinutes: number
  elapsedSeconds: number
}

export type EmailItem = {
  id: string
  from: string
  subject: string
  snippet: string
  receivedAt: string
  linkedTaskIds: string[]
  linkedNoteIds: string[]
}

export type LinkType = 'task-note' | 'task-email' | 'note-email' | 'note-note'

export type Link = {
  id: string
  sourceId: string
  targetId: string
  type: LinkType
  createdAt: string
}

export type Settings = {
  theme: 'dark' | 'light'
}

export type AppData = {
  tasks: Task[]
  projects: Project[]
  tags: Tag[]
  notebooks: Notebook[]
  sections: Section[]
  pages: NotePage[]
  notes: Note[]
  whiteboards: Whiteboard[]
  emails: EmailItem[]
  links: Link[]
  pomodoro: PomodoroSession
  settings: Settings
}

export type ViewKey = 'Dashboard' | 'Tasks' | 'Notes' | 'Whiteboard' | 'Focus' | 'Email'

export type CanvasState = {
  offsetX: number  // pan offset in pixels
  offsetY: number
  zoom: number     // scale factor (1.0 = 100%)
}

export type NoteBlock = {
  id: string
  x: number        // absolute canvas position
  y: number
  width: number
  height: number
  content: string
  zIndex: number
}
