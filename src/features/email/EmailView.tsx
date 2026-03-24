import { useState } from 'react'
import { fmtDate } from '../../lib/date'
import { useLuminaStore } from '../../state/store'
import { GlassPanel } from '../../components/ui/GlassPanel'

export const EmailView = () => {
  const emails = useLuminaStore((s) => s.data.emails)
  const tasks = useLuminaStore((s) => s.data.tasks)
  const linkEmailToTask = useLuminaStore((s) => s.linkEmailToTask)

  const [selectedId, setSelectedId] = useState(emails[0]?.id ?? '')
  const selected = emails.find((email) => email.id === selectedId)

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-hidden sm:gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <GlassPanel className="min-h-0 overflow-y-auto">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-text-tertiary">Inbox</p>
        <div className="space-y-1.5">
          {emails.map((email) => (
            <button
              key={email.id}
              onClick={() => setSelectedId(email.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                selectedId === email.id
                  ? 'border-accent bg-accent-soft shadow-sm'
                  : 'border-border-subtle bg-panel hover:bg-window'
              }`}
            >
              <p className="text-[13px] font-semibold text-text-primary mb-0.5">{email.subject}</p>
              <p className="text-[11px] text-text-secondary">{email.from}</p>
            </button>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="min-h-0 overflow-y-auto p-6">
        {selected ? (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border-subtle">
              <p className="text-xl font-medium text-text-primary mb-1">{selected.subject}</p>
              <p className="text-sm text-text-secondary">
                {selected.from} <span className="mx-2 opacity-50">•</span> {fmtDate(selected.receivedAt)}
              </p>
            </div>
            <p className="text-sm text-text-primary leading-relaxed">{selected.snippet}</p>

            <select
              onChange={(event) => {
                if (!event.target.value) return
                linkEmailToTask(selected.id, event.target.value)
                event.target.value = ''
              }}
              className="h-9 w-64 mt-4 rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer shadow-sm transition-all"
            >
              <option value="">Link to task...</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No email selected.</p>
        )}
      </GlassPanel>
    </div>
  )
}
