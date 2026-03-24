import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, Trash2 } from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel'
import type { Priority, Task } from '../../state/models'
import { useLuminaStore } from '../../state/store'
import { sortTasksByArrangement } from '../../state/taskOrdering'

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']

const inputClass =
  'h-10 rounded-xl border border-border-subtle bg-input px-3 text-[13px] text-text-primary outline-none transition focus:border-border-strong focus:bg-window'
const textareaClass =
  'rounded-xl border border-border-subtle bg-input px-3 py-2 text-[13px] text-text-primary outline-none transition focus:border-border-strong focus:bg-window'
const subtleButtonClass =
  'inline-flex h-9 items-center justify-center rounded-xl border border-border-subtle bg-panel px-3 text-[12px] font-medium text-text-secondary transition hover:border-border-strong hover:bg-window hover:text-text-primary'

const toDayKey = (date: Date) => format(date, 'yyyy-MM-dd')
const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd')

const parseTaskDate = (value?: string) => {
  if (!value) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const parsed = new Date(year, (month ?? 1) - 1, day ?? 1, 9, 0, 0, 0)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const fromDateInput = (dateValue: string, timeValue?: string) => {
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours, minutes] = (timeValue || '09:00').split(':').map(Number)
  const parsed = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const taskTimeLabel = (task: Task) => {
  const parsed = parseTaskDate(task.dueDateTime ?? task.dueDate ?? task.scheduledAt)
  if (!parsed) return 'No time'
  if (task.dueDateTime) return format(parsed, 'h:mm a')
  return 'All day'
}

const priorityTone: Record<Priority, string> = {
  High: 'border-border-strong bg-panel text-red-500',
  Medium: 'border-border-subtle bg-panel text-amber-600',
  Low: 'border-border-subtle bg-panel text-text-secondary',
}

export const TasksView = () => {
  const tasks = useLuminaStore((state) => state.data.tasks)
  const addTask = useLuminaStore((state) => state.addTask)
  const updateTaskStatus = useLuminaStore((state) => state.updateTaskStatus)
  const deleteTask = useLuminaStore((state) => state.deleteTask)

  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()))

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftPriority, setDraftPriority] = useState<Priority>('Medium')
  const [draftDate, setDraftDate] = useState(() => toDateInput(new Date()))
  const [draftTime, setDraftTime] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  const topLevelTasks = useMemo(
    () => sortTasksByArrangement(tasks.filter((task) => !task.parentId)),
    [tasks],
  )

  const scheduledTasks = useMemo(
    () => topLevelTasks.filter((task) => Boolean(task.dueDate || task.dueDateTime || task.scheduledAt)),
    [topLevelTasks],
  )

  const todoTasks = useMemo(() => {
    const active = topLevelTasks.filter((task) => task.status !== 'done' && task.status !== 'archived')
    return [...active].sort((left, right) => {
      const leftTime = parseTaskDate(left.dueDateTime ?? left.dueDate ?? left.scheduledAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const rightTime = parseTaskDate(right.dueDateTime ?? right.dueDate ?? right.scheduledAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
      if (leftTime !== rightTime) return leftTime - rightTime
      return left.title.localeCompare(right.title)
    })
  }, [topLevelTasks])

  const monthlyRange = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarAnchor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(calendarAnchor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [calendarAnchor])

  const eventsByDay = useMemo(() => {
    const start = monthlyRange[0] ?? startOfDay(new Date())
    const end = endOfDay(monthlyRange[monthlyRange.length - 1] ?? start)
    const map = new Map<string, Task[]>()

    scheduledTasks.forEach((task) => {
      const date = parseTaskDate(task.dueDateTime ?? task.dueDate ?? task.scheduledAt)
      if (!date || date < start || date > end) return

      const key = toDayKey(date)
      const current = map.get(key) ?? []
      current.push(task)
      map.set(key, current)
    })

    map.forEach((items, dayKey) => {
      items.sort((left, right) => {
        const leftTime = parseTaskDate(left.dueDateTime ?? left.dueDate ?? left.scheduledAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
        const rightTime = parseTaskDate(right.dueDateTime ?? right.dueDate ?? right.scheduledAt)?.getTime() ?? Number.MAX_SAFE_INTEGER
        if (leftTime !== rightTime) return leftTime - rightTime
        return left.title.localeCompare(right.title)
      })
      map.set(dayKey, items)
    })

    return map
  }, [monthlyRange, scheduledTasks])

  const selectedDayTasks = useMemo(
    () => eventsByDay.get(toDayKey(selectedDay)) ?? [],
    [eventsByDay, selectedDay],
  )

  useEffect(() => {
    setDraftDate(toDateInput(selectedDay))
  }, [selectedDay])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  useEffect(() => {
    if (!isComposerOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsComposerOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isComposerOpen])

  const openComposer = () => {
    setDraftDate(toDateInput(selectedDay))
    setIsComposerOpen(true)
  }

  const closeComposer = () => {
    setIsComposerOpen(false)
  }

  const handleAddTask = () => {
    const title = draftTitle.trim()
    if (!title) {
      setFeedback('Task title is required.')
      return
    }

    if (!draftDate) {
      setFeedback('Choose a date.')
      return
    }

    const anchor = fromDateInput(draftDate, draftTime || undefined)
    const dueDate = draftDate
    const dueDateTime = draftTime && anchor ? anchor.toISOString() : undefined

    const createdId = addTask(title, draftPriority, {
      description: draftDescription.trim() || undefined,
      status: 'scheduled',
      dueDate,
      dueDateTime,
      scheduledAt: dueDateTime ?? dueDate,
    })

    if (!createdId) {
      setFeedback('Could not create task.')
      return
    }

    setDraftTitle('')
    setDraftDescription('')
    setDraftTime('')
    setSelectedDay(startOfDay(anchor ?? new Date(draftDate)))
    setIsComposerOpen(false)
    setFeedback('Task added to calendar.')
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-2 pb-4">
      <GlassPanel className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Calendar Tasks</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-text-primary">Calendar-first task management</h1>
          <p className="mt-1 text-[13px] text-text-secondary">Pick a day, add tasks, and execute from the daily agenda.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={`${subtleButtonClass} h-9`} onClick={openComposer}>
            <Plus size={14} />
            <span className="ml-2">Add Task</span>
          </button>
          <span className="rounded-full border border-border-subtle bg-panel px-2.5 py-1 text-[11px] font-medium text-text-secondary">
            {scheduledTasks.length} scheduled
          </span>
          {feedback ? (
            <span className="rounded-full border border-border-subtle bg-panel px-2.5 py-1 text-[11px] font-medium text-text-secondary">
              {feedback}
            </span>
          ) : null}
        </div>
      </GlassPanel>

      <div className="overflow-x-auto">
        <div className="grid min-w-[980px] gap-4 grid-cols-[minmax(0,1fr)_360px]">
        <GlassPanel className="flex min-h-0 flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-accent" />
              <h2 className="text-[15px] font-semibold tracking-tight text-text-primary">Month View</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={subtleButtonClass}
                onClick={() => setCalendarAnchor(addDays(startOfMonth(calendarAnchor), -1))}
                aria-label="Previous month"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="min-w-[130px] text-center text-[13px] font-semibold text-text-primary">
                {format(calendarAnchor, 'MMMM yyyy')}
              </div>
              <button
                type="button"
                className={subtleButtonClass}
                onClick={() => setCalendarAnchor(addDays(endOfMonth(calendarAnchor), 1))}
                aria-label="Next month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div key={label} className="px-2 py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-7 gap-2">
            {monthlyRange.map((day) => {
              const dayTasks = eventsByDay.get(toDayKey(day)) ?? []
              const isSelected = isSameDay(day, selectedDay)
              const isCurrentMonth = day.getMonth() === calendarAnchor.getMonth()

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`flex min-h-[128px] flex-col rounded-2xl border p-2 text-left transition ${
                    isSelected
                      ? 'border-accent bg-window'
                      : isCurrentMonth
                        ? 'border-border-subtle bg-input hover:border-border-strong'
                        : 'border-border-subtle bg-window text-text-secondary'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-[12px] font-semibold ${isToday(day) ? 'text-accent' : 'text-text-secondary'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                        {dayTasks.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task) => (
                      <div key={task.id} className="truncate rounded-lg border border-border-subtle bg-window px-2 py-1 text-[11px] text-text-primary">
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 ? (
                      <div className="text-[11px] text-text-tertiary">+{dayTasks.length - 2} more</div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </GlassPanel>

        <GlassPanel className="flex min-h-0 flex-col gap-4 p-4">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-text-primary">To-do list</h2>
            <p className="mt-1 text-[12px] text-text-tertiary">Everything you need to do, sorted by closest due date.</p>
          </div>

          <div className="min-h-0 max-h-[42%] overflow-y-auto rounded-2xl border border-border-subtle bg-panel p-3">
            {todoTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-subtle bg-window px-3 py-4 text-[13px] text-text-tertiary">
                Nothing to do.
              </div>
            ) : (
              <div className="space-y-2">
                {todoTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      const date = parseTaskDate(task.dueDateTime ?? task.dueDate ?? task.scheduledAt)
                      if (date) {
                        setSelectedDay(startOfDay(date))
                        setCalendarAnchor(startOfMonth(date))
                      }
                    }}
                    className="w-full rounded-xl border border-border-subtle bg-window px-3 py-2 text-left transition hover:border-border-strong"
                  >
                    <p className="truncate text-[13px] font-semibold text-text-primary">{task.title}</p>
                    <p className="mt-0.5 text-[11px] text-text-tertiary">{taskTimeLabel(task)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-text-primary">{format(selectedDay, 'EEEE, MMMM d')}</h3>
            <p className="mt-1 text-[12px] text-text-tertiary">Agenda for the selected date.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Agenda</p>
              <span className="rounded-full border border-border-subtle bg-panel px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                {selectedDayTasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {selectedDayTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-subtle bg-window px-3 py-5 text-[13px] text-text-tertiary">
                  No tasks for this day.
                </div>
              ) : (
                selectedDayTasks.map((task) => {
                  const done = task.status === 'done'

                  return (
                    <div key={task.id} className="rounded-xl border border-border-subtle bg-window p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`truncate text-[13px] font-semibold ${done ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                            {task.title}
                          </p>
                          {task.description ? (
                            <p className="mt-1 line-clamp-2 text-[11px] text-text-secondary">{task.description}</p>
                          ) : null}
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityTone[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                          <Clock3 size={12} />
                          {taskTimeLabel(task)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className={`${subtleButtonClass} h-8 px-2.5 ${done ? '' : 'text-emerald-600'}`}
                            onClick={() => updateTaskStatus(task.id, done ? 'next' : 'done')}
                          >
                            <CheckCircle2 size={13} />
                          </button>
                          <button
                            type="button"
                            className={`${subtleButtonClass} h-8 px-2.5 text-red-500`}
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </GlassPanel>
        </div>
      </div>

      {isComposerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,18,14,0.48)] px-4" onClick={closeComposer}>
          <div
            className="w-full max-w-xl rounded-2xl border border-border-strong bg-window p-4 shadow-[0_28px_70px_-30px_rgba(22,18,14,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">New Task</p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-text-primary">Add task conditions</h2>
              </div>
              <button type="button" className={`${subtleButtonClass} h-8 px-2.5`} onClick={closeComposer}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Task title"
                className={`${inputClass} w-full`}
              />

              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="Description (optional)"
                rows={4}
                className={`${textareaClass} w-full resize-none`}
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                  className={inputClass}
                />
                <input
                  type="time"
                  value={draftTime}
                  onChange={(event) => setDraftTime(event.target.value)}
                  className={inputClass}
                />
                <select
                  value={draftPriority}
                  onChange={(event) => setDraftPriority(event.target.value as Priority)}
                  className={inputClass}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={`${subtleButtonClass} h-10`} onClick={closeComposer}>
                Cancel
              </button>
              <button type="button" className={`${subtleButtonClass} h-10`} onClick={handleAddTask}>
                <Plus size={14} />
                <span className="ml-2">Add Task</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
