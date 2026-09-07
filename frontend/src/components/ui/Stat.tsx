import { cn } from '../../utils/cn'

interface StatProps {
  label: string
  value: string
  tone?: 'store' | 'calcada' | 'sky' | 'neutral'
  sub?: string
  className?: string
}

const toneColor: Record<string, string> = {
  store: 'text-store-400',
  calcada: 'text-fuchsia-400',
  sky: 'text-sky-400',
  neutral: 'text-dark-100',
}

export default function Stat({ label, value, tone = 'neutral', sub, className }: StatProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">{label}</p>
      <p className={cn('text-lg font-bold', toneColor[tone])}>{value}</p>
      {sub && <p className="text-[10px] text-dark-500 mt-0.5">{sub}</p>}
    </div>
  )
}
