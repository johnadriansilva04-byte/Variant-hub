import { Instagram, Facebook, Send as Telegram, Video as TikTok, MessageCircle as WhatsApp } from 'lucide-react'
import { cn } from '../../utils/cn'

type Channel = 'instagram' | 'facebook' | 'telegram' | 'tiktok' | 'whatsapp'

interface ChannelChipProps {
  channel: Channel
  size?: 'sm' | 'md'
  className?: string
}

const channelConfig: Record<Channel, { icon: any; color: string; bgColor: string }> = {
  instagram: { icon: Instagram, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  facebook: { icon: Facebook, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  telegram: { icon: Telegram, color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
  tiktok: { icon: TikTok, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  whatsapp: { icon: WhatsApp, color: 'text-store-400', bgColor: 'bg-store-500/10' },
}

const sizeConfig: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
}

export default function ChannelChip({ channel, size = 'md', className }: ChannelChipProps) {
  const { icon: Icon, color, bgColor } = channelConfig[channel]

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg', bgColor, color, className)}>
      <Icon className={sizeConfig[size]} />
      <span className="text-[11px] font-semibold capitalize">{channel}</span>
    </span>
  )
}
