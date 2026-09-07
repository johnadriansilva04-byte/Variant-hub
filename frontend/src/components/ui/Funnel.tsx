import { cn } from '../../utils/cn'

export interface FunnelStep {
  label: string
  value: number
  note: string
  zone?: 'calcada' | 'store'
}

interface FunnelStepsProps {
  data: FunnelStep[]
  tone?: 'calcada' | 'store'
  className?: string
}

const toneColor: Record<string, string> = {
  calcada: 'bg-fuchsia-500',
  store: 'bg-store-500',
}

const zoneColor: Record<string, string> = {
  calcada: 'text-fuchsia-400',
  store: 'text-store-400',
}

export function FunnelSteps({ data, tone = 'calcada', className }: FunnelStepsProps) {
  const maxValue = Math.max(...data.map(d => d.value))

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-2', className)}>
      {data.map((step, index) => {
        const width = maxValue > 0 ? (step.value / maxValue) * 100 : 0
        return (
          <div key={step.label} className="flex-shrink-0 min-w-[120px]">
            <div className="relative h-8 rounded-lg overflow-hidden bg-dark-800">
              <div
                className={cn('h-full transition-all duration-500', toneColor[tone])}
                style={{ width: `${width}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-dark-50">{step.value}</span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <p className="text-[11px] font-semibold text-dark-200">{step.label}</p>
              <p className="text-[10px] text-dark-500">{step.note}</p>
            </div>
            {index < data.length - 1 && (
              <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 text-dark-600">
                →
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function FunnelList({ data, tone = 'calcada' }: { data: FunnelStep[]; tone?: 'calcada' | 'store' }) {
  const maxValue = Math.max(...data.map(d => d.value))

  return (
    <div className="space-y-3">
      {data.map((step) => {
        const width = maxValue > 0 ? (step.value / maxValue) * 100 : 0
        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-semibold text-dark-200">{step.label}</span>
              <span className={cn('text-sm font-bold', zoneColor[tone])}>{step.value}</span>
            </div>
            <div className="h-2 rounded-full bg-dark-800 overflow-hidden">
              <div
                className={cn('h-full rounded-full', toneColor[tone])}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="text-[10px] text-dark-500 mt-1">{step.note}</p>
          </div>
        )
      })}
    </div>
  )
}
