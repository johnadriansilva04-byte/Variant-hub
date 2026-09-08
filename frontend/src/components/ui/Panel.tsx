import { ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  collapsible?: boolean
  defaultOpen?: boolean
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
  collapsible = false,
  defaultOpen = true,
}: PanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const toneBorder: Record<string, string> = {
    store: 'border-store-500/20',
    calcada: 'border-fuchsia-500/20',
    overview: 'border-sky-500/20',
    system: 'border-dark-800',
  }

  const hasHeader = Boolean(title || subtitle || action)

  return (
    <div className={cn('card', toneBorder[tone], className)}>
      {hasHeader && (
        <div className={cn('flex items-start justify-between gap-4', !flush && 'p-5 pb-4', collapsible && 'pb-2')}>
          <div className="min-w-0 flex-1">
            {collapsible ? (
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 text-left group"
              >
                <div className="flex-1 min-w-0">
                  {title && <h3 className="text-sm font-semibold text-dark-50">{title}</h3>}
                  {subtitle && <p className="text-xs text-dark-500 mt-1">{subtitle}</p>}
                </div>
                <ChevronDown className={`w-4 h-4 text-dark-600 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
              </button>
            ) : (
              <>
                {title && <h3 className="text-sm font-semibold text-dark-50">{title}</h3>}
                {subtitle && <p className="text-xs text-dark-500 mt-1">{subtitle}</p>}
              </>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {(!collapsible || open) && (
        <div className={cn(!flush && 'p-5 pt-0', collapsible && 'border-t border-dark-800', bodyClassName)}>{children}</div>
      )}
    </div>
  )
}
