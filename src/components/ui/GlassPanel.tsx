import type { HTMLAttributes, PropsWithChildren } from 'react'
import clsx from 'clsx'

type GlassPanelProps = PropsWithChildren<{
  className?: string
} & HTMLAttributes<HTMLDivElement>>

export const GlassPanel = ({ className, children, ...rest }: GlassPanelProps) => (
  <section
    className={clsx(
      'rounded-xl border border-border-strong bg-panel p-4 shadow-sm',
      className,
    )}
    {...rest}
  >
    {children}
  </section>
)
