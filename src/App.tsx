import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Command, Search, Download, X } from 'lucide-react'
import { Sidebar } from './components/layout/Sidebar'
import { DashboardView } from './features/dashboard/DashboardView'
import { TasksView } from './features/tasks/TasksView'
import { NotesView } from './features/notes/NotesView'
import { WhiteboardView } from './features/whiteboard/WhiteboardView'
import { FocusView } from './features/focus/FocusView'
import { EmailView } from './features/email/EmailView'
import { SettingsModal } from './features/settings/SettingsModal'
import { useLuminaStore } from './state/store'
import { useAutoUpdate } from './hooks/useAutoUpdate'

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
  
  const { isAvailable, version, isUpdating, downloadAndInstall } = useAutoUpdate()
  const [dismissUpdate, setDismissUpdate] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toolbarDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    [],
  )

  if (!hydrated) {
    return (
      <div className="grid h-[100vh] w-[100vw] place-items-center bg-window text-sm text-text-secondary" data-tauri-drag-region>
        <span className="animate-pulse">Loading workspace...</span>
      </div>
    )
  }

  return (
    <div className="h-[100vh] w-[100vw] bg-window p-0.5 text-text-primary">
      <div className="lumina-window-chrome flex h-full w-full overflow-hidden rounded-[20px] font-sans select-none">
        <Sidebar
          activeView={activeView}
          onChange={setActiveView}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <header
            data-tauri-drag-region
            className="lumina-toolbar sticky top-0 z-50 flex h-10 shrink-0 items-center justify-between border-b border-border-subtle pl-[50px] pr-2"
          >
            <div className="pointer-events-none inline-flex items-center gap-2 rounded-full border border-border-subtle bg-panel px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-text-secondary">
              <span>{activeView}</span>
              <span className="text-text-tertiary">{toolbarDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-panel px-2.5 text-[11px] font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary"
              >
                <Search size={12} />
                Search
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-panel px-2.5 text-[11px] font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary"
              >
                <Command size={12} />
                K
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden px-1.5 pb-1.5 pt-1 select-text">
            <AnimatePresence mode="wait">
              <motion.div key={activeView} {...transition} className="h-full min-h-0 overflow-hidden">
                {viewMap[activeView]}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>

      {/* Update Notification */}
      <AnimatePresence>
        {isAvailable && !dismissUpdate && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-accent-border bg-accent-bg px-4 py-3 text-sm shadow-lg"
          >
            <Download size={16} className="shrink-0 text-accent" />
            <div className="flex-1">
              <p className="font-medium text-accent">
                Update available: v{version}
              </p>
              <p className="text-xs text-accent opacity-75">
                Restart to install the latest version
              </p>
            </div>
            <button
              onClick={() => downloadAndInstall()}
              disabled={isUpdating}
              className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
            >
              {isUpdating ? 'Installing...' : 'Update'}
            </button>
            <button
              onClick={() => setDismissUpdate(true)}
              className="shrink-0 rounded-lg p-1 hover:bg-accent/10"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
