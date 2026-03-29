import { useLuminaStore } from '../../state/store'
import { GlassPanel } from '../../components/ui/GlassPanel'
import { ArrowRight, CheckSquare, Clock3, NotebookPen, Sparkles } from 'lucide-react'
import { useMemo } from 'react'

export const DashboardView = () => {
  const tasks = useLuminaStore(s => s.data.tasks)
  const notes = useLuminaStore(s => s.data.notes)
  const setView = useLuminaStore(s => s.setActiveView)

  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done' && t.status !== 'archived'), [tasks])
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks])
  const highPriorityTasks = useMemo(() => pendingTasks.filter(t => t.priority === 'High'), [pendingTasks])
  const focusCandidate = useMemo(() => pendingTasks[0], [pendingTasks])
  const recentNotes = useMemo(() => 
    [...notes].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)
  , [notes])
  const upNext = useMemo(() => pendingTasks.slice(0, 5), [pendingTasks])
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    [],
  )

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto pr-1 pb-4">
      <GlassPanel className="relative overflow-hidden border-border-strong bg-gradient-to-br from-white/88 via-accent-soft/45 to-white/74 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(15,119,255,0.2),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.14),transparent_70%)]" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-window px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
              <Sparkles size={11} className="text-accent" />
              {todayLabel}
            </p>
            <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-text-primary">Today is a maker day.</h1>
            <p className="mt-2 max-w-2xl text-[13px] text-text-secondary">
              Keep momentum by moving one priority task forward, then clean up the backlog before lunch.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setView('Tasks')}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong bg-window px-3 text-[12px] font-semibold text-text-primary transition hover:bg-accent-soft"
          >
            Open Planner
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setView('Tasks')}
            className="rounded-xl border border-border-subtle bg-window/75 p-3 text-left transition hover:border-border-strong hover:bg-window"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Open Tasks</p>
            <p className="mt-1 text-[22px] font-semibold tracking-tight text-text-primary">{pendingTasks.length}</p>
            <p className="text-[11px] text-text-tertiary">Items in motion</p>
          </button>

          <button
            type="button"
            onClick={() => setView('Notes')}
            className="rounded-xl border border-border-subtle bg-window/75 p-3 text-left transition hover:border-border-strong hover:bg-window"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Recent Notes</p>
            <p className="mt-1 text-[22px] font-semibold tracking-tight text-text-primary">{notes.length}</p>
            <p className="text-[11px] text-text-tertiary">Knowledge blocks</p>
          </button>

          <button
            type="button"
            onClick={() => setView('Focus')}
            className="rounded-xl border border-border-subtle bg-window/75 p-3 text-left transition hover:border-border-strong hover:bg-window"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Completed</p>
            <p className="mt-1 text-[22px] font-semibold tracking-tight text-text-primary">{completedTasks.length}</p>
            <p className="text-[11px] text-text-tertiary">Closed loops</p>
          </button>

          <div className="rounded-xl border border-border-subtle bg-window/75 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">High Priority</p>
            <p className="mt-1 text-[22px] font-semibold tracking-tight text-text-primary">{highPriorityTasks.length}</p>
            <p className="text-[11px] text-text-tertiary">Needs deep work</p>
          </div>
        </div>
      </GlassPanel>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <GlassPanel className="flex min-h-0 flex-col border-border-subtle p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Up Next</h2>
            <button
              type="button"
              onClick={() => setView('Tasks')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
            >
              View all
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {focusCandidate ? (
              <div className="rounded-xl border border-accent/35 bg-accent-soft p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Focus Candidate</p>
                <p className="mt-1 text-[14px] font-semibold tracking-tight text-text-primary">{focusCandidate.title}</p>
              </div>
            ) : null}

            {upNext.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-subtle bg-window p-3 text-[12px] text-text-tertiary">
                No pending tasks. You are clear.
              </p>
            ) : (
              upNext.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setView('Tasks')}
                  className="flex w-full items-center justify-between rounded-xl border border-border-subtle bg-window p-3 text-left transition hover:border-border-strong"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <CheckSquare size={14} className="text-text-tertiary" />
                    <p className="truncate text-[12px] font-medium text-text-primary">{task.title}</p>
                  </div>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${
                    task.priority === 'High'
                      ? 'bg-red-50 text-red-500'
                      : task.priority === 'Medium'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-500'
                  }`}>
                    {task.priority}
                  </span>
                </button>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="flex min-h-0 flex-col border-border-subtle p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Recent Notes</h2>
            <button
              type="button"
              onClick={() => setView('Notes')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
            >
              Open notes
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {recentNotes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-subtle bg-window p-3 text-[12px] text-text-tertiary">
                No notes yet.
              </p>
            ) : (
              recentNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setView('Notes')}
                  className="w-full rounded-xl border border-border-subtle bg-window p-3 text-left transition hover:border-border-strong"
                >
                  <div className="mb-1 inline-flex items-center gap-1.5 text-text-tertiary">
                    <NotebookPen size={12} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Notebook</span>
                  </div>
                  <p className="truncate text-[13px] font-semibold text-text-primary">{note.title || 'Untitled'}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
                    {note.content.substring(0, 140) || 'Empty page...'}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="mt-3 rounded-xl border border-border-subtle bg-window p-3">
            <div className="mb-2 flex items-center gap-2 text-text-secondary">
              <Clock3 size={13} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Focus Snapshot</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border-subtle bg-panel p-2">
                <p className="text-[10px] text-text-tertiary">Tasks Open</p>
                <p className="mt-0.5 text-[16px] font-semibold text-text-primary">{pendingTasks.length}</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-panel p-2">
                <p className="text-[10px] text-text-tertiary">Priority Load</p>
                <p className="mt-0.5 text-[16px] font-semibold text-text-primary">{highPriorityTasks.length}</p>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400" style={{ width: `${Math.min(100, (highPriorityTasks.length * 18) + 20)}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-text-tertiary">Load meter based on current high-priority task count.</p>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
