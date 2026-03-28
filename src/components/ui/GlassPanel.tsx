import type { HTMLAttributes, PropsWithChildren } from 'react'
import clsx from 'clsx'

type GlassPanelProps = PropsWithChildren<{
  className?: string
} & HTMLAttributes<HTMLDivElement>>

export const GlassPanel = ({ className, children, ...rest }: GlassPanelProps) => (
  <section
    className={clsx(
      'rounded-2xl border border-border-subtle bg-panel p-4 shadow-[0_1px_1px_rgba(15,23,42,0.04),0_20px_34px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl',
      className,
    )}
    {...rest}
  >
    {children}
  </section>
)
