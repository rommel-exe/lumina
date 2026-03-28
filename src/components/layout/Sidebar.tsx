import {
  LayoutDashboard,
  CheckSquare,
  NotebookPen,
  PencilRuler,
  Timer,
  Mail,
  Settings,
} from 'lucide-react'
import clsx from 'clsx'
import type { ViewKey } from '../../state/models'

const items: Array<{ key: ViewKey; label: string; icon: typeof CheckSquare }> = [
  { key: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'Tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'Notes', label: 'Notes', icon: NotebookPen },
  { key: 'Whiteboard', label: 'Whiteboard', icon: PencilRuler },
  { key: 'Focus', label: 'Focus', icon: Timer },
  { key: 'Email', label: 'Email', icon: Mail },
]

type SidebarProps = {
  activeView: ViewKey
  onChange: (view: ViewKey) => void
  onOpenSettings: () => void
}

export const Sidebar = ({ activeView, onChange, onOpenSettings }: SidebarProps) => (
  <aside
    data-tauri-drag-region
    className="lumina-sidebar z-50 flex h-full w-[154px] shrink-0 select-none flex-col justify-between border-r border-border-subtle px-1 pb-1.5 pt-3"
  >
    <div className="mt-1 space-y-0.5" data-tauri-drag-region>
      <div className="mb-2 px-2" data-tauri-drag-region>
        <p className="pointer-events-none text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Lumina</p>
      </div>

      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          title={label}
          aria-label={label}
          onClick={() => onChange(key)}
          className={clsx(
            'group flex h-7 w-full items-center justify-start rounded-md px-1.5 transition-colors',
            activeView === key
              ? 'bg-sidebar-active text-text-primary font-medium shadow-[inset_0_0_0_1px_rgba(15,119,255,0.14)]'
              : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary'
          )}
        >
          <Icon size={14} strokeWidth={activeView === key ? 2.5 : 2} className={activeView === key ? 'text-accent' : 'opacity-80'} />
          <span className="ml-1.5 text-[11px] tracking-tight">{label}</span>
        </button>
      ))}
    </div>

    <div className="px-0.5" data-tauri-drag-region>
      <button
        onClick={onOpenSettings}
        className="flex h-7 w-full items-center justify-start rounded-md px-1.5 text-text-secondary transition hover:bg-sidebar-hover hover:text-text-primary"
      >
        <Settings size={14} strokeWidth={2} className="opacity-80" />
        <span className="ml-1.5 text-[11px] tracking-tight">Settings</span>
      </button>
    </div>
  </aside>
)
