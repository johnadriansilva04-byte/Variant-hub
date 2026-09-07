import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface StatusBadgeProps {
  tone?: 'green' | 'red' | 'yellow' | 'blue' | 'violet' | 'slate' | 'cyan' | 'pink' | 'sky'
  dot?: boolean
  children: ReactNode
  className?: string
}

const toneStyle: Record<string, string> = {
  green: 'bg-store-500/10 text-store-400 border-store-500/30',
  red: 'bg-red-500/10 text-red-400 border-red-500/30',
  yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  slate: 'bg-dark-700 text-dark-300 border-dark-600',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
}

export default function StatusBadge({ tone = 'green', dot = true, children, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', toneStyle[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
