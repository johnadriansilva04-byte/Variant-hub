import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface PanelProps {
  title?: ReactNode
  subtitle?: ReactNode
  tone?: 'store' | 'calcada' | 'overview' | 'system'
  children: ReactNode
  action?: ReactNode
  className?: string
  bodyClassName?: string
  flush?: boolean
}

export default function Panel({
  title,
  subtitle,
  tone = 'system',
  children,
  action,
  className,
  bodyClassName,
  flush = false,
}: PanelProps) {
  const toneBorder: Record<string, string> = {
    store: 'border-store-500/20',
    calcada: 'border-fuchsia-500/20',
    overview: 'border-sky-500/20',
    system: 'border-dark-800',
  }

  return (
    <div className={cn('card', toneBorder[tone], className)}>
      {(title || subtitle || action) && (
        <div className={cn('flex items-start justify-between gap-4', !flush && 'p-5 pb-4')}>
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-dark-50">{title}</h3>}
            {subtitle && <p className="text-xs text-dark-500 mt-1">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(!flush && 'p-5 pt-0', bodyClassName)}>{children}</div>
    </div>
  )
}
