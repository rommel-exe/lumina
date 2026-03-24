import { useState } from 'react'
import { Download, Upload, X } from 'lucide-react'
import { useLuminaStore } from '../../state/store'
import { GlassPanel } from '../../components/ui/GlassPanel'

type SettingsModalProps = {
  open: boolean
  onClose: () => void
}

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const theme = useLuminaStore((s) => s.data.settings.theme)
  const setTheme = useLuminaStore((s) => s.setTheme)
  const exportData = useLuminaStore((s) => s.exportData)
  const importData = useLuminaStore((s) => s.importData)
  const [payload, setPayload] = useState('')

  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-window p-4 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-2xl border-border-subtle bg-panel">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100">Settings</p>
          <button onClick={onClose} className="rounded-md border border-border-subtle bg-input p-1">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-input p-3">
            <p className="text-sm text-zinc-200">Theme</p>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-md border border-border-subtle bg-input px-2 py-1 text-xs font-medium"
            >
              {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            </button>
          </div>

          <div className="rounded-xl border border-border-subtle bg-input p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-200">
              <Download size={14} /> Export data
            </div>
            <button
              onClick={() => {
                const blob = new Blob([exportData()], { type: 'application/json' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'lumina-backup.json'
                a.click()
                URL.revokeObjectURL(a.href)
              }}
              className="rounded-md border border-border-subtle bg-input px-2 py-1 text-xs font-medium"
            >
              Download backup
            </button>
          </div>

          <div className="rounded-xl border border-border-subtle bg-input p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-200">
              <Upload size={14} /> Import data
            </div>
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              placeholder="Paste exported JSON"
              className="h-32 w-full resize-none rounded-md border border-border-subtle bg-input p-2 text-xs"
            />
            <button
              onClick={() => {
                const result = importData(payload)
                alert(result.message)
              }}
              className="mt-2 rounded-md border border-border-subtle bg-input px-2 py-1 text-xs font-medium"
            >
              Import backup
            </button>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
