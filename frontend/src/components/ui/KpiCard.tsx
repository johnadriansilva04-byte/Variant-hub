import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

interface Delta {
  value: string
  up?: boolean
}

interface KpiCardProps {
  label: string
  value: string
  icon: ReactNode
  tone?: 'store' | 'calcada' | 'sky' | 'neutral' | 'violet' | 'pink' | 'cyan'
  delta?: Delta
  sub?: string
  to?: string
  className?: string
}

const toneBg: Record<string, string> = {
  store: 'bg-store-500/10 text-store-400',
  calcada: 'bg-fuchsia-500/10 text-fuchsia-400',
  sky: 'bg-sky-500/10 text-sky-400',
  neutral: 'bg-dark-800 text-dark-300',
  violet: 'bg-violet-500/10 text-violet-400',
  pink: 'bg-pink-500/10 text-pink-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
}

export default function KpiCard({
  label,
  value,
  icon,
  tone = 'neutral',
  delta,
  sub,
  to,
  className,
}: KpiCardProps) {
  const content = (
    <div className={cn('card p-4 hover:border-dark-700 transition-colors', to && 'cursor-pointer', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500">{label}</p>
          <p className="text-xl font-bold text-dark-50 mt-1">{value}</p>
          {(delta || sub) && (
            <p className={cn('text-[10px] mt-1', delta?.up ? 'text-store-400' : 'text-dark-500')}>
              {delta?.value || sub}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', toneBg[tone])}>
          {icon}
        </div>
      </div>
    </div>
  )

  if (to) {
    return <Link to={to}>{content}</Link>
  }

  return content
}
