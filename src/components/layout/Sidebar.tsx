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
    className="z-50 flex h-full w-[240px] shrink-0 select-none flex-col justify-between border-r border-border-subtle bg-sidebar backdrop-blur-3xl pt-8 pb-3"
  >
    <div className="space-y-0.5 px-3 mt-4" data-tauri-drag-region>
      <div className="mb-4 px-3" data-tauri-drag-region>
        <p className="pointer-events-none text-[11px] font-semibold tracking-wide text-text-tertiary">Lumina</p>
      </div>
      
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          title={label}
          aria-label={label}
          onClick={() => onChange(key)}
          className={clsx(
            'group flex h-8 w-full items-center justify-start rounded-lg px-2 transition-colors',
            activeView === key
              ? 'bg-sidebar-active text-text-primary font-medium'
              : 'text-text-secondary hover:bg-sidebar-hover hover:text-text-primary'
          )}
        >
          <Icon size={16} strokeWidth={activeView === key ? 2.5 : 2} className={activeView === key ? 'text-accent' : 'opacity-80'} />
          <span className="ml-2.5 text-[13px]">{label}</span>
        </button>
      ))}
    </div>

    <div className="px-3" data-tauri-drag-region>
      <button
        onClick={onOpenSettings}
        className="flex h-8 w-full items-center justify-start rounded-lg px-2 text-text-secondary transition hover:bg-sidebar-hover hover:text-text-primary"
      >
        <Settings size={16} strokeWidth={2} className="opacity-80" />
        <span className="ml-2.5 text-[13px]">Settings</span>
      </button>
    </div>
  </aside>
)
