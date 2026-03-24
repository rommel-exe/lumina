import { useLuminaStore } from '../../state/store'
import { GlassPanel } from '../../components/ui/GlassPanel'

export const WhiteboardView = () => {
  const board = useLuminaStore((s) => s.data.whiteboards[0])
  const addWhiteboardElement = useLuminaStore((s) => s.addWhiteboardElement)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <GlassPanel className="flex shrink-0 gap-2">
        <button
          onClick={() => addWhiteboardElement('sticky')}
          className="rounded-lg border border-border-subtle bg-input px-3 py-1 text-xs"
        >
          Sticky
        </button>
        <button
          onClick={() => addWhiteboardElement('rect')}
          className="rounded-lg border border-border-subtle bg-input px-3 py-1 text-xs"
        >
          Rectangle
        </button>
        <button
          onClick={() => addWhiteboardElement('circle')}
          className="rounded-lg border border-border-subtle bg-input px-3 py-1 text-xs"
        >
          Circle
        </button>
      </GlassPanel>

      <GlassPanel className="relative min-h-0 flex-1 overflow-auto bg-gradient-to-br from-zinc-950/40 to-slate-950/40">
        <div className="relative h-[1200px] w-[1600px] rounded-xl border border-dashed border-border-subtle">
          {board?.elements.map((element) => (
            <div
              key={element.id}
              className="absolute rounded-lg border border-border-subtle shadow-xl"
              style={{
                left: element.x,
                top: element.y,
                width: element.w,
                height: element.h,
                background: element.color ?? 'var(--bg-input, transparent)',
              }}
            >
              <p className="p-2 text-xs text-zinc-900">{element.text ?? element.kind}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  )
}
