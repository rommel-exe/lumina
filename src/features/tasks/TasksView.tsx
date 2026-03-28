import { useEffect, useMemo, useState } from 'react'
import {
  addHours,
  addMonths,
  addYears,
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, Trash2 } from 'lucide-react'
import { GlassPanel } from '../../components/ui/GlassPanel'
import type { Priority, Task } from '../../state/models'
import { useLuminaStore } from '../../state/store'
import { sortTasksByArrangement } from '../../state/taskOrdering'

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
type CalendarScope = 'day' | 'month' | 'year'
const HOUR_SLOTS = Array.from({ length: 24 }, (_, hour) => hour)

const toTimeValue = (hour: number) => `${String(hour).padStart(2, '0')}:00`
const toEndTimeValue = (hour: number) => (hour === 23 ? '23:59' : `${String(hour + 1).padStart(2, '0')}:00`)

const inputClass =
  'h-9 rounded-lg border border-border-subtle bg-input px-2.5 text-[12px] text-text-primary outline-none transition focus:border-border-strong focus:bg-window'
const textareaClass =
  'rounded-lg border border-border-subtle bg-input px-2.5 py-2 text-[12px] text-text-primary outline-none transition focus:border-border-strong focus:bg-window'
const subtleButtonClass =
  'inline-flex h-8 items-center justify-center rounded-lg border border-border-subtle bg-panel px-2.5 text-[11px] font-medium text-text-secondary transition hover:border-border-strong hover:bg-window hover:text-text-primary'

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

const parseTaskEndDate = (task: Task) => {
  const end = task.endDateTime
  if (!end) return null
  const parsed = new Date(end)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const taskInterval = (task: Task) => {
  const start = parseTaskDate(task.dueDateTime ?? task.dueDate ?? task.scheduledAt)
  if (!start) return null

  const candidateEnd = parseTaskEndDate(task)
  const end = candidateEnd && candidateEnd.getTime() > start.getTime() ? candidateEnd : addHours(start, 1)
  return { start, end }
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
  const end = parseTaskEndDate(task)
  if (end) return `${format(parsed, 'h:mm a')} - ${format(end, 'h:mm a')}`
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
  const [calendarScope, setCalendarScope] = useState<CalendarScope>('month')

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftPriority, setDraftPriority] = useState<Priority>('Medium')
  const [draftDate, setDraftDate] = useState(() => toDateInput(new Date()))
  const [draftTime, setDraftTime] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [selectedHourSlot, setSelectedHourSlot] = useState<number | null>(null)
  const [blockTitle, setBlockTitle] = useState('')
  const [blockStart, setBlockStart] = useState('09:00')
  const [blockEnd, setBlockEnd] = useState('10:00')
  const [isSlotPlannerOpen, setIsSlotPlannerOpen] = useState(false)
  const [slotMode, setSlotMode] = useState<'task' | 'block'>('task')
  const [slotTitle, setSlotTitle] = useState('')
  const [slotDescription, setSlotDescription] = useState('')
  const [slotPriority, setSlotPriority] = useState<Priority>('Medium')
  const [slotStart, setSlotStart] = useState('09:00')
  const [slotEnd, setSlotEnd] = useState('10:00')

  const topLevelTasks = useMemo(
    () => sortTasksByArrangement(tasks.filter((task) => !task.parentId)),
    [tasks],
  )

  const scheduledTasks = useMemo(
    () => topLevelTasks.filter((task) => Boolean(task.dueDate || task.dueDateTime || task.scheduledAt)),
    [topLevelTasks],
  )

  const todoTasks = useMemo(() => {
    const active = topLevelTasks.filter(
      (task) => task.kind !== 'block' && task.status !== 'done' && task.status !== 'archived',
    )
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

  const yearlyMonths = useMemo(
    () => eachMonthOfInterval({ start: startOfYear(calendarAnchor), end: endOfYear(calendarAnchor) }),
    [calendarAnchor],
  )

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Task[]>()

    scheduledTasks.forEach((task) => {
      const date = parseTaskDate(task.dueDateTime ?? task.dueDate ?? task.scheduledAt)
      if (!date) return

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
  }, [scheduledTasks])

  const monthTaskCounts = useMemo(() => {
    const map = new Map<string, number>()
    scheduledTasks.forEach((task) => {
      const date = parseTaskDate(task.dueDateTime ?? task.dueDate ?? task.scheduledAt)
      if (!date) return

      const key = format(date, 'yyyy-MM')
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return map
  }, [scheduledTasks])

  const selectedDayTasks = useMemo(
    () => eventsByDay.get(toDayKey(selectedDay)) ?? [],
    [eventsByDay, selectedDay],
  )

  const selectedDayBlocks = useMemo(
    () => selectedDayTasks.filter((task) => task.kind === 'block'),
    [selectedDayTasks],
  )

  const selectedDayWork = useMemo(
    () => selectedDayTasks.filter((task) => task.kind !== 'block'),
    [selectedDayTasks],
  )

  useEffect(() => {
    setDraftDate(toDateInput(selectedDay))
    setSelectedHourSlot(null)
  }, [selectedDay])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const scopeTitle = useMemo(() => {
    if (calendarScope === 'day') return format(selectedDay, 'EEEE, MMM d')
    if (calendarScope === 'year') return format(calendarAnchor, 'yyyy')
    return format(calendarAnchor, 'MMMM yyyy')
  }, [calendarScope, calendarAnchor, selectedDay])

  const selectedSlotLabel = useMemo(() => {
    if (selectedHourSlot === null) return null

    const start = new Date(selectedDay)
    start.setHours(selectedHourSlot, 0, 0, 0)
    const end = new Date(selectedDay)
    if (selectedHourSlot === 23) {
      end.setHours(23, 59, 0, 0)
    } else {
      end.setHours(selectedHourSlot + 1, 0, 0, 0)
    }

    return `${format(start, 'h a')} - ${format(end, selectedHourSlot === 23 ? 'h:mm a' : 'h a')}`
  }, [selectedDay, selectedHourSlot])

  const moveScope = (direction: -1 | 1) => {
    if (calendarScope === 'day') {
      const next = addDays(selectedDay, direction)
      setSelectedDay(next)
      setCalendarAnchor(startOfMonth(next))
      return
    }

    if (calendarScope === 'year') {
      setCalendarAnchor(addYears(calendarAnchor, direction))
      return
    }

    setCalendarAnchor(addMonths(calendarAnchor, direction))
  }

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

  useEffect(() => {
    if (!isSlotPlannerOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSlotPlannerOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSlotPlannerOpen])

  const openComposer = () => {
    setDraftDate(toDateInput(selectedDay))
    if (selectedHourSlot !== null) {
      setDraftTime(toTimeValue(selectedHourSlot))
    }
    setIsComposerOpen(true)
  }

  const closeComposer = () => {
    setIsComposerOpen(false)
  }

  const openHourSlotPlanner = (hour: number) => {
    setSelectedHourSlot(hour)

    const start = toTimeValue(hour)
    const end = toEndTimeValue(hour)
    setDraftDate(toDateInput(selectedDay))
    setDraftTime(start)
    setBlockStart(start)
    setBlockEnd(end)

    setSlotStart(start)
    setSlotEnd(end)
    setSlotMode('task')
    setSlotTitle('')
    setSlotDescription('')
    setSlotPriority('Medium')
    setIsSlotPlannerOpen(true)
  }

  const handleCreateFromSlotPlanner = () => {
    const title = slotTitle.trim()
    if (!title) {
      setFeedback('Title is required.')
      return
    }

    const dueDate = toDateInput(selectedDay)
    const start = fromDateInput(dueDate, slotStart)
    const end = fromDateInput(dueDate, slotEnd)
    if (!start) {
      setFeedback('Set a valid start time.')
      return
    }

    if (slotMode === 'block' && (!end || end.getTime() <= start.getTime())) {
      setFeedback('Block end time must be after start time.')
      return
    }

    const createdId = addTask(title, slotMode === 'block' ? 'Medium' : slotPriority, {
      description: slotDescription.trim() || (slotMode === 'block' ? 'Time block' : undefined),
      status: 'scheduled',
      kind: slotMode,
      dueDate,
      dueDateTime: start.toISOString(),
      endDateTime: slotMode === 'block' && end ? end.toISOString() : undefined,
      scheduledAt: start.toISOString(),
    })

    if (!createdId) {
      setFeedback('Could not create item.')
      return
    }

    setIsSlotPlannerOpen(false)
    setFeedback(slotMode === 'block' ? 'Time block added.' : 'Task added to selected block.')
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

    const resolvedTime = draftTime || (selectedHourSlot !== null ? toTimeValue(selectedHourSlot) : '')
    const anchor = fromDateInput(draftDate, resolvedTime || undefined)
    const dueDate = draftDate
    const dueDateTime = resolvedTime && anchor ? anchor.toISOString() : undefined

    const createdId = addTask(title, draftPriority, {
      description: draftDescription.trim() || undefined,
      status: 'scheduled',
      kind: 'task',
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

  const handleAddBlockForSelectedDay = () => {
    const start = fromDateInput(toDateInput(selectedDay), blockStart)
    const end = fromDateInput(toDateInput(selectedDay), blockEnd)

    if (!start || !end) {
      setFeedback('Set a valid start and end time.')
      return
    }

    if (end.getTime() <= start.getTime()) {
      setFeedback('End time must be after start time.')
      return
    }

    const dueDate = toDateInput(selectedDay)
    const title = blockTitle.trim() || 'Blocked time'

    const createdId = addTask(title, 'Medium', {
      status: 'scheduled',
      kind: 'block',
      dueDate,
      dueDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      scheduledAt: start.toISOString(),
      description: 'Time block',
    })

    if (!createdId) {
      setFeedback('Could not create time block.')
      return
    }

    setBlockTitle('')
    setFeedback('Time block added.')
  }

  const handleQuickAddForSelectedDay = () => {
    const title = quickAddTitle.trim()
    if (!title) {
      setFeedback('Task title is required.')
      return
    }

    const dueDate = toDateInput(selectedDay)
    const dueDateAnchor = selectedHourSlot !== null ? fromDateInput(dueDate, toTimeValue(selectedHourSlot)) : null
    const createdId = addTask(title, 'Medium', {
      status: 'scheduled',
      kind: 'task',
      dueDate,
      dueDateTime: dueDateAnchor ? dueDateAnchor.toISOString() : undefined,
      scheduledAt: dueDateAnchor ? dueDateAnchor.toISOString() : dueDate,
    })

    if (!createdId) {
      setFeedback('Could not create task.')
      return
    }

    setQuickAddTitle('')
    setFeedback('Task added to selected date.')
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto pr-1 pb-2">
      <GlassPanel className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Calendar Tasks</p>
          <h1 className="mt-0.5 text-[18px] font-semibold tracking-tight text-text-primary">Tasks</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center rounded-lg border border-border-subtle bg-panel p-0.5">
            {(['day', 'month', 'year'] as CalendarScope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                className={`rounded-md px-2 py-1 text-[11px] font-medium capitalize transition ${
                  calendarScope === scope ? 'bg-window text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setCalendarScope(scope)}
              >
                {scope}
              </button>
            ))}
          </div>

          <button type="button" className={subtleButtonClass} onClick={openComposer}>
            <Plus size={13} />
            <span className="ml-1.5">Add Task</span>
          </button>

          <span className="rounded-full border border-border-subtle bg-panel px-2 py-1 text-[10px] font-medium text-text-secondary">
            {scheduledTasks.length}
          </span>

          {feedback ? (
            <span className="rounded-full border border-border-subtle bg-panel px-2 py-1 text-[10px] font-medium text-text-secondary">
              {feedback}
            </span>
          ) : null}
        </div>
      </GlassPanel>

      <div className="overflow-x-auto">
        <div className="grid min-w-[700px] grid-cols-[minmax(0,1fr)_248px] gap-2">
          <GlassPanel className="flex min-h-0 flex-col gap-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CalendarDays size={14} className="text-accent" />
                <h2 className="text-[13px] font-semibold tracking-tight text-text-primary">{scopeTitle}</h2>
              </div>

              <div className="flex items-center gap-1">
                <button type="button" className={subtleButtonClass} onClick={() => moveScope(-1)} aria-label="Previous scope range">
                  <ChevronLeft size={13} />
                </button>
                <button type="button" className={subtleButtonClass} onClick={() => moveScope(1)} aria-label="Next scope range">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {calendarScope === 'month' ? (
              <>
                <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                    <div key={label} className="px-1.5 py-0.5">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-7 gap-1">
                  {monthlyRange.map((day) => {
                    const dayTasks = eventsByDay.get(toDayKey(day)) ?? []
                    const dayBlocks = dayTasks.filter((task) => task.kind === 'block')
                    const dayWork = dayTasks.filter((task) => task.kind !== 'block')
                    const isSelected = isSameDay(day, selectedDay)
                    const isCurrentMonth = day.getMonth() === calendarAnchor.getMonth()

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day)
                          setCalendarAnchor(startOfMonth(day))
                          setCalendarScope('day')
                        }}
                        onDoubleClick={() => {
                          setSelectedDay(day)
                          setCalendarAnchor(startOfMonth(day))
                          setCalendarScope('day')
                          setDraftDate(toDateInput(day))
                          setIsComposerOpen(true)
                        }}
                        className={`flex min-h-[86px] flex-col rounded-xl border p-1.5 text-left transition ${
                          isSelected
                            ? 'border-accent bg-window'
                            : isCurrentMonth
                              ? 'border-border-subtle bg-input hover:border-border-strong'
                              : 'border-border-subtle bg-window text-text-secondary'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className={`text-[11px] font-semibold ${isToday(day) ? 'text-accent' : 'text-text-secondary'}`}>
                            {format(day, 'd')}
                          </span>
                          {dayBlocks.length > 0 ? (
                            <span className="rounded-full border border-accent/35 bg-accent-soft px-1.5 py-0.5 text-[9px] font-medium text-accent">
                              B{dayBlocks.length}
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-1 overflow-hidden">
                          {dayBlocks.slice(0, 1).map((task) => (
                            <div key={task.id} className="truncate rounded-md border border-accent/35 bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent">
                              {taskTimeLabel(task)}
                            </div>
                          ))}
                          {dayWork.slice(0, 1).map((task) => (
                            <div key={task.id} className="truncate rounded-md border border-border-subtle bg-window px-1.5 py-0.5 text-[10px] text-text-primary">
                              {task.title}
                            </div>
                          ))}
                          {dayTasks.length > (dayBlocks.length > 0 && dayWork.length > 0 ? 2 : dayTasks.length > 0 ? 1 : 0) ? (
                            <div className="text-[10px] text-text-tertiary">
                              +
                              {dayTasks.length - (dayBlocks.length > 0 && dayWork.length > 0 ? 2 : dayTasks.length > 0 ? 1 : 0)}
                              {' '}more
                            </div>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : null}

            {calendarScope === 'day' ? (
              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border-subtle bg-panel p-2">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-text-primary">{format(selectedDay, 'EEEE, MMMM d')}</h3>
                  <span className="text-[10px] text-text-tertiary">{selectedDayWork.length} tasks • {selectedDayBlocks.length} blocks</span>
                </div>

                {selectedSlotLabel ? (
                  <p className="mb-2 text-[10px] font-medium text-accent">
                    Selected block: {selectedSlotLabel}
                  </p>
                ) : null}

                <div className="space-y-1">
                  {HOUR_SLOTS.map((hour) => {
                    const rowStart = new Date(selectedDay)
                    rowStart.setHours(hour, 0, 0, 0)
                    const rowEnd = addHours(rowStart, 1)

                    const rowBlocks = selectedDayBlocks.filter((task) => {
                      const interval = taskInterval(task)
                      if (!interval) return false
                      return interval.start < rowEnd && interval.end > rowStart
                    })

                    const rowWork = selectedDayWork.filter((task) => {
                      const interval = taskInterval(task)
                      if (!interval) return false
                      return interval.start < rowEnd && interval.end > rowStart
                    })

                    const isSelectedSlot = selectedHourSlot === hour

                    return (
                      <div key={`hour-${hour}`} className="grid grid-cols-[46px_minmax(0,1fr)] items-start gap-1">
                        <div className="pt-1 text-right text-[10px] font-medium text-text-tertiary">{format(rowStart, 'ha')}</div>
                        <button
                          type="button"
                          onClick={() => openHourSlotPlanner(hour)}
                          className={`min-h-[34px] rounded-md border p-1 text-left transition ${
                            isSelectedSlot
                              ? 'border-accent bg-accent-soft/60'
                              : 'border-border-subtle bg-window/65 hover:border-border-strong'
                          }`}
                          aria-label={`Select ${format(rowStart, 'h a')} time block`}
                        >
                          {rowBlocks.length === 0 && rowWork.length === 0 ? (
                            <div className="h-4" />
                          ) : (
                            <div className="space-y-1">
                              {rowBlocks.map((task) => (
                                <div
                                  key={task.id}
                                  className="truncate rounded-md border border-accent/35 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent"
                                >
                                  {task.title}
                                </div>
                              ))}
                              {rowWork.map((task) => (
                                <div
                                  key={task.id}
                                  className="truncate rounded-md border border-border-subtle bg-panel px-1.5 py-0.5 text-[10px] text-text-primary"
                                >
                                  {task.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {calendarScope === 'year' ? (
              <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5 overflow-y-auto pr-1">
                {yearlyMonths.map((month) => {
                  const monthKey = format(month, 'yyyy-MM')
                  const monthCount = monthTaskCounts.get(monthKey) ?? 0
                  const isActiveMonth =
                    month.getMonth() === calendarAnchor.getMonth() && month.getFullYear() === calendarAnchor.getFullYear()

                  return (
                    <button
                      key={monthKey}
                      type="button"
                      onClick={() => {
                        setCalendarScope('month')
                        setCalendarAnchor(month)
                        setSelectedDay(startOfMonth(month))
                      }}
                      className={`rounded-xl border px-2 py-2 text-left transition ${
                        isActiveMonth
                          ? 'border-accent bg-window'
                          : 'border-border-subtle bg-input hover:border-border-strong'
                      }`}
                    >
                      <p className="text-[11px] font-semibold text-text-primary">{format(month, 'MMM')}</p>
                      <p className="mt-0.5 text-[10px] text-text-tertiary">{monthCount} tasks</p>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </GlassPanel>

          <GlassPanel className="flex min-h-0 flex-col gap-2 p-3">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-text-primary">To-do list</h2>
              <p className="mt-0.5 text-[11px] text-text-tertiary">Closest due tasks first.</p>
            </div>

            <div className="min-h-0 max-h-[34%] overflow-y-auto rounded-xl border border-border-subtle bg-panel p-2">
              {todoTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border-subtle bg-window px-2 py-3 text-[11px] text-text-tertiary">
                  Nothing to do.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {todoTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        const date = parseTaskDate(task.dueDateTime ?? task.dueDate ?? task.scheduledAt)
                        if (date) {
                          setSelectedDay(startOfDay(date))
                          setCalendarAnchor(startOfMonth(date))
                          setCalendarScope('day')
                        }
                      }}
                      className="w-full rounded-lg border border-border-subtle bg-window px-2 py-1.5 text-left transition hover:border-border-strong"
                    >
                      <p className="truncate text-[12px] font-semibold text-text-primary">{task.title}</p>
                      <p className="mt-0.5 text-[10px] text-text-tertiary">{taskTimeLabel(task)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[13px] font-semibold tracking-tight text-text-primary">{format(selectedDay, 'EEE, MMM d')}</h3>
              <p className="mt-0.5 text-[11px] text-text-tertiary">Click any date, then click an hour block to schedule:</p>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_auto] gap-1.5">
              <input
                value={blockTitle}
                onChange={(event) => setBlockTitle(event.target.value)}
                placeholder="Block label"
                className={inputClass}
              />
              <input
                type="time"
                value={blockStart}
                onChange={(event) => setBlockStart(event.target.value)}
                className={inputClass}
              />
              <input
                type="time"
                value={blockEnd}
                onChange={(event) => setBlockEnd(event.target.value)}
                className={inputClass}
              />
              <button type="button" className={subtleButtonClass} onClick={handleAddBlockForSelectedDay}>
                Block
              </button>
            </div>

            <div className="flex gap-1.5">
              <input
                value={quickAddTitle}
                onChange={(event) => setQuickAddTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleQuickAddForSelectedDay()
                  }
                }}
                placeholder="Quick add task"
                className={`${inputClass} flex-1`}
              />
              <button type="button" className={subtleButtonClass} onClick={handleQuickAddForSelectedDay}>
                <Plus size={13} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Agenda</p>
                <span className="rounded-full border border-border-subtle bg-panel px-1.5 py-0.5 text-[9px] font-medium text-text-secondary">
                  {selectedDayWork.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedDayWork.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border-subtle bg-window px-2 py-3 text-[11px] text-text-tertiary">
                    No tasks for this day.
                  </div>
                ) : (
                  selectedDayWork.map((task) => {
                    const done = task.status === 'done'

                    return (
                      <div key={task.id} className="rounded-lg border border-border-subtle bg-window p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`truncate text-[12px] font-semibold ${done ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                              {task.title}
                            </p>
                            {task.description ? (
                              <p className="mt-0.5 line-clamp-1 text-[10px] text-text-secondary">{task.description}</p>
                            ) : null}
                          </div>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${priorityTone[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-1 text-[10px] text-text-tertiary">
                            <Clock3 size={11} />
                            {taskTimeLabel(task)}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className={`${subtleButtonClass} h-7 px-2 ${done ? '' : 'text-emerald-600'}`}
                              onClick={() => updateTaskStatus(task.id, done ? 'next' : 'done')}
                            >
                              <CheckCircle2 size={12} />
                            </button>
                            <button
                              type="button"
                              className={`${subtleButtonClass} h-7 px-2 text-red-500`}
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 size={12} />
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

      {isSlotPlannerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,18,14,0.48)] px-4" onClick={() => setIsSlotPlannerOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-border-strong bg-window p-4 shadow-[0_28px_70px_-30px_rgba(22,18,14,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Block Planner</p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-text-primary">Add conditions for this time block</h2>
              </div>
              <button
                type="button"
                className={`${subtleButtonClass} h-8 px-2.5`}
                onClick={() => setIsSlotPlannerOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 inline-flex items-center rounded-lg border border-border-subtle bg-panel p-0.5">
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  slotMode === 'task' ? 'bg-window text-text-primary' : 'text-text-secondary'
                }`}
                onClick={() => setSlotMode('task')}
              >
                Task
              </button>
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  slotMode === 'block' ? 'bg-window text-text-primary' : 'text-text-secondary'
                }`}
                onClick={() => setSlotMode('block')}
              >
                Time Block
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={slotTitle}
                onChange={(event) => setSlotTitle(event.target.value)}
                placeholder={slotMode === 'block' ? 'Block title' : 'Task title'}
                className={`${inputClass} w-full`}
              />

              <textarea
                value={slotDescription}
                onChange={(event) => setSlotDescription(event.target.value)}
                placeholder="Conditions / notes"
                rows={3}
                className={`${textareaClass} w-full resize-none`}
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={slotStart}
                  onChange={(event) => setSlotStart(event.target.value)}
                  className={inputClass}
                />
                <input
                  type="time"
                  value={slotEnd}
                  onChange={(event) => setSlotEnd(event.target.value)}
                  className={inputClass}
                />
              </div>

              {slotMode === 'task' ? (
                <select
                  value={slotPriority}
                  onChange={(event) => setSlotPriority(event.target.value as Priority)}
                  className={`${inputClass} w-full`}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={`${subtleButtonClass} h-9`} onClick={() => setIsSlotPlannerOpen(false)}>
                Cancel
              </button>
              <button type="button" className={`${subtleButtonClass} h-9`} onClick={handleCreateFromSlotPlanner}>
                <Plus size={13} />
                <span className="ml-1.5">Save</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
