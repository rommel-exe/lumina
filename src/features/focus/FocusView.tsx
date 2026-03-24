import { useEffect } from 'react'
import { isDueToday } from '../../lib/date'
import { useLuminaStore } from '../../state/store'
import { GlassPanel } from '../../components/ui/GlassPanel'

const TARGET_SECONDS = 25 * 60

export const FocusView = () => {
  const pomodoro = useLuminaStore((s) => s.data.pomodoro)
  const tasks = useLuminaStore((s) => s.data.tasks)
  const updatePomodoro = useLuminaStore((s) => s.updatePomodoro)

  useEffect(() => {
    if (pomodoro.state !== 'running') {
      return
    }

    const timer = setInterval(() => {
      const next = pomodoro.elapsedSeconds + 1
      if (next >= TARGET_SECONDS) {
        updatePomodoro(TARGET_SECONDS, 'complete')
        return
      }
      updatePomodoro(next, 'running')
    }, 1000)

    return () => clearInterval(timer)
  }, [pomodoro.elapsedSeconds, pomodoro.state, updatePomodoro])

  const mins = Math.floor((TARGET_SECONDS - pomodoro.elapsedSeconds) / 60)
  const secs = (TARGET_SECONDS - pomodoro.elapsedSeconds) % 60

  const today = tasks.filter(
    (task) => task.status === 'next' && (task.priority === 'High' || isDueToday(task.dueDate)),
  )

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 overflow-hidden">
      <GlassPanel className="text-center py-10">
        <p className="text-[11px] uppercase tracking-[0.24em] font-medium text-text-tertiary">Pomodoro</p>
        <p className="mt-4 font-mono text-7xl font-light text-text-primary tracking-tight">
          {String(Math.max(mins, 0)).padStart(2, '0')}:{String(Math.max(secs, 0)).padStart(2, '0')}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => updatePomodoro(pomodoro.elapsedSeconds, 'running')}
            className={`rounded-md px-5 py-1.5 text-sm font-medium transition-all ${(pomodoro.state === 'running') ? 'bg-accent text-white shadow-sm' : 'bg-input text-text-primary border border-border-strong hover:bg-window'}`}
          >
            Start
          </button>
          <button
            onClick={() => updatePomodoro(pomodoro.elapsedSeconds, 'paused')}
            className="rounded-md border border-border-strong bg-input px-5 py-1.5 text-sm font-medium text-text-primary hover:bg-window transition-all shadow-sm"
          >
            Pause
          </button>
          <button
            onClick={() => updatePomodoro(0, 'idle')}
            className="rounded-md border border-border-strong bg-input px-5 py-1.5 text-sm font-medium text-text-secondary hover:bg-window transition-all shadow-sm"
          >
            Reset
          </button>
        </div>
      </GlassPanel>

      <GlassPanel className="min-h-0 flex-1 overflow-y-auto p-6">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-text-tertiary">Today's Focus</p>
        <div className="space-y-2">
          {today.map((task) => (
            <div key={task.id} className="rounded-lg border border-border-subtle bg-window p-3 text-sm text-text-primary shadow-sm flex items-center gap-3">
              <div className="w-4 h-4 rounded-[5px] border border-text-tertiary flex-shrink-0" />
              {task.title}
            </div>
          ))}
          {today.length === 0 && (
            <p className="text-sm text-text-secondary italic">No high priority or due tasks today.</p>
          )}
        </div>
      </GlassPanel>
    </div>
  )
}
