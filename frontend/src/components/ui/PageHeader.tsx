import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type ZoneTone = 'store' | 'calcada' | 'overview' | 'system'

const toneChip: Record<ZoneTone, string> = {
  store: 'bg-store-500/10 text-store-400 border-store-500/30',
  calcada: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
  overview: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  system: 'bg-dark-700 text-dark-300 border-dark-600',
}

interface PageHeaderProps {
  zone?: ZoneTone
  zoneLabel?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  right?: ReactNode
  className?: string
}

export default function PageHeader({
  zone = 'system',
  zoneLabel,
  title,
  description,
  actions,
  right,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="min-w-0">
        {zoneLabel && (
          <div className={cn('zone-kicker mb-3 border', toneChip[zone])}>{zoneLabel}</div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-dark-50">{title}</h1>
        {description && <p className="text-sm text-dark-400 mt-1.5 max-w-2xl">{description}</p>}
        {actions && <div className="flex flex-wrap gap-2 mt-4">{actions}</div>}
      </div>
      {right && <div className="flex items-center gap-3 flex-shrink-0">{right}</div>}
    </div>
  )
}
