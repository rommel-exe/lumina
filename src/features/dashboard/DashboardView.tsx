import { useLuminaStore } from '../../state/store'
import { GlassPanel } from '../../components/ui/GlassPanel'
import { CheckSquare, Clock, NotebookPen, Target } from 'lucide-react'
import { useMemo } from 'react'

export const DashboardView = () => {
  const tasks = useLuminaStore(s => s.data.tasks)
  const notes = useLuminaStore(s => s.data.notes)
  const setView = useLuminaStore(s => s.setActiveView)

  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done' && t.status !== 'archived'), [tasks])
  const recentNotes = useMemo(() => 
    [...notes].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)
  , [notes])

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto pr-2 pb-6">
      
      <div>
        <h1 className="text-2xl font-semibold mb-1 tracking-tight text-text-primary">Good Morning</h1>
        <p className="text-text-secondary text-sm">Here's an overview of your workspace today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <GlassPanel className="flex flex-col gap-2 p-5 bg-gradient-to-br from-accent-soft to-transparent cursor-pointer hover:bg-window transition border-border-subtle" onClick={() => setView('Tasks')}>
          <div className="flex items-center gap-3 text-blue-500">
            <CheckSquare size={20} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Active Tasks</h2>
          </div>
          <p className="text-4xl font-light text-text-primary mt-2">{pendingTasks.length}</p>
          <p className="text-[11px] text-text-secondary font-medium">To-do items</p>
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-2 p-5 bg-gradient-to-br from-accent-soft to-transparent cursor-pointer hover:bg-window transition border-border-subtle" onClick={() => setView('Notes')}>
          <div className="flex items-center gap-3 text-purple-500">
            <NotebookPen size={20} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Total Notes</h2>
          </div>
          <p className="text-4xl font-light text-text-primary mt-2">{notes.length}</p>
          <p className="text-[11px] text-text-secondary font-medium">Across all notebooks</p>
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-2 p-5 bg-gradient-to-br from-accent-soft to-transparent cursor-pointer hover:bg-window transition border-border-subtle" onClick={() => setView('Focus')}>
          <div className="flex items-center gap-3 text-amber-500">
            <Clock size={20} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Focus Time</h2>
          </div>
          <p className="text-4xl font-light text-text-primary mt-2">0h</p>
          <p className="text-[11px] text-text-secondary font-medium">Recorded today</p>
        </GlassPanel>

        <GlassPanel className="flex flex-col gap-2 p-5 bg-gradient-to-br from-emerald-500/5 to-transparent border-border-subtle">
          <div className="flex items-center gap-3 text-emerald-500">
            <Target size={20} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Productivity</h2>
          </div>
          <p className="text-4xl font-light text-text-primary mt-2">85%</p>
          <p className="text-[11px] text-text-secondary font-medium">Weekly average</p>
        </GlassPanel>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
        <GlassPanel className="flex flex-col p-6 min-h-0 border-border-subtle bg-panel backdrop-blur-xl">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-4 inline-flex items-center">Recent Notes <span className="ml-2 w-full h-[1px] bg-border-subtle flex-1"></span></h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-text-tertiary italic">No notes yet.</p>
            ) : (
              recentNotes.map(n => (
                <div key={n.id} onClick={() => setView('Notes')} className="p-3 bg-panel hover:bg-window border border-border-subtle rounded-xl cursor-pointer transition select-none shadow-sm">
                  <p className="text-[13px] font-semibold text-text-primary tracking-tight">{n.title || 'Untitled'}</p>
                  <p className="text-[11px] text-text-secondary mt-1 line-clamp-2 leading-relaxed">{n.content.substring(0, 150) || 'Empty page...'}</p>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="flex flex-col p-6 min-h-0 border-border-subtle bg-panel backdrop-blur-xl">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-4 inline-flex items-center w-full">Up Next <span className="ml-2 w-full h-[1px] bg-border-subtle flex-1"></span></h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {pendingTasks.slice(0, 5).length === 0 ? (
              <p className="text-sm text-text-tertiary italic">All caught up!</p>
            ) : (
              pendingTasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3.5 bg-panel border border-border-subtle rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-[4px] border border-text-tertiary flex-shrink-0" />
                    <p className="text-[13px] font-medium text-text-primary tracking-tight">{t.title}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-[0.1em] font-bold shrink-0 
                    ${t.priority === 'High' ? 'bg-red-50 text-red-500' : 
                      t.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 
                      'bg-blue-50 text-blue-500'}`}>
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>

    </div>
  )
}
