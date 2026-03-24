import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './components/layout/Sidebar'
import { DashboardView } from './features/dashboard/DashboardView'
import { TasksView } from './features/tasks/TasksView'
import { NotesView } from './features/notes/NotesView'
import { WhiteboardView } from './features/whiteboard/WhiteboardView'
import { FocusView } from './features/focus/FocusView'
import { EmailView } from './features/email/EmailView'
import { SettingsModal } from './features/settings/SettingsModal'
import { useLuminaStore } from './state/store'

const transition = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
    transition: { duration: 0.15 },
}

const viewMap: Record<string, ReactNode> = {
  Dashboard: <DashboardView />,
  Tasks: <TasksView />,
  Notes: <NotesView />,
  Whiteboard: <WhiteboardView />,
  Focus: <FocusView />,
  Email: <EmailView />,
}

function App() {
  const activeView = useLuminaStore((s) => s.activeView)
  const hydrated = useLuminaStore((s) => s.hydrated)
  const hydrate = useLuminaStore((s) => s.hydrate)
  const setActiveView = useLuminaStore((s) => s.setActiveView)
  const settingsOpen = useLuminaStore((s) => s.settingsOpen)
  const setSettingsOpen = useLuminaStore((s) => s.setSettingsOpen)
  const theme = useLuminaStore((s) => s.data.settings.theme)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  if (!hydrated) {
    return (
      <div className="grid h-[100vh] w-[100vw] place-items-center bg-window text-sm text-text-secondary" data-tauri-drag-region>
        <span className="animate-pulse">Loading workspace...</span>
      </div>
    )
  }

  return (
    <div className="flex h-[100vh] w-[100vw] overflow-hidden bg-window font-sans text-text-primary select-none">
      
      <Sidebar
        activeView={activeView}
        onChange={setActiveView}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex flex-1 flex-col overflow-hidden relative bg-window">
        <header 
          data-tauri-drag-region
          className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-window/80 px-6 text-xs font-semibold tracking-wide text-text-secondary backdrop-blur-xl transition-all"
        >
          <span className="pointer-events-none">{activeView}</span>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-6 select-text">
          <AnimatePresence mode="wait">
            <motion.div key={activeView} {...transition} className="h-full min-h-0 overflow-hidden">
              {viewMap[activeView]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default App
