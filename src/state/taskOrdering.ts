import type { Priority, Task } from './models'

const PRIORITY_WEIGHT: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 }

const parseTaskDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const hasTaskOrder = (task: Task): task is Task & { order: number } =>
  typeof task.order === 'number' && Number.isFinite(task.order)

const taskTimestamp = (task: Task) => {
  const timestamp = new Date(task.updatedAt ?? task.createdAt).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const compareTasksByFallback = (a: Task, b: Task) => {
  const dueA = parseTaskDate(a.dueDateTime ?? a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
  const dueB = parseTaskDate(b.dueDateTime ?? b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
  if (dueA !== dueB) return dueA - dueB

  const priorityDelta = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
  if (priorityDelta !== 0) return priorityDelta

  return taskTimestamp(b) - taskTimestamp(a)
}

export const compareTasksByArrangement = (a: Task, b: Task) => {
  const aHasOrder = hasTaskOrder(a)
  const bHasOrder = hasTaskOrder(b)

  if (aHasOrder && bHasOrder && a.order !== b.order) {
    return a.order - b.order
  }

  if (aHasOrder !== bHasOrder) {
    return aHasOrder ? -1 : 1
  }

  return compareTasksByFallback(a, b)
}

export const sortTasksByArrangement = (items: Task[]) => [...items].sort(compareTasksByArrangement)

export const normalizeTaskOrder = (items: Task[]) =>
  sortTasksByArrangement(items).map((task, index) => (task.order === index ? task : { ...task, order: index }))
